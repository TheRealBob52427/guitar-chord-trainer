/**
 * Lookahead-Metronom (4/4) über Web Audio.
 * Planung im Audio-Zeitraster, Visualisierung per setTimeout.
 */
(function (global) {
  'use strict';

  const MIN_BPM = 40;
  const MAX_BPM = 180;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;

  class Metronome {
    constructor(options) {
      this.getContext = options.getContext;
      this.onBeat = options.onBeat || function () {};
      this.onStateChange = options.onStateChange || function () {};

      this.bpm = options.bpm || 50;
      this.beatsPerBar = 4;
      this.playing = false;
      this.beat = 0;
      this.nextNoteTime = 0;
      this.timer = null;
      this.pending = new Set();
      this._schedule = this._schedule.bind(this);
    }

    setBpm(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return this.bpm;
      this.bpm = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(numeric)));
      return this.bpm;
    }

    async start() {
      if (this.playing) return;
      const ctx = this.getContext();
      if (!ctx) throw new Error('AudioContext ist noch nicht bereit.');
      if (ctx.state === 'suspended') await ctx.resume();

      this.playing = true;
      this.beat = 0;
      this.nextNoteTime = ctx.currentTime + 0.08;
      this.timer = setInterval(this._schedule, LOOKAHEAD_MS);
      this._schedule();
      this.onStateChange(true);
    }

    stop() {
      if (!this.playing) return;
      this.playing = false;
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.pending.forEach((timeoutId) => clearTimeout(timeoutId));
      this.pending.clear();
      this.beat = 0;
      this.onStateChange(false);
    }

    _schedule() {
      if (!this.playing) return;
      const ctx = this.getContext();
      if (!ctx) return;

      while (this.nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
        const beat = this.beat;
        const time = this.nextNoteTime;
        this._click(beat, time);

        const delay = Math.max(0, (time - ctx.currentTime) * 1000);
        const timeoutId = setTimeout(() => {
          this.pending.delete(timeoutId);
          if (this.playing) this.onBeat(beat);
        }, delay);
        this.pending.add(timeoutId);

        this.beat = (this.beat + 1) % this.beatsPerBar;
        this.nextNoteTime += 60 / this.bpm;
      }
    }

    _click(beat, time) {
      const ctx = this.getContext();
      const accent = beat === 0;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(accent ? 1600 : 1000, time);

      const peak = accent ? 0.5 : 0.3;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(peak, time + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.07);

      oscillator.addEventListener('ended', () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch (e) { /* bereits getrennt */ }
      });
    }
  }

  Metronome.MIN_BPM = MIN_BPM;
  Metronome.MAX_BPM = MAX_BPM;

  global.ChordTrainer = global.ChordTrainer || {};
  global.ChordTrainer.Metronome = Metronome;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Metronome, MIN_BPM, MAX_BPM };
  }
})(typeof window !== 'undefined' ? window : globalThis);
