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
   * Erzeugt die erwartete Anschlagsfolge. Bei mehr Anschlägen als
   * Skalentönen × Wiederholungen wird die Skala in die nächste Oktave
   * fortgesetzt; die Pitch-Class bleibt dieselbe.
   */
  function buildSequence(rootPc, type, attacks, repeats) {
    const pcs = scalePitchClasses(rootPc, type);
    const total = Math.max(1, Math.min(80, Math.floor(Number(attacks) || 1)));
    const repeatCount = Math.max(1, Math.min(8, Math.floor(Number(repeats) || 1)));
    const sequence = [];

    for (let index = 0; index < total; index += 1) {
      const step = Math.floor(index / repeatCount);
      const degree = step % pcs.length;
      sequence.push({
        pc: pcs[degree],
        name: NOTE_NAMES[pcs[degree]],
        degree
      });
    }
    return sequence;
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

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPentatonicFretboard(rootPc, type) {
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
        svg += `<g class="${classes}" data-pc="${position.pc}">`;
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

  const api = {
    NOTE_NAMES,
    INTERVALS,
    TYPE_NAMES,
    OPEN_STRING_MIDI,
    scalePitchClasses,
    scaleLabel,
    buildSequence,
    buildPositions,
    renderPentatonicFretboard
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
