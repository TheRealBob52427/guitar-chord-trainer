'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { detectPitch, frequencyToNote } = require('../app/js/pitch.js');

const SR = 48000;
const SIZE = 4096;

function synth(frequency, { harmonics = [1, 0.55, 0.3, 0.18], amplitude = 0.45, noise = 0.0008 } = {}) {
  const samples = new Float64Array(SIZE);
  let seed = 987654321;
  for (let i = 0; i < SIZE; i += 1) {
    let value = 0;
    harmonics.forEach((level, index) => {
      value += level * Math.sin((2 * Math.PI * frequency * (index + 1) * i) / SR);
    });
    seed = (1103515245 * seed + 12345) % 2147483648;
    const random = (seed / 2147483648) * 2 - 1;
    samples[i] = value * amplitude + random * noise;
  }
  return samples;
}

test('YIN erkennt alle sechs offenen Gitarrensaiten', () => {
  const frequencies = [82.4069, 110.0, 146.8324, 195.9977, 246.9417, 329.6276];
  frequencies.forEach((frequency) => {
    const result = detectPitch(synth(frequency), SR);
    assert.ok(result, `${frequency} Hz wurde nicht erkannt`);
    assert.ok(Math.abs(result.frequency - frequency) < 0.35,
      `${frequency} Hz -> ${result.frequency.toFixed(2)} Hz`);
    assert.ok(result.confidence > 0.75, `Confidence ${result.confidence}`);
  });
});

test('YIN erkennt auch hohe Töne am oberen Bereichsrand', () => {
  const result = detectPitch(synth(480), SR);
  assert.ok(result, '480 Hz wurde nicht erkannt');
  assert.ok(Math.abs(result.frequency - 480) < 1, `480 Hz -> ${result.frequency}`);
  assert.ok(result.confidence > 0.75);
});

test('YIN bleibt bei starkem Oberton stabil (kein Oktavfehler)', () => {
  const samples = synth(82.4069, { harmonics: [0.45, 1, 0.4, 0.2] });
  const result = detectPitch(samples, SR);
  assert.ok(result);
  assert.ok(Math.abs(result.frequency - 82.4069) < 0.5, `erkannt: ${result.frequency}`);
});

test('YIN erkennt eine um 10 Cent zu hohe Saite', () => {
  const target = 110 * Math.pow(2, 10 / 1200);
  const result = detectPitch(synth(target), SR);
  assert.ok(result);
  const cents = 1200 * Math.log2(result.frequency / 110);
  assert.ok(Math.abs(cents - 10) < 1.5, `Cent: ${cents.toFixed(2)}`);
});

test('Stille und zu kurze Buffer liefern kein Pitch-Ergebnis', () => {
  assert.equal(detectPitch(new Float32Array(SIZE), SR), null);
  assert.equal(detectPitch(new Float32Array(256), SR), null);
  assert.equal(detectPitch(new Float32Array(SIZE).fill(0.000001), SR), null);
});

test('frequencyToNote liefert Note, Oktave und Cent', () => {
  const a4 = frequencyToNote(440);
  assert.equal(a4.label, 'A4');
  assert.equal(a4.midi, 69);
  assert.ok(Math.abs(a4.cents) < 1e-6);

  const e2 = frequencyToNote(82.4069);
  assert.equal(e2.label, 'E2');
  assert.equal(e2.midi, 40);

  const sharpA = frequencyToNote(110 * Math.pow(2, 20 / 1200));
  assert.equal(sharpA.label, 'A2');
  assert.ok(Math.abs(sharpA.cents - 20) < 0.01);

  assert.equal(frequencyToNote(0), null);
  assert.equal(frequencyToNote(NaN), null);
});
