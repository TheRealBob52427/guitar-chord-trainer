'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CHORDS } = require('../app/js/chords.js');
const { SONGS, getSong, songLabel } = require('../app/js/songs.js');
const { renderFretboard } = require('../app/js/fretboard.js');

test('Song-Bibliothek enthält Wonderwall und When I Come Around', () => {
  assert.ok(SONGS.length >= 2);
  const wonderwall = getSong('wonderwall');
  assert.equal(wonderwall.title, 'Wonderwall');
  assert.equal(wonderwall.artist, 'Oasis');
  assert.equal(wonderwall.bpm, 87);
  assert.equal(wonderwall.timeSignature, '4/4');
  assert.equal(wonderwall.bars.length, 8);
  assert.equal(songLabel(wonderwall), 'Wonderwall · Oasis');

  const greenDay = getSong('when-i-come-around');
  assert.equal(greenDay.title, 'When I Come Around');
  assert.equal(greenDay.artist, 'Green Day');
  assert.equal(greenDay.bpm, 98);
  assert.equal(greenDay.practiceCapo, 0);
  assert.equal(greenDay.bars.length, 8);
  assert.deepEqual(greenDay.bars, wonderwall.bars);
  assert.deepEqual(greenDay.chordOrder, wonderwall.chordOrder);
});

test('Wonderwall-Strophenloop nutzt acht Takte und vier Akkorde', () => {
  const song = getSong('wonderwall');
  assert.deepEqual(song.bars, [
    'Em7', 'G', 'Dsus4', 'A7sus4',
    'Em7', 'G', 'Dsus4', 'A7sus4'
  ]);
  assert.deepEqual(song.chordOrder, ['Em7', 'G', 'Dsus4', 'A7sus4']);
  song.bars.forEach((chordId) => {
    assert.ok(CHORDS[chordId], `Akkord ${chordId} fehlt`);
    assert.ok(CHORDS[chordId].pitchClasses.length >= 3);
  });
});

test('A7sus4 ist vollständig definiert', () => {
  const chord = CHORDS.A7sus4;
  assert.ok(chord);
  assert.deepEqual(chord.strings, [-1, 0, 2, 0, 3, 0]);
  assert.deepEqual(chord.frets, chord.strings);
  assert.deepEqual(chord.pitchClasses, [9, 4, 7, 2]); // A E G D
  assert.deepEqual(chord.fingers, [0, 0, 1, 0, 3, 0]);

  const svg = renderFretboard(chord);
  assert.equal((svg.match(/class="fb-dot"/g) || []).length, 2);
  assert.equal((svg.match(/class="fb-open"/g) || []).length, 3);
  assert.equal((svg.match(/class="fb-muted"/g) || []).length, 1);
});

test('Song-Matcher erkennt A7sus4', () => {
  const { ChordMatcher } = require('../app/js/detection.js');
  const chroma = new Float32Array(12);
  [9, 4, 7, 2].forEach((pc) => { chroma[pc] = 1; });
  const magnitude = Math.sqrt(4);
  for (let i = 0; i < 12; i += 1) chroma[i] /= magnitude;

  const matcher = new ChordMatcher(['Em7', 'G', 'Dsus4', 'A7sus4'], CHORDS);
  const result = matcher.update(chroma, false);
  assert.equal(result.bestId, 'A7sus4');
  assert.ok(result.bestScore > 0.82);
});

test('Der Trainer enthält alle Song-Akkorde', () => {
  const { CHORD_ORDER } = require('../app/js/chords.js');
  assert.deepEqual(CHORD_ORDER, ['G', 'Cadd9', 'Em7', 'Dsus4', 'A7sus4']);
  ['Em7', 'G', 'Dsus4', 'A7sus4'].forEach((id) => {
    assert.ok(CHORD_ORDER.includes(id), `Trainer fehlt ${id}`);
  });
});
