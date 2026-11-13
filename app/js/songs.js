/**
 * Song-Bibliothek für den Nachspiel-Modus.
 *
 * Enthält nur Akkordfolgen und Timing – keine Lyrics, Melodien oder
 * Originalaufnahmen. Die Übungsversion von Wonderwall nutzt die offenen
 * Akkordformen ohne Capo; das Original wird mit Capo 2 gespielt.
 */
(function (global) {
  'use strict';

  const SONGS = [
    {
      id: 'wonderwall',
      title: 'Wonderwall',
      artist: 'Oasis',
      bpm: 87,
      timeSignature: '4/4',
      section: 'Strophe',
      originalCapo: 2,
      practiceCapo: 0,
      difficulty: 'Anfänger',
      description: 'Acht Takte Strophen-Loop: Em7 – G – Dsus4 – A7sus4, zweimal. Übungsversion ohne Capo.',
      chordOrder: ['Em7', 'G', 'Dsus4', 'A7sus4'],
      bars: [
        'Em7', 'G', 'Dsus4', 'A7sus4',
        'Em7', 'G', 'Dsus4', 'A7sus4'
      ]
    },
    {
      id: 'when-i-come-around',
      title: 'When I Come Around',
      artist: 'Green Day',
      bpm: 98,
      timeSignature: '4/4',
      section: 'Strophe',
      originalCapo: 0,
      practiceCapo: 0,
      difficulty: 'Anfänger',
      description: 'Strophe, auf die Akkordfolge Em7 – G – Dsus4 – A7sus4 verschoben: acht Takte, ohne Capo.',
      chordOrder: ['Em7', 'G', 'Dsus4', 'A7sus4'],
      bars: [
        'Em7', 'G', 'Dsus4', 'A7sus4',
        'Em7', 'G', 'Dsus4', 'A7sus4'
      ]
    }
  ];

  function getSong(id) {
    return SONGS.find((song) => song.id === id) || SONGS[0];
  }

  function songLabel(song) {
    return `${song.title} · ${song.artist}`;
  }

  const api = { SONGS, getSong, songLabel };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
