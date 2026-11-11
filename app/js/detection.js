/**
 * DSP-Kern: FFT-dB-Spektrum -> Chromagramm -> Cosine-Similarity -> Hysterese.
 *
 * Reine Funktionen/Klassen ohne Web-Audio-Abhängigkeit, damit sie in Node
 * testbar sind. audio.js füttert das Spektrum des AnalyserNode ein.
 */
(function (global) {
  'use strict';

  const DEFAULTS = Object.freeze({
    minHz: 70,
    maxHz: 600,
    dbThreshold: -82,
    smoothingFrames: 8,
    matchThreshold: 0.82,
    rearmThreshold: 0.5
  });

  /**
   * Wandelt ein FFT-Spektrum (dBFS, wie AnalyserNode.getFloatFrequencyData)
   * in einen normalisierten 12-dimensionalen Chroma-Vektor.
   *
   * Nur Bins zwischen minHz und maxHz und oberhalb des dB-Schwellwerts
   * tragen bei. Jeder Bin wird über seine MIDI-Note der nächsten
   * Pitch-Class zugeordnet.
   */
  function computeChroma(freqDb, sampleRate, fftSize, options) {
    const cfg = Object.assign({}, DEFAULTS, options);
    const chroma = new Float32Array(12);
    if (!freqDb || !freqDb.length || !sampleRate || !fftSize) return chroma;

    const binHz = sampleRate / fftSize;
    const startBin = Math.max(1, Math.ceil(cfg.minHz / binHz));
    const endBin = Math.min(freqDb.length - 1, Math.floor(cfg.maxHz / binHz));

    for (let bin = startBin; bin <= endBin; bin += 1) {
      const db = freqDb[bin];
      if (!Number.isFinite(db) || db < cfg.dbThreshold) continue;

      const frequency = bin * binHz;
      const magnitude = Math.pow(10, db / 20);
      const midi = 69 + 12 * Math.log2(frequency / 440);
      let pitchClass = Math.round(midi) % 12;
      if (pitchClass < 0) pitchClass += 12;
      chroma[pitchClass] += magnitude;
    }

    normalize(chroma);
    return chroma;
  }

  function normalize(vector) {
    let sum = 0;
    for (let i = 0; i < vector.length; i += 1) sum += vector[i] * vector[i];
    const norm = Math.sqrt(sum);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
    }
    return vector;
  }

  function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / Math.sqrt(normA * normB);
  }

  function averageFrames(frames) {
    const avg = new Float32Array(12);
    if (!frames.length) return avg;
    for (let f = 0; f < frames.length; f += 1) {
      for (let i = 0; i < 12; i += 1) avg[i] += frames[f][i];
    }
    for (let i = 0; i < 12; i += 1) avg[i] /= frames.length;
    normalize(avg);
    return avg;
  }

  /**
   * Zustandsautomat der Akkorderkennung.
   *
   * - hält einen Ringpuffer der letzten `smoothingFrames` Chromagramme
   * - vergleicht den zeitlich geglätteten Vektor per Cosine-Similarity
   * - meldet pro "Anschlag" höchstens einen Versuch (attempt)
   * - entschärft erst wieder, wenn die Ähnlichkeit unter rearmThreshold fällt
   */
  class ChordMatcher {
    constructor(chordOrder, chords, options) {
      this.cfg = Object.assign({}, DEFAULTS, options);
      this.chordOrder = chordOrder;
      this.chords = chords;
      this.templates = {};
      this.frames = [];
      this.armed = true;

      chordOrder.forEach((id) => {
        const template = new Float32Array(12);
        chords[id].pitchClasses.forEach((pc) => {
          template[((pc % 12) + 12) % 12] = 1;
        });
        normalize(template);
        this.templates[id] = template;
      });
    }

    reset() {
      this.frames = [];
      this.armed = true;
    }

    /**
     * @param {Float32Array|null} chroma  Chroma des aktuellen Frames oder null bei Stille
     * @param {boolean} silent
     * @returns {{scores: Object, bestId: string|null, bestScore: number,
     *            attempt: boolean, armed: boolean}}
     */
    update(chroma, silent) {
      if (silent || !chroma) {
        // Stille beendet die Glättungshistorie: der nächste Anschlag wird
        // nicht mit dem Ausklang des vorherigen Akkords vermischt.
        this.frames = [];
      } else {
        this.frames.push(Float32Array.from(chroma));
        while (this.frames.length > this.cfg.smoothingFrames) this.frames.shift();
      }

      const smoothed = averageFrames(this.frames);
      const scores = {};
      let bestId = null;
      let bestScore = 0;

      for (let i = 0; i < this.chordOrder.length; i += 1) {
        const id = this.chordOrder[i];
        const score = cosineSimilarity(smoothed, this.templates[id]);
        scores[id] = score;
        if (score > bestScore) {
          bestScore = score;
          bestId = id;
        }
      }

      let attempt = false;
      if (!silent && bestScore >= this.cfg.matchThreshold && this.armed) {
        attempt = true;
        this.armed = false;
      }

      if (bestScore < this.cfg.rearmThreshold) {
        this.armed = true;
      }

      return { scores, bestId, bestScore, attempt, armed: this.armed };
    }
  }

  const api = { DEFAULTS, computeChroma, normalize, cosineSimilarity, averageFrames, ChordMatcher };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
