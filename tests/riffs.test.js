'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RIFFS,
  getRiff,
  riffLabel,
  riffPositions,
  riffFrequencies,
  displayedFrets,
  stringDescription,
  renderRiffFretboard
} = require('../app/js/riffs.js');

test('Riff-Bibliothek enthält Seven Nation Army und Californication', () => {
  assert.equal(RIFFS.length, 2);
  const sna = getRiff('seven-nation-army');
  assert.equal(sna.title, 'Seven Nation Army');
  assert.equal(sna.artist, 'The White Stripes');
  assert.equal(sna.bpm, 124);
  assert.equal(sna.notes.length, 7);
  assert.equal(riffLabel(sna), 'Seven Nation Army · The White Stripes');

  const cali = getRiff('californication');
  assert.equal(cali.title, 'Californication');
  assert.equal(cali.artist, 'Red Hot Chili Peppers');
  assert.equal(cali.bpm, 96);
  assert.equal(cali.notes.length, 32);
});

test('Seven-Nation-Army-Riff hat die erwarteten Töne und Lagen', () => {
  const riff = getRiff('seven-nation-army');
  assert.deepEqual(riff.notes.map((note) => note.label),
    ['E2', 'E2', 'G2', 'E2', 'D3', 'C3', 'B2']);
  assert.deepEqual(riff.notes.map((note) => [note.string, note.fret]),
    [[0, 0], [0, 0], [0, 3], [0, 0], [0, 10], [0, 8], [0, 7]]);
  assert.equal(riff.notes[4].pc, 2);
  assert.equal(riff.notes[5].pc, 0);
  assert.equal(riffPositions(riff).length, 5);
});

test('Californication ist das Am/F-Intro-Arpeggio über vier Takte', () => {
  const riff = getRiff('californication');
  const labels = riff.notes.map((note) => note.label);
  assert.deepEqual(labels.slice(0, 8), ['A2', 'E3', 'A3', 'C4', 'E4', 'C4', 'A3', 'E3']);
  assert.deepEqual(labels.slice(8, 16), ['C3', 'F3', 'A3', 'C4', 'F4', 'C4', 'A3', 'F3']);
  assert.deepEqual(labels.slice(16), labels.slice(0, 16));
  assert.deepEqual([...new Set(riff.notes.map((note) => note.section))], ['Am', 'F']);
  assert.equal(riffPositions(riff).length, 8);
});

test('Frequenzen und Positionsbeschreibungen passen zu den Noten', () => {
  const riff = getRiff('seven-nation-army');
  const frequencies = riffFrequencies(riff);
  assert.equal(frequencies.length, riff.notes.length);
  // A4 = 440 Hz; E2 ist 29 Halbtöne tiefer.
  assert.ok(Math.abs(frequencies[0] - 82.4069) < 0.01);
  assert.equal(stringDescription(riff.notes[0]), 'tiefe E-Saite, offen');
  assert.equal(stringDescription(riff.notes[4]), 'tiefe E-Saite, 10. Bund');
});

test('Unbekannte Riff-ID fällt auf das erste Riff zurück', () => {
  assert.equal(getRiff('gibt-es-nicht').id, RIFFS[0].id);
});

test('Griffbrett zeigt nur die benötigten Bünde', () => {
  assert.equal(displayedFrets(getRiff('seven-nation-army')), 10);
  assert.equal(displayedFrets(getRiff('californication')), 5);
});

test('Griffbrett-SVG enthält alle Positionen und markiert den Zielton', () => {
  const riff = getRiff('californication');
  const svg = renderRiffFretboard(riff, 0);
  assert.match(svg, /<svg/);
  assert.match(svg, /riff-fretboard/);
  assert.equal((svg.match(/data-pos=/g) || []).length, riffPositions(riff).length);
  assert.equal((svg.match(/is-target/g) || []).length, 1);
  assert.match(svg, /A2/);
  assert.match(svg, /data-pos="5-1"/);

  const finished = renderRiffFretboard(riff, null);
  assert.equal((finished.match(/is-target/g) || []).length, 0);
  assert.equal(renderRiffFretboard(null, 0), '');
});
