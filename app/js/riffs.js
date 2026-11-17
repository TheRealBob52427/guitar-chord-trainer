/**
 * Riff-Bibliothek für den Einzelnoten-Modus.
 *
 * Jedes Riff ist eine geordnete Folge von Einzelnoten (Saite + Bund). Die
 * Notennamen, MIDI-Nummern und Frequenzen werden beim Laden abgeleitet.
 *
 * Saiten-Reihenfolge wie im Rest der App: tiefe E, A, D, G, B, hohe E.
 * Keine Texte, Melodien oder Aufnahmen – nur Notenpositionen.
 */
(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const RIFF_STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
  const STRING_DESCRIPTIONS = ['tiefe E-Saite', 'A-Saite', 'D-Saite', 'G-Saite', 'B-Saite', 'hohe E-Saite'];
  const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];

  const STRING_X = [48, 78, 108, 138, 168, 198];
  const NUT_Y = 62;
  const FRET_HEIGHT = 24;
  const FRETS = 12;
  const WIDTH = 228;
  const NUT_X1 = 40;
  const NUT_X2 = 206;

  function normalizePc(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  function makeNote(position, index) {
    const string = Number(position.string);
    const fret = Number(position.fret);
    const midi = OPEN_STRING_MIDI[string] + fret;
    const pc = normalizePc(midi);
    return {
      index,
      string,
      fret,
      midi,
      pc,
      name: NOTE_NAMES[pc],
      octave: Math.floor(midi / 12) - 1,
      label: `${NOTE_NAMES[pc]}${Math.floor(midi / 12) - 1}`,
      frequency: 440 * Math.pow(2, (midi - 69) / 12),
      section: position.section || ''
    };
  }

  /** Griffmuster des Californication-Intros: 1–5–8–10–12–10–8–5 (Saiten 1–5). */
  const AM_ARPEGGIO = [
    [1, 0], // A2
    [2, 2], // E3
    [3, 2], // A3
    [4, 1], // C4
    [5, 0], // E4
    [4, 1], // C4
    [3, 2], // A3
    [2, 2]  // E3
  ];

  const F_ARPEGGIO = [
    [1, 3], // C3
    [2, 3], // F3
    [3, 2], // A3
    [4, 1], // C4
    [5, 1], // F4
    [4, 1], // C4
    [3, 2], // A3
    [2, 3]  // F3
  ];

  function arpeggio(pattern, section) {
    return pattern.map(([string, fret]) => ({ string, fret, section }));
  }

  const RIFF_DEFINITIONS = [
    {
      id: 'seven-nation-army',
      title: 'Seven Nation Army',
      artist: 'The White Stripes',
      bpm: 124,
      timeSignature: '4/4',
      difficulty: 'Anfänger',
      rootPc: 4, // E
      description: 'Der Haupt-Riff als sieben Einzelnoten auf der tiefen E-Saite. ' +
        'Auf der Aufnahme klingt das Riff eine Oktave tiefer (Whammy-Pedal) – ' +
        'diese Lage trifft dieselben Töne ohne Effektgerät.',
      notes: [
        { string: 0, fret: 0, section: 'Riff' },  // E2
        { string: 0, fret: 0, section: 'Riff' },  // E2
        { string: 0, fret: 3, section: 'Riff' },  // G2
        { string: 0, fret: 0, section: 'Riff' },  // E2
        { string: 0, fret: 10, section: 'Riff' }, // D3
        { string: 0, fret: 8, section: 'Riff' },  // C3
        { string: 0, fret: 7, section: 'Riff' }   // B2
      ]
    },
    {
      id: 'californication',
      title: 'Californication',
      artist: 'Red Hot Chili Peppers',
      bpm: 96,
      timeSignature: '4/4',
      difficulty: 'Anfänger',
      rootPc: 9, // A
      description: 'Das Arpeggio aus Intro und Refrain: A-Moll und F-Dur im ' +
        'Wechsel, je acht Achtelnoten. 32 Einzelnoten über vier Takte, alle ' +
        'im offenen Lagebereich bis zum 3. Bund.',
      notes: [
        ...arpeggio(AM_ARPEGGIO, 'Am'),
        ...arpeggio(F_ARPEGGIO, 'F'),
        ...arpeggio(AM_ARPEGGIO, 'Am'),
        ...arpeggio(F_ARPEGGIO, 'F')
      ]
    }
  ];

  const RIFFS = RIFF_DEFINITIONS.map((riff) => ({
    ...riff,
    notes: riff.notes.map((note, index) => makeNote(note, index))
  }));

  function getRiff(id) {
    return RIFFS.find((riff) => riff.id === id) || RIFFS[0];
  }

  function riffLabel(riff) {
    return `${riff.title} · ${riff.artist}`;
  }

  function stringDescription(note) {
    return `${STRING_DESCRIPTIONS[note.string]}, ${note.fret ? `${note.fret}. Bund` : 'offen'}`;
  }

  /** Eindeutige Griffbrett-Positionen eines Riffs, in Spielreihenfolge. */
  function riffPositions(riff) {
    const seen = new Set();
    const positions = [];
    riff.notes.forEach((note) => {
      const key = `${note.string}-${note.fret}`;
      if (seen.has(key)) return;
      seen.add(key);
      positions.push(note);
    });
    return positions;
  }

  function riffFrequencies(riff) {
    return riff.notes.map((note) => note.frequency);
  }

  /** Sichtbare Bünde: so viele wie nötig, mindestens fünf, höchstens zwölf. */
  function displayedFrets(riff) {
    const maxFret = riff.notes.reduce((max, note) => Math.max(max, note.fret), 0);
    return Math.max(5, Math.min(FRETS, maxFret));
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Griffbrett-SVG mit allen Positionen des Riffs. Der aktuell erwartete Ton
   * wird hervorgehoben, Grundtöne sind farblich markiert.
   *
   * @param {Object} riff
   * @param {number|null} activeIndex Index im Riff oder null
   */
  function renderRiffFretboard(riff, activeIndex) {
    if (!riff) return '';
    const positions = riffPositions(riff);
    const frets = displayedFrets(riff);
    const height = NUT_Y + frets * FRET_HEIGHT + 34;
    const active = Number.isInteger(activeIndex) && activeIndex >= 0
      ? riff.notes[activeIndex]
      : null;
    const label = `${riff.title}: ${positions.length} Positionen über ${frets} Bünde` +
      (active ? `, Zielton ${active.label} auf der ${STRING_DESCRIPTIONS[active.string]}, ${active.fret}. Bund` : '') + '.';

    let svg = `<svg class="fretboard scale-fretboard riff-fretboard" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(label)}" focusable="false">`;
    svg += `<rect class="fb-board" x="${NUT_X1}" y="${NUT_Y}" width="${NUT_X2 - NUT_X1}" height="${frets * FRET_HEIGHT}" rx="5" />`;

    [3, 5, 7, 9, 12].filter((fret) => fret <= frets).forEach((fret) => {
      const y = NUT_Y + FRET_HEIGHT * (fret - 0.5);
      const x = (STRING_X[2] + STRING_X[3]) / 2;
      svg += `<circle class="fb-inlay" cx="${x}" cy="${y}" r="2" />`;
    });

    for (let fret = 1; fret <= frets; fret += 1) {
      const y = NUT_Y + fret * FRET_HEIGHT;
      svg += `<line class="fb-fret" x1="${NUT_X1}" y1="${y}" x2="${NUT_X2}" y2="${y}" />`;
    }
    svg += `<line class="fb-nut" x1="${NUT_X1}" y1="${NUT_Y}" x2="${NUT_X2}" y2="${NUT_Y}" />`;

    STRING_X.forEach((x, index) => {
      const width = (3.6 - index * 0.44).toFixed(2);
      svg += `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${NUT_Y + frets * FRET_HEIGHT}" stroke-width="${width}" stroke-linecap="round" />`;
    });

    for (let fret = 1; fret <= frets; fret += 1) {
      const y = NUT_Y + FRET_HEIGHT * (fret - 0.5) + 2.8;
      svg += `<text class="fb-fretnum" x="32" y="${y}" text-anchor="end">${fret}</text>`;
    }

    positions.forEach((note) => {
      const x = STRING_X[note.string];
      const isRoot = note.pc === normalizePc(riff.rootPc);
      const isTarget = Boolean(active && active.string === note.string && active.fret === note.fret);
      const classes = [
        note.fret === 0 ? 'scale-open' : 'scale-dot',
        isRoot ? 'is-root' : '',
        isTarget ? 'is-target' : ''
      ].filter(Boolean).join(' ');
      const y = note.fret === 0 ? 48 : NUT_Y + FRET_HEIGHT * (note.fret - 0.5);
      svg += `<g class="${classes}" data-pc="${note.pc}" data-pos="${note.string}-${note.fret}">`;
      svg += `<circle cx="${x}" cy="${y}" r="8" />`;
      svg += `<text x="${x}" y="${y + 2.7}" text-anchor="middle">${note.name}</text>`;
      svg += '</g>';
    });

    RIFF_STRING_NAMES.forEach((name, index) => {
      svg += `<text class="fb-stringname" x="${STRING_X[index]}" y="${height - 8}" text-anchor="middle">${name}</text>`;
    });

    svg += '</svg>';
    return svg;
  }

  const api = {
    NOTE_NAMES,
    RIFF_STRING_NAMES,
    STRING_DESCRIPTIONS,
    OPEN_STRING_MIDI,
    RIFFS,
    getRiff,
    riffLabel,
    stringDescription,
    riffPositions,
    riffFrequencies,
    displayedFrets,
    renderRiffFretboard
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
