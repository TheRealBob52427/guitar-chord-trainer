/**
 * Persistente UI-Einstellungen (localStorage).
 *
 * Gespeichert werden ausschließlich Einstellungen, keine Audiodaten:
 * Modus, Metronom-BPM, Pentatonik-Parameter, Audio-Gerät und Tuner-Zielsaite.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'guitarTrainer.prefs.v1';
  const MODES = ['trainer', 'tuner', 'pentatonic', 'song', 'help'];
  const SCALE_TYPES = ['minor', 'major'];

  const DEFAULTS = Object.freeze({
    mode: 'trainer',
    bpm: 50,
    tuningStringIndex: 0,
    tunerAuto: false,
    scale: Object.freeze({
      rootPc: 9,
      type: 'minor',
      repeats: 1,
      backward: false
    }),
    deviceId: ''
  });

  function clampInteger(value, min, max, fallback) {
    const numeric = Math.round(Number(value));
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  }

  function normalizePrefs(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const scale = source.scale && typeof source.scale === 'object' ? source.scale : {};
    const deviceId = typeof source.deviceId === 'string' ? source.deviceId.slice(0, 512) : '';

    return {
      mode: MODES.includes(source.mode) ? source.mode : DEFAULTS.mode,
      bpm: clampInteger(source.bpm, 40, 180, DEFAULTS.bpm),
      tuningStringIndex: clampInteger(source.tuningStringIndex, 0, 5, DEFAULTS.tuningStringIndex),
      tunerAuto: source.tunerAuto === true,
      scale: {
        rootPc: clampInteger(scale.rootPc, 0, 11, DEFAULTS.scale.rootPc),
        type: SCALE_TYPES.includes(scale.type) ? scale.type : DEFAULTS.scale.type,
        repeats: clampInteger(scale.repeats, 1, 4, DEFAULTS.scale.repeats),
        backward: scale.backward === true
      },
      deviceId
    };
  }

  function loadPrefs(storage) {
    if (!storage || typeof storage.getItem !== 'function') {
      return normalizePrefs(DEFAULTS);
    }
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return normalizePrefs(DEFAULTS);
      return normalizePrefs(JSON.parse(raw));
    } catch (error) {
      return normalizePrefs(DEFAULTS);
    }
  }

  function savePrefs(storage, prefs) {
    if (!storage || typeof storage.setItem !== 'function') return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(normalizePrefs(prefs)));
      return true;
    } catch (error) {
      return false;
    }
  }

  const api = { STORAGE_KEY, MODES, SCALE_TYPES, DEFAULTS, normalizePrefs, loadPrefs, savePrefs };

  global.ChordTrainer = global.ChordTrainer || {};
  global.ChordTrainer.Prefs = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
