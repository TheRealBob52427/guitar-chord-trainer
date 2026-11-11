'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TUNING_STRINGS,
  IN_TUNE_CENTS,
  centsFromFrequency,
  nearestStringIndex,
  isInTune,
  formatCents,
  formatHz
} = require('../app/js/tuning.js');

test('sechs Saiten in Standardstimmung E-A-D-G-B-E', () => {
  assert.equal(TUNING_STRINGS.length, 6);
  assert.deepEqual(TUNING_STRINGS.map((string) => string.id), ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  assert.deepEqual(TUNING_STRINGS.map((string) => string.midi), [40, 45, 50, 55, 59, 64]);
  TUNING_STRINGS.forEach((string) => {
    const expected = 440 * Math.pow(2, (string.midi - 69) / 12);
    assert.ok(Math.abs(string.frequency - expected) < 0.001, string.id);
  });
});

test('Cent-Berechnung und In-Tune-Schwelle', () => {
  assert.equal(centsFromFrequency(110, 110), 0);
  assert.ok(Math.abs(centsFromFrequency(110 * Math.pow(2, 10 / 1200), 110) - 10) < 1e-6);
  assert.ok(Math.abs(centsFromFrequency(110 * Math.pow(2, -25 / 1200), 110) + 25) < 1e-6);
  assert.equal(centsFromFrequency(0, 110), null);
  assert.equal(centsFromFrequency(110, null), null);

  assert.equal(isInTune(IN_TUNE_CENTS), true);
  assert.equal(isInTune(-IN_TUNE_CENTS), true);
  assert.equal(isInTune(IN_TUNE_CENTS + 0.1), false);
  assert.equal(isInTune(NaN), false);
});

test('nächste Saite wird gefunden', () => {
  assert.equal(nearestStringIndex(82.4), 0);
  assert.equal(nearestStringIndex(110), 1);
  assert.equal(nearestStringIndex(112), 1);
  assert.equal(nearestStringIndex(146.8), 2);
  assert.equal(nearestStringIndex(329.6), 5);
});

test('deutsche Formatierung von Cent und Hertz', () => {
  assert.equal(formatCents(12.4), '+12 Cent');
  assert.equal(formatCents(-12.4), '−12 Cent');
  assert.equal(formatCents(0.2), '0 Cent');
  assert.equal(formatHz(82.4069), '82,4 Hz');
  assert.equal(formatHz(NaN), '– Hz');
});
