'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PENTATONIC_RUNS,
  PENTATONIC_PATTERNS,
  scalePitchClasses,
  scaleLabel,
  scaleFrequencies,
  buildSequence,
  buildPositions,
  patternFretRange,
  buildPatternPositions,
  buildPatternSequence,
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

test('Fünf Pattern mit je zwei Tönen pro Saite', () => {
  assert.equal(PENTATONIC_PATTERNS.length, 5);
  PENTATONIC_PATTERNS.forEach((pattern) => {
    assert.equal(pattern.frets.length, 6);
    pattern.frets.forEach((frets) => assert.equal(frets.length, 2));
    assert.equal(pattern.frets.flat().length, 12);
  });
});

test('Pattern 1–5 der A-Moll-Pentatonik liegen in den erwarteten Bünden', () => {
  const ranges = [1, 2, 3, 4, 5].map((id) => patternFretRange(9, 'minor', id));
  assert.deepEqual(
    ranges.map((range) => [range.firstFret, range.lastFret]),
    [[5, 8], [7, 10], [9, 13], [12, 15], [2, 5]]
  );

  [1, 2, 3, 4, 5].forEach((id) => {
    const positions = buildPatternPositions(9, 'minor', id);
    const allowed = new Set(scalePitchClasses(9, 'minor'));
    assert.equal(positions.length, 12);
    assert.equal(new Set(positions.map((position) => `${position.stringIndex}-${position.fret}`)).size, 12);
    positions.forEach((position) => {
      assert.ok(allowed.has(position.pc), `Pattern ${id}: ${position.name} gehört nicht zur Skala`);
      assert.ok(position.fret >= ranges[id - 1].firstFret);
      assert.ok(position.fret <= ranges[id - 1].lastFret);
    });
  });

  // Pattern 3 hat den weiten Griff C auf der B-Saite (10 -> 13).
  const pattern3 = buildPatternPositions(9, 'minor', 3);
  assert.ok(pattern3.some((position) => position.stringIndex === 4 && position.fret === 13));
});

test('Pattern werden für andere Grundtöne chromatisch verschoben', () => {
  const eMinor = buildPatternPositions(4, 'minor', 1);
  assert.deepEqual([...new Set(eMinor.map((position) => position.name))].sort(), ['A', 'B', 'D', 'E', 'G']);
  assert.equal(patternFretRange(4, 'minor', 1).firstFret, 0);

  const cMajor = buildPatternPositions(0, 'major', 1);
  const allowed = new Set(scalePitchClasses(0, 'major'));
  assert.ok(cMajor.every((position) => allowed.has(position.pc)));
  assert.ok(cMajor.some((position) => position.isRoot && position.name === 'C'));
  assert.equal(patternFretRange(0, 'major', 1).firstFret, 5);

  const gMajor = buildPatternPositions(7, 'major', 1);
  const gAllowed = new Set(scalePitchClasses(7, 'major'));
  assert.ok(gMajor.every((position) => gAllowed.has(position.pc)));
  assert.equal(patternFretRange(7, 'major', 1).firstFret, 0);
});

test('Pattern-Übungsfolge enthält alle 12 Töne und läuft auf- und abwärts', () => {
  const sequence = buildPatternSequence(9, 'minor', 1, 1, 1, false);
  assert.equal(sequence.length, 12);
  assert.deepEqual(
    sequence.map((note) => note.name),
    ['A', 'C', 'D', 'E', 'G', 'A', 'C', 'D', 'E', 'G', 'A', 'C']
  );
  assert.ok(sequence.every((note) => note.direction === 'up'));
  assert.ok(sequence.every((note) => Number.isInteger(note.stringIndex) && Number.isInteger(note.fret)));

  const repeated = buildPatternSequence(9, 'minor', 1, 2, 1, true);
  assert.equal(repeated.length, 2 * 12 + 12);
  assert.deepEqual(
    repeated.slice(-12).map((note) => note.name),
    ['C', 'A', 'G', 'E', 'D', 'C', 'A', 'G', 'E', 'D', 'C', 'A']
  );
  assert.equal(buildPatternSequence(9, 'minor', 1, 1, 2, false).length, 24);
});

test('Pattern-SVG zeigt ausschließlich das ausgewählte Pattern', () => {
  const svg = renderPentatonicFretboard(9, 'minor', { pattern: 2 });
  assert.match(svg, /data-pattern="2"/);
  assert.match(svg, /Pattern 2/);
  assert.match(svg, /Bünde 7 bis 10/);
  assert.equal((svg.match(/class="scale-dot/g) || []).length, 12);
  assert.equal((svg.match(/class="scale-open/g) || []).length, 0);
  assert.equal((svg.match(/class="fb-fretnum"/g) || []).length, 4);
  assert.equal((svg.match(/class="fb-stringname"/g) || []).length, 6);
  // Töne aus Pattern 1 (z. B. tiefe E-Saite 5. Bund) dürfen nicht auftauchen.
  assert.doesNotMatch(svg, /data-pos="0-5"/);
  assert.match(svg, /data-pos="0-8"/);
  assert.doesNotMatch(svg, /undefined|NaN/);
});
