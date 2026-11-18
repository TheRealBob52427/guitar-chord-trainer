/**
 * Versions- und Projekt-Metadaten für die Einstellungen.
 *
 * Bei einem Release die Version hier, in `index.html` (Asset-Query) und in
 * `sw.js` (CACHE_VERSION + Precache-Query) gemeinsam erhöhen.
 */
(function (global) {
  'use strict';

  const APP_VERSION = '1.7.1';
  const REPO_URL = 'https://github.com/TheRealBob52427/guitar-chord-trainer';
  const KOFI_URL = 'https://ko-fi.com/therealbob33119';

  const api = { APP_VERSION, REPO_URL, KOFI_URL };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
