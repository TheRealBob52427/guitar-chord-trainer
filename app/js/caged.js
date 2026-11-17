/**
 * CAGED-System: die fünf beweglichen Dur-Akkordformen C, A, G, E und D.
 *
 * Jede Form ist als offene Akkordform notiert (Saiten tief E -> hohe E,
 * -1 = gedämpft, 0 = offen). Über die Lage des Grundtons auf der jeweiligen
 * Referenzsaite wird die Form chromatisch verschoben. Formen, die dadurch
 * unter den Sattel rutschen würden, werden eine Oktave höher gesetzt.
 */
(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const OPEN_STRING_PC = [4, 9, 2, 7, 11, 4];
  const STRING_NAMES = ['tiefe E-Saite', 'A-Saite', 'D-Saite', 'G-Saite', 'B-Saite', 'hohe E-Saite'];
  const SHORT_STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

  /**
   * `rootString` + `rootFret` markieren den Grundton in der offenen Form.
   * `frets` ist die offene Lage (C-Dur, A-Dur, G-Dur, E-Dur, D-Dur).
   */
  const CAGED_SHAPES = [
    {
      id: 'C',
      name: 'C-Form',
      rootString: 1,
      rootFret: 3,
      frets: [-1, 3, 2, 0, 1, 0]
    },
    {
      id: 'A',
      name: 'A-Form',
      rootString: 1,
      rootFret: 0,
      frets: [-1, 0, 2, 2, 2, 0]
    },
    {
      id: 'G',
      name: 'G-Form',
      rootString: 0,
      rootFret: 3,
      frets: [3, 2, 0, 0, 0, 3]
    },
    {
      id: 'E',
      name: 'E-Form',
      rootString: 0,
      rootFret: 0,
      frets: [0, 2, 2, 1, 0, 0]
    },
    {
      id: 'D',
      name: 'D-Form',
      rootString: 2,
      rootFret: 0,
      frets: [-1, -1, 0, 2, 3, 2]
    }
  ];

  function normalizePc(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  /** Bund, auf dem der Grundton `rootPc` auf einer Saite liegt (0–11). */
  function rootFretOnString(rootPc, stringIndex) {
    return normalizePc(rootPc - OPEN_STRING_PC[stringIndex]);
  }

  /**
   * Verschiebt eine Form so, dass ihr Grundton auf `rootPc` liegt.
   * Liegt die Form dadurch vor dem Sattel, wird sie um zwölf Bünde erhöht.
   */
  function transposeShape(shape, rootPc) {
    let delta = rootFretOnString(rootPc, shape.rootString) - shape.rootFret;
    if (delta < 0) delta += 12;

    let frets = shape.frets.map((fret) => (fret < 0 ? -1 : fret + delta));
    const highest = frets.reduce((max, fret) => Math.max(max, fret), 0);
    if (highest > 24) {
      delta -= 12;
      frets = shape.frets.map((fret) => (fret < 0 ? -1 : fret + delta));
    }

    const rootFret = frets[shape.rootString];
    return {
      id: shape.id,
      name: shape.name,
      rootString: shape.rootString,
      rootFret,
      frets,
      delta
    };
  }

  /** Alle fünf CAGED-Formen für einen Grundton. */
  function buildCagedShapes(rootPc) {
    const pc = normalizePc(rootPc);
    return CAGED_SHAPES.map((shape) => {
      const transposed = transposeShape(shape, pc);
      return {
        ...transposed,
        rootPc: pc,
        rootName: NOTE_NAMES[pc],
        chordName: `${NOTE_NAMES[pc]}-Dur`,
        rootDescription: `${STRING_NAMES[transposed.rootString]}, ${transposed.rootFret}. Bund`,
        pitchClasses: [pc, normalizePc(pc + 4), normalizePc(pc + 7)],
        strings: transposed.frets
      };
    });
  }

  /**
   * Prüft, ob eine transponierte Form wirklich die drei Dur-Akkordtöne
   * enthält. Wird von den Tests genutzt und schützt vor Tippfehlern in den
   * Formdaten.
   */
  function shapePitchClasses(shape) {
    const pcs = new Set();
    shape.frets.forEach((fret, stringIndex) => {
      if (fret < 0) return;
      pcs.add(normalizePc(OPEN_STRING_PC[stringIndex] + fret));
    });
    return [...pcs].sort((a, b) => a - b);
  }

  /** Sichtbarer Bundbereich eines Diagramms (mindestens fünf Bünde). */
  function visibleRange(shape) {
    const fretted = shape.frets.filter((fret) => fret > 0);
    if (!fretted.length) return { startFret: 0, fretCount: 5 };
    const minFret = Math.min(...fretted);
    const maxFret = Math.max(...fretted);
    const startFret = maxFret <= 5 ? 1 : Math.max(1, minFret - 1);
    return { startFret, fretCount: Math.max(5, maxFret - startFret + 1) };
  }

  const api = {
    NOTE_NAMES,
    SHORT_STRING_NAMES,
    STRING_NAMES,
    CAGED_SHAPES,
    normalizePc,
    rootFretOnString,
    transposeShape,
    buildCagedShapes,
    shapePitchClasses,
    visibleRange
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
