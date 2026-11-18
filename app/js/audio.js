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
      this.onPitchUpdate = options.onPitchUpdate || function () {};

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
      this._pitchTick = 0;
      this._referenceOsc = null;
      this._referenceGain = null;
      this._referenceNodes = [];
      this._sequenceNodes = [];
      this._pluckCache = new Map();
      this._master = null;
      this._compressor = null;

      this.matcher = new global.ChordTrainer.ChordMatcher(
        global.ChordTrainer.CHORD_ORDER,
        global.ChordTrainer.CHORDS
      );
      this.chordOrder = global.ChordTrainer.CHORD_ORDER.slice();

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
      this.stopToneSequence();
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.running = false;
      this._pitchTick = 0;

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
      this._master = null;
      this._compressor = null;
      this._pluckCache.clear();
    }

    resetDetection() {
      this.matcher.reset();
    }

    setChordOrder(order) {
      const chords = global.ChordTrainer.CHORDS;
      const valid = Array.isArray(order) && order.length > 0
        ? order.filter((id) => Boolean(chords[id]))
        : global.ChordTrainer.CHORD_ORDER;
      this.chordOrder = valid.slice();
      this.matcher = new global.ChordTrainer.ChordMatcher(this.chordOrder, chords);
    }

    setMode(mode) {
      this.mode = (mode === 'tuner' || mode === 'scale') ? mode : 'chords';
      this._pitchTick = 0;
      if (this.mode === 'chords') this.matcher.reset();
    }

    /** Verstärker-Bus mit sanfter Kompression, damit Akkorde nicht clippen. */
    _getOutput(ctx) {
      if (!this._master) {
        this._master = ctx.createGain();
        this._master.gain.value = 0.9;
        this._compressor = ctx.createDynamicsCompressor();
        this._compressor.threshold.value = -18;
        this._compressor.knee.value = 24;
        this._compressor.ratio.value = 6;
        this._compressor.attack.value = 0.003;
        this._compressor.release.value = 0.25;
        this._master.connect(this._compressor);
        this._compressor.connect(ctx.destination);
      }
      return this._master;
    }

    /** Erzeugt (und cached) den E-Gitarren-Buffer für eine Frequenz. */
    _pluckBuffer(frequency) {
      const sampleRate = this.ctx.sampleRate;
      const key = `${Math.round(frequency * 100)}@${sampleRate}`;
      let buffer = this._pluckCache.get(key);
      if (buffer) return buffer;

      const render = global.ChordTrainer.renderPluckedString;
      if (typeof render !== 'function') return null;

      // renderPluckedString liefert rohe Float32-Samples. Eine
      // AudioBufferSourceNode akzeptiert aber nur ein echtes AudioBuffer-
      // Objekt; die direkte Zuweisung eines Float32Array wirft im Browser
      // einen TypeError.
      const samples = render(frequency, sampleRate, { duration: 2.2 });
      buffer = this.ctx.createBuffer(1, samples.length, sampleRate);
      if (typeof buffer.copyToChannel === 'function') {
        buffer.copyToChannel(samples, 0);
      } else {
        buffer.getChannelData(0).set(samples);
      }

      this._pluckCache.set(key, buffer);
      if (this._pluckCache.size > 64) {
        const oldest = this._pluckCache.keys().next().value;
        this._pluckCache.delete(oldest);
      }
      return buffer;
    }

    /**
     * Plant einen gezupften Gitarrenton ein. Der Buffer klingt natürlich aus;
     * die Gain-Hüllkurve begrenzt nur die Spielzeit.
     */
    _schedulePluck(frequency, when, duration, gainValue, bucket) {
      const ctx = this.ctx;
      if (!ctx) return null;
      const buffer = this._pluckBuffer(frequency);
      if (!buffer || !buffer.length) return null;

      const length = Math.max(0.05, Math.min(Number(duration) || 0.5, buffer.duration));
      const peak = Math.max(0.01, Math.min(0.9, Number(gainValue) || 0.45));
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(peak, when + 0.005);
      gain.gain.setValueAtTime(peak, when + Math.max(0.02, length - 0.06));
      gain.gain.exponentialRampToValueAtTime(0.0001, when + length);

      source.connect(gain);
      gain.connect(this._getOutput(ctx));
      source.start(when);
      source.stop(when + length + 0.01);

      const node = { source, gain };
      bucket.push(node);
      source.addEventListener('ended', () => {
        try {
          source.disconnect();
          gain.disconnect();
        } catch (error) { /* bereits getrennt */ }
        const index = bucket.indexOf(node);
        if (index >= 0) bucket.splice(index, 1);
      });
      return node;
    }

    _stopNodes(bucket) {
      bucket.splice(0).forEach(({ source, gain }) => {
        try {
          source.stop();
          source.disconnect();
        } catch (error) { /* bereits beendet */ }
        try { gain.disconnect(); } catch (error) { /* bereits getrennt */ }
      });
    }

    /**
     * Referenzton für den Stimm-Modus: mehrere gezupfte Gitarrentöne
     * hintereinander, damit die Saite hörbar schwingt und nachklingt.
     */
    async playReferenceTone(frequency, duration) {
      if (!Number.isFinite(frequency) || frequency <= 0) return;
      const ctx = await this.ensureContext();
      const length = Number.isFinite(duration) ? duration : 1.4;

      this.stopReferenceTone();
      const start = ctx.currentTime + 0.03;
      const step = 0.5;
      for (let offset = 0; offset < length; offset += step) {
        const remaining = length - offset;
        this._schedulePluck(
          frequency,
          start + offset,
          Math.min(0.85, remaining),
          0.5,
          this._referenceNodes
        );
      }
    }

    stopReferenceTone() {
      this._stopNodes(this._referenceNodes);
      this._referenceOsc = null;
      this._referenceGain = null;
    }

    /**
     * Spielt eine Folge von Frequenzen als gezupfte Gitarrentöne (z. B. die
     * Pentatonik zum Anhören). Gibt die geschätzte Dauer in Sekunden zurück.
     */
    async playToneSequence(frequencies, options) {
      if (!Array.isArray(frequencies) || !frequencies.length) return 0;
      const valid = frequencies.filter((frequency) => Number.isFinite(frequency) && frequency > 0);
      if (!valid.length) return 0;

      const ctx = await this.ensureContext();
      const opts = options && typeof options === 'object' ? options : {};
      const noteSec = Math.max(0.08, Number(opts.noteSec) || 0.3);
      const gapSec = Math.max(0, Number(opts.gapSec) || 0.05);
      const peak = Math.max(0.05, Math.min(0.8, Number(opts.peak) || 0.5));

      this.stopReferenceTone();
      this.stopToneSequence();
      const start = ctx.currentTime + 0.06;

      valid.forEach((frequency, index) => {
        const noteStart = start + index * (noteSec + gapSec);
        // Länger ausklingen lassen als die notierte Dauer – das klingt nach
        // Gitarre statt nach piependen Einzeltönen.
        const ring = Math.min(noteSec * 1.45 + 0.12, 2.4);
        this._schedulePluck(frequency, noteStart, ring, peak, this._sequenceNodes);
      });

      return start + valid.length * (noteSec + gapSec) - ctx.currentTime;
    }

    /**
     * Schlägt einen Akkord von der tiefen zur hohen Saite an (Strum).
     */
    async playChord(frequencies, options) {
      if (!Array.isArray(frequencies) || !frequencies.length) return 0;
      const valid = frequencies.filter((frequency) => Number.isFinite(frequency) && frequency > 0);
      if (!valid.length) return 0;

      const ctx = await this.ensureContext();
      const opts = options && typeof options === 'object' ? options : {};
      const strumSec = Math.max(0, Math.min(0.08, Number(opts.strumSec) || 0.035));
      const duration = Math.max(0.4, Math.min(3.2, Number(opts.duration) || 2.2));
      const peak = Math.max(0.05, Math.min(0.6, Number(opts.peak) || 0.4 / Math.sqrt(valid.length)));

      this.stopReferenceTone();
      this.stopToneSequence();
      const start = ctx.currentTime + 0.05;

      valid.forEach((frequency, index) => {
        this._schedulePluck(
          frequency,
          start + index * strumSec,
          Math.max(0.3, duration - index * strumSec * 0.3),
          peak,
          this._sequenceNodes
        );
      });

      return start + valid.length * strumSec + duration - ctx.currentTime;
    }

    stopToneSequence() {
      this._stopNodes(this._sequenceNodes);
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

      if (this.mode === 'tuner' || this.mode === 'scale') {
        // Stimmgerät: 10 Updates/s reichen für einen ruhigen Zeiger.
        // Übungsmodus: 20 Updates/s, damit Anschläge sicher erkannt werden.
        const every = this.mode === 'scale' ? 1 : 2;
        this._pitchTick = (this._pitchTick + 1) % every;
        if (this._pitchTick !== 0) return;
        const pitch = silent
          ? null
          : global.ChordTrainer.detectPitch(this.timeData, this.ctx.sampleRate);
        this.onPitchUpdate({
          levelDb: Math.max(-100, levelDb),
          silent,
          pitch,
          mode: this.mode
        });
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
