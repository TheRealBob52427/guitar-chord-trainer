/**
 * Monophone Pitch-Erkennung (YIN) für den Stimm-Modus.
 *
 * Reine Funktion ohne Web-Audio-Abhängigkeit, damit sie in Node testbar ist.
 * Eingabe ist ein Zeitbereichs-Buffer (Float32Array, -1..1), z. B. aus
 * AnalyserNode.getFloatTimeDomainData().
 */
(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const DEFAULTS = Object.freeze({
    minHz: 60,
    maxHz: 500,
    threshold: 0.18,
    minConfidence: 0.6,
    minRmsDb: -55,
    bufferSize: 4096
  });

  /**
   * YIN-Pitch-Detektor mit kumulativer Mittelwert-Normalisierung und
   * parabolischer Interpolation um das erste Minimum.
   *
   * @param {Float32Array|Float64Array} samples
   * @param {number} sampleRate
   * @param {Object} [options]
   * @returns {{frequency:number, confidence:number, rmsDb:number}|null}
   */
  function detectPitch(samples, sampleRate, options) {
    const cfg = Object.assign({}, DEFAULTS, options);
    if (!samples || samples.length < 1024 || !sampleRate) return null;

    const size = Math.min(cfg.bufferSize, samples.length);
    const offset = samples.length - size;
    const minTau = Math.max(2, Math.floor(sampleRate / cfg.maxHz));
    const maxTau = Math.min(Math.floor(sampleRate / cfg.minHz), size - 256);
    if (maxTau <= minTau) return null;

    let sumSquares = 0;
    for (let i = 0; i < size; i += 1) {
      const value = samples[offset + i];
      sumSquares += value * value;
    }
    const rms = Math.sqrt(sumSquares / size);
    const rmsDb = 20 * Math.log10(Math.max(rms, 1e-8));
    if (rmsDb < cfg.minRmsDb) return null;

    const windowSize = size - maxTau;
    const difference = new Float64Array(maxTau + 1);
    // Auch die kleinen Taus berechnen: Sie tragen zwar nicht zur Suche bei,
    // werden aber für die korrekte kumulative Mittelwert-Normalisierung
    // (CMND) benötigt. Ohne sie wäre cmnd[minTau] künstlich zu groß.
    for (let tau = 1; tau <= maxTau; tau += 1) {
      let sum = 0;
      for (let i = 0; i < windowSize; i += 1) {
        const delta = samples[offset + i] - samples[offset + i + tau];
        sum += delta * delta;
      }
      difference[tau] = sum;
    }

    // Kumulativer Mittelwert (CMND): unabhängig von der Signalstärke.
    const cmnd = new Float64Array(maxTau + 1);
    cmnd[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= maxTau; tau += 1) {
      runningSum += difference[tau];
      cmnd[tau] = runningSum > 0 ? (difference[tau] * tau) / runningSum : 1;
    }

    let tauEstimate = -1;
    for (let tau = minTau; tau <= maxTau; tau += 1) {
      if (cmnd[tau] < cfg.threshold) {
        while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau += 1;
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) {
      // Kein Wert unter der Schwelle: nur ein sehr deutliches globales Minimum
      // akzeptieren, sonst lieber "kein Ton" melden.
      let best = minTau;
      for (let tau = minTau + 1; tau <= maxTau; tau += 1) {
        if (cmnd[tau] < cmnd[best]) best = tau;
      }
      if (cmnd[best] > 0.5) return null;
      tauEstimate = best;
    }

    let betterTau = tauEstimate;
    if (tauEstimate > 1 && tauEstimate < maxTau) {
      const s0 = cmnd[tauEstimate - 1];
      const s1 = cmnd[tauEstimate];
      const s2 = cmnd[tauEstimate + 1];
      const denominator = s0 - 2 * s1 + s2;
      if (Math.abs(denominator) > 1e-12) {
        betterTau = tauEstimate + (0.5 * (s0 - s2)) / denominator;
      }
    }

    if (!Number.isFinite(betterTau) || betterTau <= 0) return null;
    const frequency = sampleRate / betterTau;
    const confidence = Math.max(0, Math.min(1, 1 - cmnd[tauEstimate]));

    if (!Number.isFinite(frequency) || frequency < cfg.minHz || frequency > cfg.maxHz) {
      return null;
    }
    if (confidence < cfg.minConfidence) return null;

    return { frequency, confidence, rmsDb };
  }

  /**
   * Ordnet einer Frequenz die nächste chromatische Note und die Abweichung
   * in Cent zu. 440 Hz -> A4 mit 0 Cent.
   */
  function frequencyToNote(frequency) {
    if (!Number.isFinite(frequency) || frequency <= 0) return null;
    const midiFloat = 69 + 12 * Math.log2(frequency / 440);
    const midi = Math.round(midiFloat);
    const cents = (midiFloat - midi) * 100;
    const pitchClass = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    return {
      midi,
      name: NOTE_NAMES[pitchClass],
      octave,
      label: `${NOTE_NAMES[pitchClass]}${octave}`,
      cents
    };
  }

  const api = { DEFAULTS, detectPitch, frequencyToNote, NOTE_NAMES };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
