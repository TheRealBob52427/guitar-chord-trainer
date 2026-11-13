/**
 * Akkord-Daten und Templating für den Gitarren-Akkord-Trainer.
 *
 * Saiten-Reihenfolge: tiefe E, A, D, G, B, hohe E.
 * strings: -1 = gedämpft (x), 0 = offen (o), n = Bund n
 * fingers: 0 = keine Fingerangabe (offen/gedämpft), 1-4 = Fingernummer
 *
 * `frets` ist ein Alias auf `strings` und wird unten gesetzt; beide Namen
 * funktionieren, `strings` ist die kanonische Schreibweise.
 */
(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

  const CHORDS = {
    G: {
      id: 'G',
      name: 'G-Dur',
      symbol: 'G',
      notes: ['G', 'B', 'D'],
      pitchClasses: [7, 11, 2],
      strings: [3, 2, 0, 0, 0, 3],
      fingers: [2, 1, 0, 0, 0, 3],
      tip: 'Mittelfinger auf die tiefe E-Saite (3. Bund), Zeigefinger auf die A-Saite (2. Bund), Ringfinger auf die hohe E-Saite (3. Bund).'
    },
    Cadd9: {
      id: 'Cadd9',
      name: 'Cadd9',
      symbol: 'Cadd9',
      notes: ['C', 'E', 'G', 'D'],
      pitchClasses: [0, 4, 7, 2],
      strings: [-1, 3, 2, 0, 3, 3],
      fingers: [0, 2, 1, 0, 3, 4],
      tip: 'Mittelfinger auf die A-Saite (3. Bund), Zeigefinger auf die D-Saite (2. Bund), Ring- und kleiner Finger auf die 3. Bünde von B- und hoher E-Saite.'
    },
    Em7: {
      id: 'Em7',
      name: 'E-Moll 7',
      symbol: 'Em7',
      notes: ['E', 'G', 'B', 'D'],
      pitchClasses: [4, 7, 11, 2],
      strings: [0, 2, 2, 0, 3, 0],
      fingers: [0, 2, 3, 0, 4, 0],
      tip: 'Mittelfinger auf die A-Saite (2. Bund), Ringfinger auf die D-Saite (2. Bund), kleiner Finger auf die B-Saite (3. Bund).'
    },
    Dsus4: {
      id: 'Dsus4',
      name: 'D-Sus4',
      symbol: 'Dsus4',
      notes: ['D', 'G', 'A'],
      pitchClasses: [2, 7, 9],
      strings: [-1, -1, 0, 2, 3, 3],
      fingers: [0, 0, 0, 1, 3, 4],
      tip: 'Zeigefinger auf die G-Saite (2. Bund), Ring- und kleiner Finger auf die 3. Bünde von B- und hoher E-Saite.'
    },
    A7sus4: {
      id: 'A7sus4',
      name: 'A7sus4',
      symbol: 'A7sus4',
      notes: ['A', 'E', 'G', 'D'],
      pitchClasses: [9, 4, 7, 2],
      strings: [-1, 0, 2, 0, 3, 0],
      fingers: [0, 0, 1, 0, 3, 0],
      tip: 'Offene A-Saite, Zeigefinger auf die D-Saite (2. Bund), Ringfinger auf die B-Saite (3. Bund); G- und hohe E-Saite bleiben offen.'
    }
  };

  const CHORD_ORDER = ['G', 'Cadd9', 'Em7', 'Dsus4', 'A7sus4'];

  // `strings` ist kanonisch, `frets` wird überall im Renderer und in den Tests
  // verwendet.
  Object.keys(CHORDS).forEach((id) => {
    CHORDS[id].frets = CHORDS[id].strings;
  });

  /**
   * Baut aus den Pitch-Classes eines Akkords einen normalisierten Template-Vektor.
   * Die Templates sind bewusst binär (jeder Akkordton zählt gleich), damit die
   * Cosine-Similarity direkt interpretierbar bleibt.
   */
  function buildTemplate(pitchClasses) {
    const vector = new Float32Array(12);
    for (let i = 0; i < pitchClasses.length; i += 1) {
      const pc = ((pitchClasses[i] % 12) + 12) % 12;
      vector[pc] = 1;
    }
    normalizeVector(vector);
    return vector;
  }

  /** Normalisiert einen Vektor auf Länge 1 (in-place). Nullvektoren bleiben null. */
  function normalizeVector(vector) {
    let sum = 0;
    for (let i = 0; i < vector.length; i += 1) sum += vector[i] * vector[i];
    const norm = Math.sqrt(sum);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
    }
    return vector;
  }

  function chordTemplates() {
    const templates = {};
    CHORD_ORDER.forEach((id) => {
      templates[id] = buildTemplate(CHORDS[id].pitchClasses);
    });
    return templates;
  }

  const api = {
    NOTE_NAMES,
    STRING_NAMES,
    CHORDS,
    CHORD_ORDER,
    buildTemplate,
    normalizeVector,
    chordTemplates
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
