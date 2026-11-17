/**
 * Elektrische Gitarre als synthetisches Zupfinstrument (Karplus-Strong).
 *
 * Reine Funktionen ohne Web-Audio-Abhängigkeit: Die Buffer werden in Node
 * erzeugt und getestet; audio.js spielt sie über AudioBufferSourceNodes ab.
 *
 * Klangweg: Noise-Anregung -> Kammfilter (Pickup-/Anschlagsposition) ->
 * Karplus-Strong-Saite mit Dämpfung -> weiche Sättigung (Amp) -> Cabinet-
 * Filter (Hochpass + Tiefpass) -> kurze Ausblendung.
 */
(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];

  const DEFAULTS = Object.freeze({
    duration: 2.4,
    sustain: 2.8,
    drive: 1.9,
    brightness: 0.5,
    excite: 0.55,
    pickPosition: 0.27,
    cabinetHz: 4300,
    bodyHz: 95,
    gain: 0.82
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** MIDI-Note -> Frequenz (A4 = 69 = 440 Hz). */
  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (Number(midi) - 69) / 12);
  }

  /** Frequenz einer gegriffenen Gitarrensaite (0 = tiefe E, 5 = hohe E). */
  function stringFrequency(stringIndex, fret) {
    const openMidi = OPEN_STRING_MIDI[Math.round(Number(stringIndex))];
    if (!Number.isFinite(openMidi)) return null;
    return midiToFrequency(openMidi + Number(fret || 0));
  }

  /**
   * Erzeugt einen einzelnen gezupften Saitenton als Float32Array.
   *
   * Die Länge der Verzögerungsleitung bestimmt die Tonhöhe. Die Anregung ist
   * gefiltertes Rauschen mit einem Kammfilter für den typischen elektrischen
   * Anschlag; die Rückkopplung mittelt zwei Samples (Tiefpass) und dämpft
   * entsprechend der gewünschten Ausklingzeit.
   *
   * @param {number} frequency Frequenz in Hz
   * @param {number} sampleRate Abtastrate in Hz
   * @param {Object} [options]
   * @returns {Float32Array}
   */
  function renderPluckedString(frequency, sampleRate, options) {
    const cfg = Object.assign({}, DEFAULTS, options);
    const sr = Number(sampleRate);
    const f = Number(frequency);
    if (!Number.isFinite(sr) || sr <= 0 || !Number.isFinite(f) || f <= 0) {
      return new Float32Array(0);
    }

    const nyquist = sr / 2;
    const fundamental = clamp(f, 30, nyquist * 0.45);
    const period = sr / fundamental;
    const delayLength = Math.max(2, Math.round(period));
    const total = Math.max(1, Math.round(clamp(Number(cfg.duration) || 0, 0.05, 8) * sr));

    // Deterministisches Rauschen: gleiche Note -> gleicher Buffer.
    let seed = 0x2f6e2b1;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2147483648 - 1;
    };

    // Anregung: tiefpassgefiltertes Rauschen.
    const excitation = new Float32Array(delayLength);
    let smooth = 0;
    const exciteAlpha = clamp(Number(cfg.excite) || 0.55, 0.05, 1);
    for (let i = 0; i < delayLength; i += 1) {
      smooth += (random() - smooth) * exciteAlpha;
      excitation[i] = smooth;
    }

    // Kammfilter: unterdrückt die Harmonischen am Anschlagspunkt und macht
    // den Ton heller/„drahtiger“ als reines Rauschen.
    const pickOffset = Math.max(1, Math.round(delayLength * clamp(Number(cfg.pickPosition) || 0, 0.05, 0.45)));
    const delay = new Float32Array(delayLength);
    let excitePeak = 0;
    for (let i = 0; i < delayLength; i += 1) {
      const value = excitation[i] - 0.62 * excitation[(i + pickOffset) % delayLength];
      delay[i] = value;
      excitePeak = Math.max(excitePeak, Math.abs(value));
    }
    if (excitePeak > 0) {
      for (let i = 0; i < delayLength; i += 1) delay[i] = (delay[i] / excitePeak) * 0.9;
    }

    const sustain = clamp(Number(cfg.sustain) || 2.8, 0.3, 12);
    const decay = Math.pow(10, (-3 * (delayLength / sr)) / sustain);
    const brightness = clamp(Number(cfg.brightness) || 0.5, 0, 1);
    const mixed = 1 - brightness;
    const out = new Float32Array(total);

    let index = 0;
    let previous = delay[delayLength - 1];
    for (let n = 0; n < total; n += 1) {
      const current = delay[index];
      const filtered = mixed * current + brightness * previous;
      const value = filtered * decay;
      out[n] = value;
      delay[index] = value;
      previous = current;
      index += 1;
      if (index === delayLength) index = 0;
    }

    // Weiche Sättigung (Röhren-Amp). Vorher auf einen sicheren Pegel bringen.
    let peak = 0;
    for (let n = 0; n < total; n += 1) peak = Math.max(peak, Math.abs(out[n]));
    const drive = clamp(Number(cfg.drive) || 1.9, 1, 6);
    const norm = peak > 1e-9 ? 0.55 / peak : 0;
    const driveNorm = Math.tanh(drive);
    for (let n = 0; n < total; n += 1) {
      out[n] = Math.tanh(out[n] * norm * drive) / driveNorm;
    }

    // Cabinet: Tiefpass gegen digitale Härte, Hochpass gegen Dröhnen.
    const cabinetHz = clamp(Number(cfg.cabinetHz) || 4300, 800, nyquist * 0.9);
    const bodyHz = clamp(Number(cfg.bodyHz) || 95, 30, 400);
    const lowAlpha = 1 - Math.exp((-2 * Math.PI * cabinetHz) / sr);
    const highAlpha = 1 - Math.exp((-2 * Math.PI * bodyHz) / sr);
    let lowState = 0;
    let highState = 0;
    for (let n = 0; n < total; n += 1) {
      lowState += (out[n] - lowState) * lowAlpha;
      highState += (lowState - highState) * highAlpha;
      out[n] = lowState - highState;
    }

    // Kurzer Pick-Anschlag für die E-Gitarren-Attacke.
    const pickLength = Math.max(8, Math.round(0.006 * sr));
    const pickDecay = Math.max(1, 0.0015 * sr);
    for (let n = 0; n < Math.min(total, pickLength); n += 1) {
      out[n] += random() * 0.06 * Math.exp(-n / pickDecay);
    }

    // Ein- und Ausblenden gegen Klicks.
    const fadeIn = Math.max(4, Math.round(0.002 * sr));
    const fadeOut = Math.max(16, Math.round(0.03 * sr));
    for (let n = 0; n < Math.min(fadeIn, total); n += 1) {
      out[n] *= n / fadeIn;
    }
    for (let n = 0; n < Math.min(fadeOut, total); n += 1) {
      out[total - 1 - n] *= n / fadeOut;
    }

    // Endpegel.
    peak = 0;
    for (let n = 0; n < total; n += 1) peak = Math.max(peak, Math.abs(out[n]));
    const gain = clamp(Number(cfg.gain) || 0.82, 0.05, 1.5);
    if (peak > 1e-9) {
      const scale = gain / peak;
      for (let n = 0; n < total; n += 1) out[n] *= scale;
    }

    return out;
  }

  /** Frequenzen für die angeschlagenen Saiten eines Akkords (tief -> hoch). */
  function chordFrequencies(chord) {
    if (!chord || !Array.isArray(chord.frets)) return [];
    return chord.frets
      .map((fret, stringIndex) => (fret >= 0 ? stringFrequency(stringIndex, fret) : null))
      .filter((frequency) => Number.isFinite(frequency));
  }

  /** Frequenzen für eine tonleiterähnliche Positionsliste. */
  function positionsToFrequencies(positions) {
    if (!Array.isArray(positions)) return [];
    return positions
      .map((position) => {
        if (Number.isFinite(position.frequency)) return position.frequency;
        if (Number.isFinite(position.midi)) return midiToFrequency(position.midi);
        return stringFrequency(position.stringIndex, position.fret);
      })
      .filter((frequency) => Number.isFinite(frequency));
  }

  const api = {
    NOTE_NAMES,
    OPEN_STRING_MIDI,
    DEFAULTS,
    midiToFrequency,
    stringFrequency,
    renderPluckedString,
    chordFrequencies,
    positionsToFrequencies
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
