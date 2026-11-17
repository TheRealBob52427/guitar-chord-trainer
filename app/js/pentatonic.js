/**
 * Pentatonik-Daten, Übungssequenzen und Griffbrett-SVG.
 *
 * Eine Übung besteht aus Anschlägen über die fünf Skalentöne. Jeder Ton wird
 * `repeats`-mal hintereinander erwartet, bevor die nächste Stufe folgt.
 */
(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const INTERVALS = {
    minor: [0, 3, 5, 7, 10],
    major: [0, 2, 4, 7, 9]
  };
  const TYPE_NAMES = { minor: 'Moll', major: 'Dur' };
  const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];
  const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

  /**
   * Die fünf Pattern der A-Moll-Pentatonik (Saiten tief E -> hohe E).
   *
   * Die Bundangaben gelten für den Grundton A. Für andere Grundtöne werden
   * alle Bünde chromatisch verschoben. Pattern 5 ist die offene Lage; die
   * übrigen vier sind die bekannten Kastenformen.
   */
  const PENTATONIC_PATTERNS = [
    {
      id: 1,
      name: 'Pattern 1',
      description: 'Grundposition, Grundton auf der tiefen E-Saite',
      frets: [[5, 8], [5, 7], [5, 7], [5, 7], [5, 8], [5, 8]]
    },
    {
      id: 2,
      name: 'Pattern 2',
      description: 'Zweite Lage, zwei Bünde höher',
      frets: [[8, 10], [7, 10], [7, 10], [7, 9], [8, 10], [8, 10]]
    },
    {
      id: 3,
      name: 'Pattern 3',
      description: 'Dritte Lage mit weitem Griff auf der B-Saite',
      frets: [[10, 12], [10, 12], [10, 12], [9, 12], [10, 13], [10, 12]]
    },
    {
      id: 4,
      name: 'Pattern 4',
      description: 'Vierte Lage ab dem 12. Bund',
      frets: [[12, 15], [12, 15], [12, 14], [12, 14], [13, 15], [12, 15]]
    },
    {
      id: 5,
      name: 'Pattern 5',
      description: 'Offene Lage, Grundton auf der A-Saite',
      frets: [[3, 5], [3, 5], [2, 5], [2, 5], [3, 5], [3, 5]]
    }
  ];

  const PATTERN_COUNT = PENTATONIC_PATTERNS.length;
  const PATTERN_MIN_FRET = 0;
  const PATTERN_MAX_FRET = 24;

  /** Feste Anzahl vollständiger Tonfolgen pro Übung. */
  const PENTATONIC_RUNS = 5;
  /** MIDI-Note des Grundtons fürs Vorspielen (A2 = 45, chromatisch transponiert). */
  const PREVIEW_ROOT_MIDI = 45;

  const STRING_X = [48, 78, 108, 138, 168, 198];
  const NUT_Y = 62;
  const FRET_HEIGHT = 24;
  const FRETS = 12;
  const WIDTH = 228;
  const HEIGHT = NUT_Y + FRETS * FRET_HEIGHT + 34;
  const NUT_X1 = 40;
  const NUT_X2 = 206;

  function normalizePc(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  function scalePitchClasses(rootPc, type) {
    const intervals = INTERVALS[type] || INTERVALS.minor;
    return intervals.map((interval) => normalizePc(rootPc + interval));
  }

  function scaleLabel(rootPc, type) {
    const root = NOTE_NAMES[normalizePc(rootPc)];
    return `${root}-${(TYPE_NAMES[type] || TYPE_NAMES.minor)}-Pentatonik`;
  }

  /**
   * Erzeugt die erwartete Anschlagsfolge aus vollständigen Tonfolgen.
   *
   * Eine Tonfolge enthält immer alle fünf Skalenstufen (aufsteigend). Jede
   * Stufe wird `repeats`-mal erwartet. Mit `backward` folgt nach den
   * aufsteigenden Tonfolgen genau eine absteigende Tonfolge (5–4–3–2–1).
   *
   * @param {number} rootPc Grundton als Pitch-Class (0–11)
   * @param {string} type 'minor' oder 'major'
   * @param {number} runs Anzahl aufsteigender Tonfolgen
   * @param {number} repeats Wiederholungen pro Ton
   * @param {boolean} [backward] absteigende Tonfolge anhängen
   */
  function buildSequence(rootPc, type, runs, repeats, backward) {
    const pcs = scalePitchClasses(rootPc, type);
    const parsedRuns = Math.floor(Number(runs));
    const runCount = Number.isFinite(parsedRuns)
      ? Math.max(1, Math.min(12, parsedRuns))
      : PENTATONIC_RUNS;
    const parsedRepeats = Math.floor(Number(repeats));
    const repeatCount = Number.isFinite(parsedRepeats)
      ? Math.max(1, Math.min(8, parsedRepeats))
      : 1;
    const sequence = [];

    const pushDegree = (degree, run, direction) => {
      for (let repeat = 0; repeat < repeatCount; repeat += 1) {
        sequence.push({
          pc: pcs[degree],
          name: NOTE_NAMES[pcs[degree]],
          degree,
          run,
          direction
        });
      }
    };

    for (let run = 1; run <= runCount; run += 1) {
      for (let degree = 0; degree < pcs.length; degree += 1) {
        pushDegree(degree, run, 'up');
      }
    }

    if (backward) {
      const run = runCount + 1;
      for (let degree = pcs.length - 1; degree >= 0; degree -= 1) {
        pushDegree(degree, run, 'down');
      }
    }

    return sequence;
  }

  /**
   * Frequenzen der fünf Skalentöne für das Vorspielen, beginnend beim
   * Grundton in der Oktave um A2 (MIDI 45).
   */
  function scaleFrequencies(rootPc, type) {
    const rootMidi = PREVIEW_ROOT_MIDI + normalizePc(rootPc - 9);
    const intervals = INTERVALS[type] || INTERVALS.minor;
    return intervals.map((interval) => (
      440 * Math.pow(2, (rootMidi + interval - 69) / 12)
    ));
  }


  function buildPositions(rootPc, type, maxFret) {
    const pcs = new Set(scalePitchClasses(rootPc, type));
    const parsedMaxFret = Number(maxFret);
    const lastFret = Number.isFinite(parsedMaxFret)
      ? Math.max(0, Math.min(FRETS, Math.floor(parsedMaxFret)))
      : FRETS;
    const positions = [];

    OPEN_STRING_MIDI.forEach((openMidi, stringIndex) => {
      for (let fret = 0; fret <= lastFret; fret += 1) {
        const midi = openMidi + fret;
        const pc = normalizePc(midi);
        if (!pcs.has(pc)) continue;
        positions.push({
          stringIndex,
          fret,
          midi,
          pc,
          name: NOTE_NAMES[pc],
          isRoot: pc === normalizePc(rootPc)
        });
      }
    });
    return positions;
  }

  function normalizePatternId(patternId) {
    const parsed = Math.round(Number(patternId));
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(PATTERN_COUNT, parsed));
  }

  function getPattern(patternId) {
    return PENTATONIC_PATTERNS[normalizePatternId(patternId) - 1];
  }

  /**
   * Die Moll-Pentatonik ist die Skala, in der die Pattern gezeichnet sind.
   * Dur-Pentatonik ist die Parallelskala der Moll-Pentatonik eine kleine
   * Terz tiefer (C-Dur = A-Moll), deshalb werden die Pattern für Dur über
   * den Moll-Grundton verschoben.
   */
  function shapeRootPc(rootPc, type) {
    const root = normalizePc(rootPc);
    return type === 'major' ? normalizePc(root + 9) : root;
  }

  /** Bundfenster eines Pattern für den aktuellen Grundton. */
  function patternFretRange(rootPc, type, patternId) {
    const pattern = getPattern(patternId);
    // Für tiefe Grundtöne lieber abwärts verschieben (z. B. E -> 0. Bund)
    // statt eine Oktave höher zu landen. Pattern, die dadurch vor den Sattel
    // rutschen, werden anschließend eine Oktave höher gesetzt.
    let shift = normalizePc(shapeRootPc(rootPc, type) - 9);
    if (shift > 6) shift -= 12;
    const frets = pattern.frets.flat().map((fret) => fret + shift);
    let min = Math.min(...frets);
    let max = Math.max(...frets);
    if (max > PATTERN_MAX_FRET) {
      min -= 12;
      max -= 12;
    }
    if (min < PATTERN_MIN_FRET) {
      min += 12;
      max += 12;
    }
    return {
      firstFret: min,
      lastFret: max,
      fretCount: max - min + 1
    };
  }

  /**
   * Griffbrettpositionen genau eines Pattern. Jede Saite liefert ihre beiden
   * Pattern-Töne; außerhalb des Pattern liegt nichts auf dem Griffbrett.
   */
  function buildPatternPositions(rootPc, type, patternId) {
    const pattern = getPattern(patternId);
    const range = patternFretRange(rootPc, type, patternId);
    const shift = range.firstFret - Math.min(...pattern.frets.flat());
    const root = normalizePc(rootPc);
    const positions = [];

    pattern.frets.forEach((stringFrets, stringIndex) => {
      stringFrets.forEach((baseFret) => {
        const fret = baseFret + shift;
        const midi = OPEN_STRING_MIDI[stringIndex] + fret;
        const pc = normalizePc(midi);
        positions.push({
          stringIndex,
          fret,
          midi,
          pc,
          name: NOTE_NAMES[pc],
          isRoot: pc === root,
          frequency: 440 * Math.pow(2, (midi - 69) / 12)
        });
      });
    });

    return positions;
  }

  /**
   * Übungsfolge für ein Pattern: alle Töne einer Lage werden nach Tonhöhe
   * aufsteigend gespielt. Jeder Ton wird `repeats`-mal erwartet; mit
   * `backward` folgt eine absteigende Tonfolge.
   */
  function buildPatternSequence(rootPc, type, patternId, runs, repeats, backward) {
    const positions = buildPatternPositions(rootPc, type, patternId)
      .slice()
      .sort((a, b) => (
        a.midi - b.midi ||
        a.stringIndex - b.stringIndex ||
        a.fret - b.fret
      ));

    const parsedRuns = Math.floor(Number(runs));
    const runCount = Number.isFinite(parsedRuns)
      ? Math.max(1, Math.min(12, parsedRuns))
      : PENTATONIC_RUNS;
    const parsedRepeats = Math.floor(Number(repeats));
    const repeatCount = Number.isFinite(parsedRepeats)
      ? Math.max(1, Math.min(8, parsedRepeats))
      : 1;
    const sequence = [];

    const pushPosition = (position, degree, run, direction) => {
      for (let repeat = 0; repeat < repeatCount; repeat += 1) {
        sequence.push({
          pc: position.pc,
          name: position.name,
          degree,
          run,
          direction,
          stringIndex: position.stringIndex,
          fret: position.fret,
          midi: position.midi,
          frequency: position.frequency
        });
      }
    };

    for (let run = 1; run <= runCount; run += 1) {
      positions.forEach((position, degree) => {
        pushPosition(position, degree, run, 'up');
      });
    }

    if (backward) {
      const run = runCount + 1;
      positions.slice().reverse().forEach((position, index) => {
        pushPosition(position, positions.length - 1 - index, run, 'down');
      });
    }

    return sequence;
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPentatonicFretboard(rootPc, type, options) {
    const opts = options && typeof options === 'object' ? options : {};
    if (opts.pattern !== undefined && opts.pattern !== null) {
      return renderPatternFretboard(rootPc, type, opts.pattern);
    }
    const positions = buildPositions(rootPc, type, FRETS);
    const root = NOTE_NAMES[normalizePc(rootPc)];
    const label = `${scaleLabel(rootPc, type)}: ${positions.length} Töne über 12 Bünde, Saiten E A D G B E.`;

    let svg = `<svg class="fretboard scale-fretboard" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(label)}" focusable="false">`;
    svg += `<rect class="fb-board" x="${NUT_X1}" y="${NUT_Y}" width="${NUT_X2 - NUT_X1}" height="${FRETS * FRET_HEIGHT}" rx="5" />`;

    // Bundmarkierungen
    [3, 5, 7, 9, 12].forEach((fret) => {
      const y = NUT_Y + FRET_HEIGHT * (fret - 0.5);
      const x = (STRING_X[2] + STRING_X[3]) / 2;
      svg += `<circle class="fb-inlay" cx="${x}" cy="${y}" r="2" />`;
    });

    for (let fret = 1; fret <= FRETS; fret += 1) {
      const y = NUT_Y + fret * FRET_HEIGHT;
      svg += `<line class="fb-fret" x1="${NUT_X1}" y1="${y}" x2="${NUT_X2}" y2="${y}" />`;
    }
    svg += `<line class="fb-nut" x1="${NUT_X1}" y1="${NUT_Y}" x2="${NUT_X2}" y2="${NUT_Y}" />`;

    STRING_X.forEach((x, index) => {
      const width = (3.6 - index * 0.44).toFixed(2);
      svg += `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${NUT_Y + FRETS * FRET_HEIGHT}" stroke-width="${width}" stroke-linecap="round" />`;
    });

    for (let fret = 1; fret <= FRETS; fret += 1) {
      const y = NUT_Y + FRET_HEIGHT * (fret - 0.5) + 2.8;
      svg += `<text class="fb-fretnum" x="32" y="${y}" text-anchor="end">${fret}</text>`;
    }

    positions.forEach((position) => {
      const x = STRING_X[position.stringIndex];
      if (position.fret === 0) {
        const classes = `scale-open${position.isRoot ? ' is-root' : ''}`;
        svg += `<g class="${classes}" data-pc="${position.pc}">`;
        svg += `<circle cx="${x}" cy="48" r="8" />`;
        svg += `<text x="${x}" y="51" text-anchor="middle">${position.name}</text>`;
        svg += '</g>';
      } else {
        const y = NUT_Y + FRET_HEIGHT * (position.fret - 0.5);
        const classes = `scale-dot${position.isRoot ? ' is-root' : ''}`;
        svg += `<g class="${classes}" data-pc="${position.pc}" data-pos="${position.stringIndex}-${position.fret}">`;
        svg += `<circle cx="${x}" cy="${y}" r="8" />`;
        svg += `<text x="${x}" y="${y + 2.7}" text-anchor="middle">${position.name}</text>`;
        svg += '</g>';
      }
    });

    STRING_NAMES.forEach((name, index) => {
      svg += `<text class="fb-stringname" x="${STRING_X[index]}" y="${HEIGHT - 8}" text-anchor="middle">${name}</text>`;
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * Griffbrett-Diagramm genau eines Pattern. Das Fenster zeigt nur die Bünde
   * der Lage; alle anderen Skalentöne bleiben unsichtbar.
   */
  function renderPatternFretboard(rootPc, type, patternId) {
    const pattern = getPattern(patternId);
    const range = patternFretRange(rootPc, type, pattern.id);
    const positions = buildPatternPositions(rootPc, type, pattern.id);
    const firstSpace = range.firstFret === 0 ? 1 : range.firstFret;
    const spaceCount = range.lastFret - firstSpace + 1;
    const height = NUT_Y + spaceCount * FRET_HEIGHT + 34;
    const root = NOTE_NAMES[normalizePc(rootPc)];
    const label = `${scaleLabel(rootPc, type)}, ${pattern.name}, ` +
      `Bünde ${range.firstFret} bis ${range.lastFret}: ${positions.length} Töne, ` +
      `Saiten E A D G B E.`;

    let svg = `<svg class="fretboard scale-fretboard pattern-fretboard" viewBox="0 0 ${WIDTH} ${height}" ` +
      `role="img" aria-label="${escapeXml(label)}" focusable="false" data-pattern="${pattern.id}">`;
    svg += `<rect class="fb-board" x="${NUT_X1}" y="${NUT_Y}" width="${NUT_X2 - NUT_X1}" ` +
      `height="${spaceCount * FRET_HEIGHT}" rx="5" />`;

    // Bundmarkierungen an den absoluten Bünden (3, 5, 7, 9, 12, ...).
    [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
      .filter((fret) => fret >= firstSpace && fret <= range.lastFret)
      .forEach((fret) => {
        const y = NUT_Y + FRET_HEIGHT * (fret - firstSpace + 0.5);
        const x = (STRING_X[2] + STRING_X[3]) / 2;
        svg += `<circle class="fb-inlay" cx="${x}" cy="${y}" r="2" />`;
      });

    for (let index = 1; index <= spaceCount; index += 1) {
      const y = NUT_Y + FRET_HEIGHT * index;
      svg += `<line class="fb-fret" x1="${NUT_X1}" y1="${y}" x2="${NUT_X2}" y2="${y}" />`;
    }
    if (range.firstFret === 0) {
      svg += `<line class="fb-nut" x1="${NUT_X1}" y1="${NUT_Y}" x2="${NUT_X2}" y2="${NUT_Y}" />`;
    } else {
      // Oberkante des Ausschnitts ist ein normaler Bund, kein Sattel.
      svg += `<line class="fb-fret fb-fret-edge" x1="${NUT_X1}" y1="${NUT_Y}" x2="${NUT_X2}" y2="${NUT_Y}" />`;
    }

    STRING_X.forEach((x, index) => {
      const width = (3.6 - index * 0.44).toFixed(2);
      svg += `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${NUT_Y + spaceCount * FRET_HEIGHT}" ` +
        `stroke-width="${width}" stroke-linecap="round" />`;
    });

    for (let index = 0; index < spaceCount; index += 1) {
      const fretNumber = firstSpace + index;
      const y = NUT_Y + FRET_HEIGHT * (index + 0.5) + 2.8;
      svg += `<text class="fb-fretnum" x="32" y="${y}" text-anchor="end">${fretNumber}</text>`;
    }

    positions.forEach((position) => {
      const x = STRING_X[position.stringIndex];
      const classes = [
        position.fret === 0 ? 'scale-open' : 'scale-dot',
        position.isRoot ? 'is-root' : ''
      ].filter(Boolean).join(' ');
      const y = position.fret === 0
        ? 48
        : NUT_Y + FRET_HEIGHT * (position.fret - firstSpace + 0.5);
      svg += `<g class="${classes}" data-pc="${position.pc}" ` +
        `data-pos="${position.stringIndex}-${position.fret}">`;
      svg += `<circle cx="${x}" cy="${y}" r="8" />`;
      svg += `<text x="${x}" y="${y + 2.7}" text-anchor="middle">${position.name}</text>`;
      svg += '</g>';
    });

    STRING_NAMES.forEach((name, index) => {
      svg += `<text class="fb-stringname" x="${STRING_X[index]}" y="${height - 8}" text-anchor="middle">${name}</text>`;
    });

    svg += '</svg>';
    return svg;
  }

  const api = {
    NOTE_NAMES,
    INTERVALS,
    TYPE_NAMES,
    OPEN_STRING_MIDI,
    PENTATONIC_RUNS,
    PENTATONIC_PATTERNS,
    PATTERN_COUNT,
    scalePitchClasses,
    scaleLabel,
    buildSequence,
    scaleFrequencies,
    buildPositions,
    getPattern,
    shapeRootPc,
    patternFretRange,
    buildPatternPositions,
    buildPatternSequence,
    renderPentatonicFretboard,
    renderPatternFretboard
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
