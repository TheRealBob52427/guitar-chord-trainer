'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CHORDS, CHORD_ORDER, buildTemplate, chordTemplates } = require('../app/js/chords.js');
const { renderFretboard, describeChord } = require('../app/js/fretboard.js');

function count(svg, needle) {
  return svg.split(needle).length - 1;
}

test('G-Dur-Diagramm: 3 Punkte, 3 offene Saiten, 5 Bünde, 6 Saiten', () => {
  const svg = renderFretboard(CHORDS.G);
  assert.equal(count(svg, 'class="fb-dot"'), 3);
  assert.equal(count(svg, 'class="fb-open"'), 3);
  assert.equal(count(svg, 'class="fb-muted"'), 0);
  assert.equal(count(svg, 'class="fb-fretnum"'), 5);
  assert.equal(count(svg, 'class="fb-stringname"'), 6);
  assert.equal(count(svg, 'class="fb-fret"'), 5);
  assert.match(svg, /aria-label="G-Dur/);
  assert.doesNotMatch(svg, /undefined|NaN/);
});

test('Cadd9-Diagramm: 4 Punkte, 1 offene, 1 gedämpfte Saite', () => {
  const svg = renderFretboard(CHORDS.Cadd9);
  assert.equal(count(svg, 'class="fb-dot"'), 4);
  assert.equal(count(svg, 'class="fb-open"'), 1);
  assert.equal(count(svg, 'class="fb-muted"'), 1);
  assert.match(svg, /M43 49 L53 59/);
});

test('Em7-Diagramm: 3 Punkte, 3 offene Saiten, keine gedämpfte', () => {
  const svg = renderFretboard(CHORDS.Em7);
  assert.equal(count(svg, 'class="fb-dot"'), 3);
  assert.equal(count(svg, 'class="fb-open"'), 3);
  assert.equal(count(svg, 'class="fb-muted"'), 0);
});

test('Dsus4-Diagramm: 3 Punkte, 1 offene, 2 gedämpfte Saiten', () => {
  const svg = renderFretboard(CHORDS.Dsus4);
  assert.equal(count(svg, 'class="fb-dot"'), 3);
  assert.equal(count(svg, 'class="fb-open"'), 1);
  assert.equal(count(svg, 'class="fb-muted"'), 2);
});

test('Fingernummern liegen im Bereich 1-4 und passen zu den gegriffenen Saiten', () => {
  CHORD_ORDER.forEach((id) => {
    const chord = CHORDS[id];
    const svg = renderFretboard(chord);
    chord.frets.forEach((fret, index) => {
      if (fret <= 0) return;
      const finger = chord.fingers[index];
      assert.ok(finger >= 1 && finger <= 4, `${id}: Finger ${finger} ungültig`);
      assert.match(svg, new RegExp(`>${finger}</text>`), `${id}: Finger ${finger} fehlt im SVG`);
    });
  });
});

test('Aria-Beschreibung nennt alle sechs Saiten', () => {
  const text = describeChord(CHORDS.G);
  assert.match(text, /tiefe E 3\. Bund/);
  assert.match(text, /A 2\. Bund/);
  assert.match(text, /D offen/);
  assert.match(text, /G offen/);
  assert.match(text, /B offen/);
  assert.match(text, /hohe E 3\. Bund/);
});

test('Templates sind normalisiert und enthalten die Akkordtöne', () => {
  const templates = chordTemplates();
  CHORD_ORDER.forEach((id) => {
    const template = templates[id];
    let norm = 0;
    for (let i = 0; i < 12; i += 1) norm += template[i] * template[i];
    assert.ok(Math.abs(norm - 1) < 1e-6, `${id} ist nicht normalisiert`);
    CHORDS[id].pitchClasses.forEach((pc) => {
      assert.ok(template[pc] > 0, `${id}: Pitch-Class ${pc} fehlt`);
    });
  });
  const manual = buildTemplate([7, 11, 2]);
  assert.equal(manual[7], templates.G[7]);
});
