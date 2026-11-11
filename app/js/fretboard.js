/**
 * Rendert ein Griffbrett-Diagramm als SVG.
 * 5 Bünde, 6 Saiten (E A D G B E), offene und gedämpfte Saiten,
 * Fingernummern 1-4, Bundnummern links, abnehmende Saitenstärke.
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

  function describeChord(chord) {
    const parts = chord.frets.map((fret, index) => {
      const stringName = ['tiefe E', 'A', 'D', 'G', 'B', 'hohe E'][index];
      if (fret === -1) return `${stringName} gedämpft`;
      if (fret === 0) return `${stringName} offen`;
      return `${stringName} ${fret}. Bund`;
    });
    return `${chord.name}, Grifftabelle: ${parts.join(', ')}.`;
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

  function renderFretNumbers() {
    let svg = '';
    for (let i = 0; i < FRETS; i += 1) {
      const y = NUT_Y + FRET_HEIGHT * (i + 0.5) + 3.5;
      svg += `<text class="fb-fretnum" x="32" y="${y}" text-anchor="end">${i + 1}</text>`;
    }
    return svg;
  }

  function renderStrings() {
    return STRING_X.map((x, index) => {
      const width = 3.6 - index * 0.44;
      return `<line x1="${x}" y1="${NUT_Y}" x2="${x}" y2="${NUT_Y + FRETS * FRET_HEIGHT}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" />`;
    }).join('');
  }

  function renderFrets() {
    let svg = '';
    for (let i = 1; i <= FRETS; i += 1) {
      const y = NUT_Y + i * FRET_HEIGHT;
      svg += `<line class="fb-fret" x1="${NUT_X1}" y1="${y}" x2="${NUT_X2}" y2="${y}" />`;
    }
    return svg;
  }

  function renderDots(chord) {
    let svg = '';
    chord.frets.forEach((fret, index) => {
      if (fret <= 0) return;
      const x = STRING_X[index];
      const y = NUT_Y + FRET_HEIGHT * (fret - 0.5);
      const finger = chord.fingers[index] || 0;
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

  function renderFretboard(chord) {
    if (!chord) return '';

    return `
<svg class="fretboard" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(describeChord(chord))}" focusable="false">
  <rect class="fb-board" x="${NUT_X1}" y="${NUT_Y}" width="${NUT_X2 - NUT_X1}" height="${FRETS * FRET_HEIGHT}" rx="5" />
  ${renderFrets()}
  <line class="fb-nut" x1="${NUT_X1}" y1="${NUT_Y}" x2="${NUT_X2}" y2="${NUT_Y}" />
  ${renderStrings()}
  ${renderMarkers(chord)}
  ${renderFretNumbers()}
  ${renderDots(chord)}
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
