'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PENTATONIC_RUNS,
  scalePitchClasses,
  scaleLabel,
  scaleFrequencies,
  buildSequence,
  buildPositions,
  renderPentatonicFretboard
} = require('../app/js/pentatonic.js');

test('Moll- und Dur-Pentatonik haben die richtigen Stufen', () => {
  assert.deepEqual(scalePitchClasses(9, 'minor'), [9, 0, 2, 4, 7]); // A C D E G
  assert.deepEqual(scalePitchClasses(0, 'major'), [0, 2, 4, 7, 9]); // C D E G A
  assert.deepEqual(scalePitchClasses(4, 'minor'), [4, 7, 9, 11, 2]); // E G A B D
  assert.deepEqual(scalePitchClasses(11, 'major'), [11, 1, 3, 6, 8]); // B C# D# F# G#
  assert.equal(PENTATONIC_RUNS, 5);
});

test('Skalenname wird deutsch formatiert', () => {
  assert.equal(scaleLabel(9, 'minor'), 'A-Moll-Pentatonik');
  assert.equal(scaleLabel(0, 'major'), 'C-Dur-Pentatonik');
  assert.equal(scaleLabel(6, 'minor'), 'F#-Moll-Pentatonik');
  assert.equal(scaleLabel(9, 'unbekannt'), 'A-Moll-Pentatonik');
});

test('Fünf Tonfolgen enthalten wirklich alle fünf Skalentöne', () => {
  const sequence = buildSequence(9, 'minor', 5, 1, false);
  assert.equal(sequence.length, 25);
  assert.deepEqual([...new Set(sequence.map((note) => note.run))], [1, 2, 3, 4, 5]);

  for (let run = 1; run <= 5; run += 1) {
    const notes = sequence.filter((note) => note.run === run);
    assert.deepEqual(notes.map((note) => note.name), ['A', 'C', 'D', 'E', 'G']);
    assert.deepEqual(notes.map((note) => note.degree), [0, 1, 2, 3, 4]);
    assert.ok(notes.every((note) => note.direction === 'up'));
  }
});

test('Wiederholungen pro Ton bleiben innerhalb jeder Tonfolge', () => {
  const sequence = buildSequence(9, 'minor', 5, 2, false);
  assert.equal(sequence.length, 50);
  assert.deepEqual(
    sequence.slice(0, 10).map((note) => note.name),
    ['A', 'A', 'C', 'C', 'D', 'D', 'E', 'E', 'G', 'G']
  );
  assert.deepEqual(
    sequence.slice(10, 20).map((note) => note.name),
    ['A', 'A', 'C', 'C', 'D', 'D', 'E', 'E', 'G', 'G']
  );
  assert.equal(sequence[9].run, 1);
  assert.equal(sequence[10].run, 2);
});

test('Rückwärts-Option hängt eine absteigende Tonfolge an', () => {
  const sequence = buildSequence(9, 'minor', 5, 1, true);
  assert.equal(sequence.length, 30);
  const backward = sequence.filter((note) => note.run === 6);
  assert.deepEqual(backward.map((note) => note.name), ['G', 'E', 'D', 'C', 'A']);
  assert.deepEqual(backward.map((note) => note.direction), ['down', 'down', 'down', 'down', 'down']);
  assert.ok(sequence.slice(0, 25).every((note) => note.direction === 'up'));
});

test('Ungültige Parameter werden auf sinnvolle Grenzen begrenzt', () => {
  assert.equal(buildSequence(9, 'minor', 0, 0, false).length, 5);
  assert.equal(buildSequence(9, 'minor', 99, 99, false).length, 12 * 5 * 8);
  assert.equal(buildSequence(9, 'minor', 'x', 1, false).length, PENTATONIC_RUNS * 5);
  assert.equal(buildSequence(9, 'minor', 2, 1, false).length, 10);
});

test('Vorspiel-Frequenzen liegen in der richtigen Oktave', () => {
  const aMinor = scaleFrequencies(9, 'minor');
  assert.equal(aMinor.length, 5);
  assert.ok(Math.abs(aMinor[0] - 110) < 0.001); // A2
  assert.ok(Math.abs(aMinor[1] - 130.8128) < 0.01); // C3
  assert.ok(Math.abs(aMinor[2] - 146.8324) < 0.01); // D3
  assert.ok(Math.abs(aMinor[3] - 164.8138) < 0.01); // E3
  assert.ok(Math.abs(aMinor[4] - 195.9977) < 0.01); // G3

  const cMajor = scaleFrequencies(0, 'major');
  assert.ok(Math.abs(cMajor[0] - 130.8128) < 0.01); // C3
  assert.ok(Math.abs(cMajor[4] - 220) < 0.01); // A3
  assert.ok(Math.abs(scaleFrequencies(4, 'minor')[0] - 164.8138) < 0.01); // E3
});

test('Griffbrettpositionen liegen nur auf Skalentönen', () => {
  const positions = buildPositions(9, 'minor', 12);
  const allowed = new Set(scalePitchClasses(9, 'minor'));
  assert.ok(positions.length > 15);
  positions.forEach((position) => {
    assert.ok(position.fret >= 0 && position.fret <= 12);
    assert.ok(position.stringIndex >= 0 && position.stringIndex < 6);
    assert.ok(allowed.has(position.pc));
    assert.equal(position.name, ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][position.pc]);
  });

  const lowEOpen = positions.find((position) => position.stringIndex === 0 && position.fret === 0);
  assert.equal(lowEOpen.name, 'E');
  assert.equal(lowEOpen.isRoot, false);

  const aOnLowE = positions.find((position) => position.stringIndex === 0 && position.fret === 5);
  assert.equal(aOnLowE.name, 'A');
  assert.equal(aOnLowE.isRoot, true);
});

test('SVG enthält alle Töne, Bundnummern und Saiten', () => {
  const svg = renderPentatonicFretboard(9, 'minor');
  assert.match(svg, /role="img"/);
  assert.match(svg, /A-Moll-Pentatonik/);
  assert.match(svg, /class="fretboard scale-fretboard"/);
  assert.ok((svg.match(/class="scale-dot/g) || []).length > 10);
  assert.ok((svg.match(/class="scale-open/g) || []).length >= 1);
  assert.ok((svg.match(/class="fb-fretnum"/g) || []).length === 12);
  assert.ok((svg.match(/class="fb-stringname"/g) || []).length === 6);
  assert.match(svg, /data-pc="9"/);
  assert.match(svg, /is-root/);
  assert.doesNotMatch(svg, /undefined|NaN/);
});
