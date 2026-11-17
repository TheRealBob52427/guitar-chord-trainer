'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CAGED_SHAPES,
  buildCagedShapes,
  shapePitchClasses,
  rootFretOnString,
  visibleRange
} = require('../app/js/caged.js');

test('CAGED enthält die fünf Formen in der Reihenfolge C A G E D', () => {
  assert.deepEqual(CAGED_SHAPES.map((shape) => shape.id), ['C', 'A', 'G', 'E', 'D']);
});

test('Offene Formen entsprechen den bekannten Dur-Akkorden', () => {
  const roots = { C: 0, A: 9, G: 7, E: 4, D: 2 };
  buildCagedShapes(0).forEach((shape) => {
    const expected = CAGED_SHAPES.find((item) => item.id === shape.id);
    if (roots[shape.id] === 0) {
      assert.deepEqual(shape.frets, expected.frets, `${shape.id}-Form bei C`);
    }
  });

  const eAtE = buildCagedShapes(4).find((shape) => shape.id === 'E');
  assert.deepEqual(eAtE.frets, [0, 2, 2, 1, 0, 0]);

  const aAtA = buildCagedShapes(9).find((shape) => shape.id === 'A');
  assert.deepEqual(aAtA.frets, [-1, 0, 2, 2, 2, 0]);

  const dAtD = buildCagedShapes(2).find((shape) => shape.id === 'D');
  assert.deepEqual(dAtD.frets, [-1, -1, 0, 2, 3, 2]);
});

test('Jede Form enthält für jeden Grundton genau die drei Dur-Akkordtöne', () => {
  for (let rootPc = 0; rootPc < 12; rootPc += 1) {
    const expected = [rootPc, (rootPc + 4) % 12, (rootPc + 7) % 12].sort((a, b) => a - b);
    buildCagedShapes(rootPc).forEach((shape) => {
      assert.deepEqual(
        shapePitchClasses(shape),
        expected,
        `${shape.name} für Pitch-Class ${rootPc}: ${shape.frets.join(',')}`
      );
      assert.equal(shape.pitchClasses.length, 3);
      assert.ok(shape.frets.every((fret) => fret <= 24));
      assert.ok(shape.rootFret >= 0 && shape.rootFret <= 24);
    });
  }
});

test('Formen werden chromatisch verschoben', () => {
  const fShape = buildCagedShapes(5).find((shape) => shape.id === 'E');
  assert.deepEqual(fShape.frets, [1, 3, 3, 2, 1, 1]);
  assert.equal(fShape.rootFret, 1);

  const aShapeAtC = buildCagedShapes(0).find((shape) => shape.id === 'A');
  assert.deepEqual(aShapeAtC.frets, [-1, 3, 5, 5, 5, 3]);
  assert.equal(aShapeAtC.rootDescription, 'A-Saite, 3. Bund');

  // Tiefe Grundtöne rutschen nicht vor den Sattel, sondern eine Oktave hoch.
  const cShapeAtA = buildCagedShapes(9).find((shape) => shape.id === 'C');
  assert.ok(cShapeAtA.frets.filter((fret) => fret > 0).every((fret) => fret >= 9));
  assert.equal(cShapeAtA.rootFret, 12);
});

test('Grundton-Bund auf jeder Referenzsaite', () => {
  assert.equal(rootFretOnString(0, 1), 3); // C auf A-Saite
  assert.equal(rootFretOnString(9, 1), 0); // A auf A-Saite
  assert.equal(rootFretOnString(4, 0), 0); // E auf tiefer E
  assert.equal(rootFretOnString(7, 0), 3); // G auf tiefer E
  assert.equal(rootFretOnString(2, 2), 0); // D auf D-Saite
});

test('Sichtbarer Bundbereich zeigt hohe Lagen ab dem richtigen Bund', () => {
  const aShape = buildCagedShapes(9).find((shape) => shape.id === 'A');
  assert.deepEqual(visibleRange(aShape), { startFret: 1, fretCount: 5 });

  const cShape = buildCagedShapes(9).find((shape) => shape.id === 'C');
  assert.deepEqual(visibleRange(cShape), { startFret: 8, fretCount: 5 });
});
