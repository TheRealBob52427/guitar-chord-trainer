'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const Prefs = require('../app/js/prefs.js');

function memoryStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(String(key), String(value)); },
    removeItem(key) { map.delete(key); },
    has(key) { return map.has(key); }
  };
}

test('Default-Einstellungen sind vollständig', () => {
  const prefs = Prefs.normalizePrefs({});
  assert.deepEqual(prefs, {
    mode: 'trainer',
    bpm: 50,
    tuningStringIndex: 0,
    scale: { rootPc: 9, type: 'minor', attacks: 15, repeats: 2 },
    deviceId: ''
  });
});

test('Song-Modus ist ein gültiger persistierter Modus', () => {
  const prefs = Prefs.normalizePrefs({ mode: 'song' });
  assert.equal(prefs.mode, 'song');
});

test('Einstellungen überleben Speichern und Laden', () => {
  const storage = memoryStorage();
  const saved = {
    mode: 'pentatonic',
    bpm: 123,
    tuningStringIndex: 4,
    scale: { rootPc: 4, type: 'major', attacks: 7, repeats: 3 },
    deviceId: 'device-abc'
  };
  assert.equal(Prefs.savePrefs(storage, saved), true);
  assert.deepEqual(Prefs.loadPrefs(storage), saved);
});

test('Ungültige Werte werden begrenzt oder ersetzt', () => {
  const normalized = Prefs.normalizePrefs({
    mode: 'unbekannt',
    bpm: 999,
    tuningStringIndex: 99,
    scale: { rootPc: -5, type: 'phrygisch', attacks: 100, repeats: 0 },
    deviceId: 42
  });
  assert.equal(normalized.mode, 'trainer');
  assert.equal(normalized.bpm, 180);
  assert.equal(normalized.tuningStringIndex, 5);
  assert.equal(normalized.scale.rootPc, 0);
  assert.equal(normalized.scale.type, 'minor');
  assert.equal(normalized.scale.attacks, 40);
  assert.equal(normalized.scale.repeats, 1);
  assert.equal(normalized.deviceId, '');

  const low = Prefs.normalizePrefs({ bpm: 1, scale: { attacks: 1, repeats: 9 } });
  assert.equal(low.bpm, 40);
  assert.equal(low.scale.attacks, 5);
  assert.equal(low.scale.repeats, 4);
});

test('Korrupte Daten und fehlender Storage fallen auf Defaults zurück', () => {
  const storage = memoryStorage({ 'guitarTrainer.prefs.v1': '{kaputt' });
  assert.equal(Prefs.loadPrefs(storage).bpm, 50);
  assert.equal(Prefs.loadPrefs(null).mode, 'trainer');
  assert.equal(Prefs.savePrefs(null, {}), false);
});

test('Geräte-ID wird als String gespeichert und begrenzt', () => {
  const longId = 'x'.repeat(700);
  const normalized = Prefs.normalizePrefs({ deviceId: longId });
  assert.equal(normalized.deviceId.length, 512);
});
