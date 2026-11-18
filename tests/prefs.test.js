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
    tunerAuto: false,
    scale: { rootPc: 9, type: 'minor', pattern: 1, repeats: 1, backward: false },
    cagedRoot: 9,
    playMode: 'timed',
    playSpeed: 100,
    riffId: 'seven-nation-army',
    deviceId: ''
  });
});

test('Song-, Riff- und Hilfe-Modus sind gültige persistierte Modi', () => {
  assert.equal(Prefs.normalizePrefs({ mode: 'song' }).mode, 'song');
  assert.equal(Prefs.normalizePrefs({ mode: 'riff' }).mode, 'riff');
  assert.equal(Prefs.normalizePrefs({ mode: 'play' }).mode, 'play');
  assert.equal(Prefs.normalizePrefs({ mode: 'help' }).mode, 'help');
});

test('Einstellungen überleben Speichern und Laden', () => {
  const storage = memoryStorage();
  const saved = {
    mode: 'pentatonic',
    bpm: 123,
    tuningStringIndex: 4,
    tunerAuto: true,
    scale: { rootPc: 4, type: 'major', pattern: 4, repeats: 3, backward: true },
    cagedRoot: 2,
    playMode: 'wait',
    playSpeed: 70,
    riffId: 'californication',
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
    tunerAuto: 'ja',
    scale: { rootPc: -5, type: 'phrygisch', repeats: 0, backward: 'ja' },
    deviceId: 42
  });
  assert.equal(normalized.mode, 'trainer');
  assert.equal(normalized.bpm, 180);
  assert.equal(normalized.tuningStringIndex, 5);
  assert.equal(normalized.tunerAuto, false);
  assert.equal(normalized.scale.rootPc, 0);
  assert.equal(normalized.scale.type, 'minor');
  assert.equal(normalized.scale.pattern, 1);
  assert.equal(normalized.scale.repeats, 1);
  assert.equal(normalized.scale.backward, false);
  assert.equal(normalized.cagedRoot, 9);
  assert.equal(normalized.playMode, 'timed');
  assert.equal(normalized.playSpeed, 100);
  assert.equal(normalized.riffId, 'seven-nation-army');
  assert.equal(normalized.deviceId, '');

  const low = Prefs.normalizePrefs({ bpm: 1, scale: { repeats: 9 } });
  assert.equal(low.bpm, 40);
  assert.equal(low.scale.repeats, 4);
  assert.equal(Prefs.normalizePrefs({ playSpeed: 10 }).playSpeed, 50);
  assert.equal(Prefs.normalizePrefs({ playSpeed: 200 }).playSpeed, 100);
  assert.equal(Prefs.normalizePrefs({ playMode: 'wait' }).playMode, 'wait');
});

test('Alte attacks-Einstellung wird ignoriert, neue Werte bleiben gültig', () => {
  const legacy = Prefs.normalizePrefs({
    scale: { rootPc: 9, type: 'minor', attacks: 15, repeats: 2 }
  });
  assert.equal(legacy.scale.attacks, undefined);
  assert.equal(legacy.scale.repeats, 2);
  assert.equal(legacy.scale.backward, false);
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
