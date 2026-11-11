'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { Metronome, MIN_BPM, MAX_BPM } = require('../app/js/metronome.js');

test('Metronom startet standardmäßig mit 50 BPM', () => {
  const metronome = new Metronome({ getContext: () => null });
  assert.equal(metronome.bpm, 50);
  assert.equal(metronome.playing, false);
});

test('BPM werden auf 40-180 begrenzt und gerundet', () => {
  const metronome = new Metronome({ getContext: () => null });
  assert.equal(metronome.setBpm(39), MIN_BPM);
  assert.equal(metronome.setBpm(181), MAX_BPM);
  assert.equal(metronome.setBpm(77.6), 78);
  assert.equal(metronome.setBpm('abc'), 78);
  assert.equal(MIN_BPM, 40);
  assert.equal(MAX_BPM, 180);
});
