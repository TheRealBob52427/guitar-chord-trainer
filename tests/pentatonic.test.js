'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  scalePitchClasses,
  scaleLabel,
  buildSequence,
  buildPositions,
  renderPentatonicFretboard
} = require('../app/js/pentatonic.js');

test('Moll- und Dur-Pentatonik haben die richtigen Stufen', () => {
  assert.deepEqual(scalePitchClasses(9, 'minor'), [9, 0, 2, 4, 7]); // A C D E G
  assert.deepEqual(scalePitchClasses(0, 'major'), [0, 2, 4, 7, 9]); // C D E G A
  assert.deepEqual(scalePitchClasses(4, 'minor'), [4, 7, 9, 11, 2]); // E G A B D
  assert.deepEqual(scalePitchClasses(11, 'major'), [11, 1, 3, 6, 8]); // B C# D# F# G#
});

test('Skalenname wird deutsch formatiert', () => {
  assert.equal(scaleLabel(9, 'minor'), 'A-Moll-Pentatonik');
  assert.equal(scaleLabel(0, 'major'), 'C-Dur-Pentatonik');
  assert.equal(scaleLabel(6, 'minor'), 'F#-Moll-Pentatonik');
  assert.equal(scaleLabel(9, 'unbekannt'), 'A-Moll-Pentatonik');
});

test('Übungsfolge wiederholt jeden Ton und verlängert über Oktaven', () => {
  assert.deepEqual(
    buildSequence(9, 'minor', 6, 2).map((note) => note.name),
    ['A', 'A', 'C', 'C', 'D', 'D']
  );
  assert.deepEqual(
    buildSequence(9, 'minor', 15, 2).map((note) => note.name),
    ['A', 'A', 'C', 'C', 'D', 'D', 'E', 'E', 'G', 'G', 'A', 'A', 'C', 'C', 'D']
  );
  assert.equal(buildSequence(9, 'minor', 40, 1).length, 40);
  assert.equal(buildSequence(9, 'minor', 5, 4)[4].name, 'C');
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
