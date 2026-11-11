/**
 * Mikrofon-/USB-Eingang, Analyse-Loop und Übergabe an den ChordMatcher.
 */
(function (global) {
  'use strict';

  const SILENCE_DB = -55;
  const TICK_MS = 50;

  class AudioEngine {
    constructor(options) {
      this.onUpdate = options.onUpdate || function () {};
      this.onAttempt = options.onAttempt || function () {};
      this.onError = options.onError || function () {};
      this.onTrackEnded = options.onTrackEnded || function () {};
      this.onTunerUpdate = options.onTunerUpdate || function () {};

      this.ctx = null;
      this.stream = null;
      this.source = null;
      this.analyser = null;
      this.sink = null;
      this.freqData = null;
      this.timeData = null;
      this.timer = null;
      this.running = false;
      this.deviceId = '';
      this.mode = 'chords';
      this._tunerTick = 0;
      this._referenceOsc = null;
      this._referenceGain = null;

      this.matcher = new global.ChordTrainer.ChordMatcher(
        global.ChordTrainer.CHORD_ORDER,
        global.ChordTrainer.CHORDS
      );

      this._tick = this._tick.bind(this);
    }

    /** Legt den AudioContext einmalig an und gibt ihn danach immer wieder zurück. */
    getContext() {
      if (!this.ctx) {
        const Ctx = global.AudioContext || global.webkitAudioContext;
        if (!Ctx) throw new Error('Web Audio API wird von diesem Browser nicht unterstützt.');
        this.ctx = new Ctx();
      }
      return this.ctx;
    }

    async ensureContext() {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') await ctx.resume();
      return ctx;
    }

    async listDevices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label,
          groupId: device.groupId
        }));
    }

    /**
     * Startet (oder wechselt) den Eingang. Ein laufender Stream wird gestoppt,
     * der AudioContext bleibt bestehen.
     */
    async start(deviceId) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia ist nicht verfügbar. Bitte HTTPS oder localhost verwenden.');
      }

      await this.stopStream();
      const ctx = await this.ensureContext();

      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1
        },
        video: false
      };
      if (deviceId) constraints.audio.deviceId = { exact: deviceId };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        // Ein nicht mehr vorhandenes Gerät (z. B. USB abgezogen) soll die
        // Auswahl nicht dauerhaft blockieren.
        if (deviceId && error && (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')) {
          delete constraints.audio.deviceId;
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          throw error;
        }
      }

      const track = stream.getAudioTracks()[0];
      if (!track) {
        stream.getTracks().forEach((t) => t.stop());
        throw new Error('Der Eingang liefert keinen Audio-Track.');
      }

      this.stream = stream;
      const settings = track.getSettings ? track.getSettings() : {};
      const settingsId = settings.deviceId;
      this.deviceId = settingsId && settingsId !== 'default' && settingsId !== 'communications'
        ? settingsId
        : (deviceId || '');

      track.addEventListener('ended', () => {
        this.stopStream();
        this.onTrackEnded(track.label);
      });

      this.source = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 8192;
      this.analyser.smoothingTimeConstant = 0.4;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -10;

      // AnalyserNode muss Teil eines aktiven Graphen sein, damit der Browser
      // ihn zuverlässig verarbeitet. Der GainNode auf 0 verhindert Feedback.
      this.sink = ctx.createGain();
      this.sink.gain.value = 0;
      this.source.connect(this.analyser);
      this.analyser.connect(this.sink);
      this.sink.connect(ctx.destination);

      this.freqData = new Float32Array(this.analyser.frequencyBinCount);
      this.timeData = new Float32Array(this.analyser.fftSize);
      this.matcher.reset();
      this.running = true;
      this.timer = setInterval(this._tick, TICK_MS);

      return {
        deviceId: this.deviceId,
        label: track.label,
        sampleRate: ctx.sampleRate
      };
    }

    stopStream() {
      this.stopReferenceTone();
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.running = false;
      this._tunerTick = 0;

      if (this.source) {
        try { this.source.disconnect(); } catch (e) { /* bereits getrennt */ }
        this.source = null;
      }
      if (this.analyser) {
        try { this.analyser.disconnect(); } catch (e) { /* bereits getrennt */ }
        this.analyser = null;
      }
      if (this.sink) {
        try { this.sink.disconnect(); } catch (e) { /* bereits getrennt */ }
        this.sink = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      this.freqData = null;
      this.timeData = null;
      this.matcher.reset();
    }

    destroy() {
      this.stopStream();
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close().catch(() => {});
      }
      this.ctx = null;
    }

    resetDetection() {
      this.matcher.reset();
    }

    setMode(mode) {
      this.mode = mode === 'tuner' ? 'tuner' : 'chords';
      this._tunerTick = 0;
      if (this.mode === 'chords') this.matcher.reset();
    }

    /** Kurzer Referenzton für den Stimm-Modus (ohne Mikrofon-Feedback). */
    async playReferenceTone(frequency, duration) {
      if (!Number.isFinite(frequency) || frequency <= 0) return;
      const ctx = await this.ensureContext();
      const length = Number.isFinite(duration) ? duration : 1.4;

      this.stopReferenceTone();

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const peak = 0.14;

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.03);
      gain.gain.setValueAtTime(peak, now + Math.max(0.05, length - 0.18));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + length + 0.02);

      this._referenceOsc = oscillator;
      this._referenceGain = gain;

      oscillator.addEventListener('ended', () => {
        try {
          oscillator.disconnect();
          gain.disconnect();
        } catch (error) { /* bereits getrennt */ }
        if (this._referenceOsc === oscillator) {
          this._referenceOsc = null;
          this._referenceGain = null;
        }
      });
    }

    stopReferenceTone() {
      if (!this._referenceOsc) return;
      try {
        this._referenceOsc.stop();
        this._referenceOsc.disconnect();
      } catch (error) { /* bereits beendet */ }
      if (this._referenceGain) {
        try { this._referenceGain.disconnect(); } catch (error) { /* bereits getrennt */ }
      }
      this._referenceOsc = null;
      this._referenceGain = null;
    }

    _tick() {
      if (!this.running || !this.analyser) return;

      this.analyser.getFloatFrequencyData(this.freqData);
      this.analyser.getFloatTimeDomainData(this.timeData);

      let sum = 0;
      for (let i = 0; i < this.timeData.length; i += 1) {
        sum += this.timeData[i] * this.timeData[i];
      }
      const rms = Math.sqrt(sum / this.timeData.length);
      const levelDb = 20 * Math.log10(Math.max(rms, 1e-8));
      const silent = levelDb < SILENCE_DB;

      if (this.mode === 'tuner') {
        // YIN ist rechenintensiver als das Chromagramm; 10 Updates/s reichen
        // für einen ruhigen Zeiger.
        this._tunerTick = (this._tunerTick + 1) % 2;
        if (this._tunerTick !== 0) return;
        const pitch = silent
          ? null
          : global.ChordTrainer.detectPitch(this.timeData, this.ctx.sampleRate);
        this.onTunerUpdate({ levelDb: Math.max(-100, levelDb), silent, pitch });
        return;
      }

      const chroma = silent ? null : global.ChordTrainer.computeChroma(
        this.freqData,
        this.ctx.sampleRate,
        this.analyser.fftSize
      );

      const result = this.matcher.update(chroma, silent);

      this.onUpdate({
        levelDb: Math.max(-100, levelDb),
        silent,
        bestId: result.bestId,
        bestScore: result.bestScore,
        scores: result.scores
      });

      if (result.attempt && result.bestId) {
        this.onAttempt({
          id: result.bestId,
          score: result.bestScore,
          scores: result.scores
        });
      }
    }
  }

  global.ChordTrainer = global.ChordTrainer || {};
  global.ChordTrainer.AudioEngine = AudioEngine;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AudioEngine, SILENCE_DB, TICK_MS };
  }
})(typeof window !== 'undefined' ? window : globalThis);
