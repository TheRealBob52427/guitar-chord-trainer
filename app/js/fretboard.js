/**
 * Rendert ein Griffbrett-Diagramm als SVG.
 * Standard: 5 Bünde ab Bund 1, 6 Saiten (E A D G B E), offene und gedämpfte
 * Saiten, Fingernummern 1-4, Bundnummern links, abnehmende Saitenstärke.
 *
 * Mit `options.startFret`/`options.fretCount` lassen sich höhere Lagen
 * darstellen (z. B. die CAGED-Formen). Dann nummerieren die Bundangaben
 * absolut und der Sattel wird nur bei startFret 0/1 gezeichnet.
 */
(function (global) {
  'use strict';

  const STRINGS = 6;
  const FRETS = 5;
  const STRING_X = [48, 78, 108, 138, 168, 198];
  const NUT_Y = 72;
  const FRET_HEIGHT = 34;
  const NUT_X1 = 40;
  const NUT_X2 = 206;
  const WIDTH = 228;
  const HEIGHT = 276;

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function describeChord(chord, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const startFret = Number.isFinite(opts.startFret) ? Math.max(0, Math.round(opts.startFret)) : 1;
    const parts = chord.frets.map((fret, index) => {
      const stringName = ['tiefe E', 'A', 'D', 'G', 'B', 'hohe E'][index];
      if (fret === -1) return `${stringName} gedämpft`;
      if (fret === 0) return `${stringName} offen`;
      return `${stringName} ${fret}. Bund`;
    });
    const offset = startFret > 1 ? ` Ab Bund ${startFret}.` : '';
    return `${chord.name}, Grifftabelle: ${parts.join(', ')}.${offset}`;
  }

  function renderMarkers(chord) {
    let svg = '';
    chord.frets.forEach((fret, index) => {
      const x = STRING_X[index];
      if (fret === 0) {
        svg += `<circle class="fb-open" cx="${x}" cy="54" r="5.4" />`;
      } else if (fret === -1) {
        svg += `<path class="fb-muted" d="M${x - 5} 49 L${x + 5} 59 M${x + 5} 49 L${x - 5} 59" />`;
      }
    });
    return svg;
  }

  function renderFretNumbers(startFret, fretCount) {
    let svg = '';
    for (let i = 0; i < fretCount; i += 1) {
      const y = NUT_Y + FRET_HEIGHT * (i + 0.5) + 3.5;
      svg += `<text class="fb-fretnum" x="32" y="${y}" text-anchor="end">${startFret + i}</text>`;
    }
    return svg;
  }

  function renderStrings(fretCount) {
    return STRING_X.map((x, index) => {
      const width = 3.6 - index * 0.44;
      return `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${NUT_Y + fretCount * FRET_HEIGHT}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" />`;
    }).join('');
  }

  function renderFrets(fretCount) {
    let svg = '';
    for (let i = 1; i <= fretCount; i += 1) {
      const y = NUT_Y + FRET_HEIGHT * i;
      svg += `<line class="fb-fret" x1="${NUT_X1}" y1="${y}" x2="${NUT_X2}" y2="${y}" />`;
    }
    return svg;
  }

  function renderDots(chord, startFret, showFingers) {
    let svg = '';
    chord.frets.forEach((fret, index) => {
      if (fret <= 0) return;
      if (fret < startFret) return;
      const x = STRING_X[index];
      const y = NUT_Y + FRET_HEIGHT * ((fret - startFret) + 0.5);
      const finger = showFingers ? (chord.fingers ? chord.fingers[index] : 0) : 0;
      svg += `<g class="fb-dot"><circle cx="${x}" cy="${y}" r="10.5" />`;
      if (finger > 0) {
        svg += `<text x="${x}" y="${y + 4}" text-anchor="middle">${finger}</text>`;
      }
      svg += '</g>';
    });
    return svg;
  }

  function renderStringLabels() {
    return ['E', 'A', 'D', 'G', 'B', 'E'].map((name, index) => (
      `<text class="fb-stringname" x="${STRING_X[index]}" y="260" text-anchor="middle">${name}</text>`
    )).join('');
  }

  /**
   * @param {Object} chord Akkord-/Formdaten mit `frets` und optional `fingers`
   * @param {Object} [options] { startFret, fretCount, showNut, showFingers }
   */
  function renderFretboard(chord, options) {
    if (!chord) return '';
    const opts = options && typeof options === 'object' ? options : {};
    const parsedStart = Number.isFinite(Number(opts.startFret)) ? Math.round(Number(opts.startFret)) : 1;
    const startFret = Math.max(0, parsedStart);
    const parsedCount = Number.isFinite(Number(opts.fretCount)) ? Math.round(Number(opts.fretCount)) : FRETS;
    const fretCount = Math.max(1, Math.min(12, parsedCount));
    const showNut = opts.showNut !== undefined ? Boolean(opts.showNut) : startFret <= 1;
    const showFingers = opts.showFingers !== false;
    const activeFrets = chord.frets.filter((fret) => fret > 0);
    const maxActive = activeFrets.length ? Math.max(...activeFrets) : 0;
    const requiredCount = Math.max(fretCount, maxActive - startFret + 1);
    const visibleCount = Math.min(12, Math.max(1, requiredCount));
    const height = HEIGHT;

    return `
<svg class="fretboard" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${escapeXml(describeChord(chord, { startFret }))}" focusable="false">
  <rect class="fb-board" x="${NUT_X1}" y="${NUT_Y}" width="${NUT_X2 - NUT_X1}" height="${visibleCount * FRET_HEIGHT}" rx="5" />
  ${renderFrets(visibleCount)}
  ${showNut
    ? `<line class="fb-nut" x1="${NUT_X1}" y1="${NUT_Y}" x2="${NUT_X2}" y2="${NUT_Y}" />`
    : `<line class="fb-fret fb-fret-edge" x1="${NUT_X1}" y1="${NUT_Y}" x2="${NUT_X2}" y2="${NUT_Y}" />`}
  ${renderStrings(visibleCount)}
  ${renderMarkers(chord)}
  ${renderFretNumbers(startFret, visibleCount)}
  ${renderDots(chord, startFret, showFingers)}
  ${renderStringLabels()}
</svg>`.trim();
  }

  global.ChordTrainer = global.ChordTrainer || {};
  global.ChordTrainer.renderFretboard = renderFretboard;
  global.ChordTrainer.describeChord = describeChord;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderFretboard, describeChord, STRING_X, WIDTH, HEIGHT };
  }
})(typeof window !== 'undefined' ? window : globalThis);
