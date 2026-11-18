'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RIFFS,
  getRiff,
  riffLabel,
  riffPositions,
  riffFrequencies,
  riffPlaybackFrequencies,
  displayedFrets,
  stringDescription,
  renderRiffFretboard
} = require('../app/js/riffs.js');

test('Riff-Bibliothek enthält Seven Nation Army und Californication', () => {
  assert.equal(RIFFS.length, 2);
  const sna = getRiff('seven-nation-army');
  assert.equal(sna.title, 'Seven Nation Army');
  assert.equal(sna.artist, 'The White Stripes');
  assert.equal(sna.bpm, 120);
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
    ['E3', 'E3', 'G3', 'E3', 'D3', 'C3', 'B2']);
  assert.deepEqual(riff.notes.map((note) => [note.string, note.fret]),
    [[1, 7], [1, 7], [1, 10], [1, 7], [1, 5], [1, 3], [1, 2]]);
  assert.equal(riff.notes[4].pc, 2);
  assert.equal(riff.notes[5].pc, 0);
  assert.equal(riffPositions(riff).length, 5);
  assert.equal(riff.notes.reduce((sum, note) => sum + note.beats, 0), 4);
  assert.equal(riff.previewOctave, -1);
});

test('Californication ist das Am/F-Intro-Arpeggio über vier Takte', () => {
  const riff = getRiff('californication');
  const labels = riff.notes.map((note) => note.label);
  assert.deepEqual(labels.slice(0, 8), ['A2', 'E3', 'A3', 'C4', 'E4', 'C4', 'A3', 'E3']);
  assert.deepEqual(labels.slice(8, 16), ['F2', 'C3', 'F3', 'A3', 'C4', 'A3', 'F3', 'C3']);
  assert.deepEqual(labels.slice(16), labels.slice(0, 16));
  assert.deepEqual([...new Set(riff.notes.map((note) => note.section))], ['Am', 'F']);
  assert.equal(riffPositions(riff).length, 8);
  assert.ok(riff.notes.every((note) => note.beats === 0.5));
});

test('Frequenzen und Positionsbeschreibungen passen zu den Noten', () => {
  const riff = getRiff('seven-nation-army');
  const frequencies = riffFrequencies(riff);
  assert.equal(frequencies.length, riff.notes.length);
  assert.ok(Math.abs(frequencies[0] - 164.8138) < 0.01); // E3 auf der A-Saite
  assert.equal(stringDescription(riff.notes[0]), 'A-Saite, 7. Bund');
  assert.equal(stringDescription(riff.notes[4]), 'A-Saite, 5. Bund');

  // Das Original klingt eine Oktave tiefer (Whammy-Pedal).
  const playback = riffPlaybackFrequencies(riff);
  assert.ok(Math.abs(playback[0] - 82.4069) < 0.01);
  assert.ok(Math.abs(playback[6] - 61.7354) < 0.01); // B1
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
  assert.match(svg, /data-pos="0-1"/);
  assert.match(svg, /data-pos="5-0"/);

  const finished = renderRiffFretboard(riff, null);
  assert.equal((finished.match(/is-target/g) || []).length, 0);
  assert.equal(renderRiffFretboard(null, 0), '');
});
