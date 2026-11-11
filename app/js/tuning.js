/**
 * Stimmdaten und Cent-Berechnungen für den Gitarren-Stimmmodus.
 */
(function (global) {
  'use strict';

  const IN_TUNE_CENTS = 5;
  const GAUGE_RANGE_CENTS = 50;

  const TUNING_STRINGS = [
    { id: 'E2', note: 'E', octave: 2, midi: 40, frequency: 82.4069, description: 'tiefe E-Saite' },
    { id: 'A2', note: 'A', octave: 2, midi: 45, frequency: 110.0, description: 'A-Saite' },
    { id: 'D3', note: 'D', octave: 3, midi: 50, frequency: 146.8324, description: 'D-Saite' },
    { id: 'G3', note: 'G', octave: 3, midi: 55, frequency: 195.9977, description: 'G-Saite' },
    { id: 'B3', note: 'B', octave: 3, midi: 59, frequency: 246.9417, description: 'B-Saite' },
    { id: 'E4', note: 'E', octave: 4, midi: 64, frequency: 329.6276, description: 'hohe E-Saite' }
  ];

  /** Abweichung einer Frequenz von einem Zielton in Cent. */
  function centsFromFrequency(frequency, targetFrequency) {
    if (!Number.isFinite(frequency) || !Number.isFinite(targetFrequency) ||
        frequency <= 0 || targetFrequency <= 0) {
      return null;
    }
    return 1200 * Math.log2(frequency / targetFrequency);
  }

  /** Nächste Gitarrensaite zu einer gemessenen Frequenz. */
  function nearestStringIndex(frequency) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    TUNING_STRINGS.forEach((string, index) => {
      const distance = Math.abs(centsFromFrequency(frequency, string.frequency) || 0);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function isInTune(cents) {
    return Number.isFinite(cents) && Math.abs(cents) <= IN_TUNE_CENTS;
  }

  /** Formatierung mit deutschem Minus und Dezimalkomma. */
  function formatCents(cents) {
    if (!Number.isFinite(cents)) return '0 Cent';
    const rounded = Math.round(cents);
    if (rounded === 0) return '0 Cent';
    return rounded > 0 ? `+${rounded} Cent` : `−${Math.abs(rounded)} Cent`;
  }

  function formatHz(frequency) {
    if (!Number.isFinite(frequency)) return '– Hz';
    return `${frequency.toFixed(1).replace('.', ',')} Hz`;
  }

  const api = {
    TUNING_STRINGS,
    IN_TUNE_CENTS,
    GAUGE_RANGE_CENTS,
    centsFromFrequency,
    nearestStringIndex,
    isInTune,
    formatCents,
    formatHz
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
