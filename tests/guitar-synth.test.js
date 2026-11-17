'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  renderPluckedString,
  midiToFrequency,
  stringFrequency,
  chordFrequencies,
  positionsToFrequencies
} = require('../app/js/guitar-synth.js');

const SR = 48000;

function autocorrelationFrequency(samples, sampleRate, minHz = 60, maxHz = 1400) {
  const start = Math.round(0.02 * sampleRate);
  const length = Math.min(8192, samples.length - start - 2);
  let bestLag = 0;
  let best = -Infinity;
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(Math.floor(sampleRate / minHz), length - 1);
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += samples[start + i] * samples[start + i + lag];
    if (sum > best) {
      best = sum;
      bestLag = lag;
    }
  }
  return sampleRate / bestLag;
}

test('Buffer hat die richtige Länge und keine ungültigen Werte', () => {
  const buffer = renderPluckedString(110, SR, { duration: 0.5 });
  assert.equal(buffer.length, Math.round(0.5 * SR));
  assert.ok(buffer instanceof Float32Array);
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    assert.ok(Number.isFinite(buffer[i]), `Sample ${i} ist nicht endlich`);
    peak = Math.max(peak, Math.abs(buffer[i]));
  }
  assert.ok(peak > 0.5 && peak <= 1.2, `Peak ${peak}`);
});

test('Erzeugte Saitentöne haben die gewünschte Grundfrequenz', () => {
  [82.4069, 110, 196, 329.63, 523.25].forEach((frequency) => {
    const buffer = renderPluckedString(frequency, SR, { duration: 0.8 });
    const measured = autocorrelationFrequency(buffer, SR);
    const error = Math.abs(measured - frequency) / frequency;
    assert.ok(error < 0.02, `${frequency} Hz -> ${measured.toFixed(2)} Hz (${(error * 100).toFixed(1)} %)`);
  });
});

test('Deterministisch: gleiche Frequenz liefert denselben Buffer', () => {
  const a = renderPluckedString(146.83, SR, { duration: 0.2 });
  const b = renderPluckedString(146.83, SR, { duration: 0.2 });
  assert.deepEqual(a, b);
});

test('Ungültige Eingaben liefern einen leeren Buffer', () => {
  assert.equal(renderPluckedString(0, SR).length, 0);
  assert.equal(renderPluckedString(-10, SR).length, 0);
  assert.equal(renderPluckedString(NaN, SR).length, 0);
  assert.equal(renderPluckedString(110, 0).length, 0);
});

test('MIDI- und Saitenfrequenzen stimmen', () => {
  assert.ok(Math.abs(midiToFrequency(69) - 440) < 1e-9);
  assert.ok(Math.abs(midiToFrequency(45) - 110) < 1e-9);
  assert.ok(Math.abs(stringFrequency(0, 0) - 82.4069) < 0.01);
  assert.ok(Math.abs(stringFrequency(5, 8) - 523.2511) < 0.01);
  assert.equal(stringFrequency(9, 0), null);
});

test('Akkord- und Positionsfrequenzen werden von tief nach hoch geliefert', () => {
  const em = { frets: [0, 2, 2, 0, 0, 0] };
  const frequencies = chordFrequencies(em);
  assert.equal(frequencies.length, 6);
  for (let i = 1; i < frequencies.length; i += 1) {
    assert.ok(frequencies[i] >= frequencies[i - 1], 'Frequenzen sind nicht aufsteigend');
  }
  assert.ok(Math.abs(frequencies[0] - 82.4069) < 0.01);
  assert.deepEqual(chordFrequencies({ frets: [-1, -1, 0] }).length, 1);

  const positions = [
    { stringIndex: 0, fret: 5 },
    { midi: 69 },
    { frequency: 330 }
  ];
  assert.equal(positionsToFrequencies(positions).length, 3);
});
