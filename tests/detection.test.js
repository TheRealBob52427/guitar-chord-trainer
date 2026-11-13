'use strict';

/**
 * DSP-Tests ohne Browser: synthetische Gitarrenakkorde -> FFT -> Chroma ->
 * Matcher. Ausführen mit `node --test tests/`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { CHORDS, CHORD_ORDER } = require('../app/js/chords.js');
const { computeChroma, ChordMatcher, cosineSimilarity } = require('../app/js/detection.js');

const SAMPLE_RATE = 48000;
const FFT_SIZE = 8192;

/** Iterative Radix-2-FFT (in-place). */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wReal = Math.cos(angle);
    const wImag = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curReal = 1;
      let curImag = 0;
      for (let j = 0; j < len / 2; j += 1) {
        const uReal = re[i + j];
        const uImag = im[i + j];
        const vReal = re[i + j + len / 2] * curReal - im[i + j + len / 2] * curImag;
        const vImag = re[i + j + len / 2] * curImag + im[i + j + len / 2] * curReal;
        re[i + j] = uReal + vReal;
        im[i + j] = uImag + vImag;
        re[i + j + len / 2] = uReal - vReal;
        im[i + j + len / 2] = uImag - vImag;
        const nextReal = curReal * wReal - curImag * wImag;
        curImag = curReal * wImag + curImag * wReal;
        curReal = nextReal;
      }
    }
  }
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Baut ein 8192-Sample-Fenster mit Gitarren-Obertönen. */
function synthesize(midiNotes, { noise = 0.0015, peak = 0.55 } = {}) {
  const samples = new Float64Array(FFT_SIZE);
  midiNotes.forEach((midi, stringIndex) => {
    const f0 = midiToFreq(midi);
    for (let harmonic = 1; harmonic <= 7; harmonic += 1) {
      const frequency = f0 * harmonic;
      if (frequency >= SAMPLE_RATE / 2) break;
      const amplitude = 1 / Math.pow(harmonic, 1.65);
      const phase = (stringIndex * 0.37 + harmonic * 0.11) % (2 * Math.PI);
      for (let i = 0; i < FFT_SIZE; i += 1) {
        samples[i] += amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE + phase);
      }
    }
  });

  let max = 0;
  for (let i = 0; i < FFT_SIZE; i += 1) max = Math.max(max, Math.abs(samples[i]));
  for (let i = 0; i < FFT_SIZE; i += 1) samples[i] = (samples[i] / max) * peak;

  // Deterministisches Rauschen als Grundrauschen
  let seed = 123456789;
  for (let i = 0; i < FFT_SIZE; i += 1) {
    seed = (1103515245 * seed + 12345) % 2147483648;
    samples[i] += ((seed / 2147483648) * 2 - 1) * noise;
  }
  return samples;
}

function spectrumDb(samples) {
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i += 1) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
    re[i] = samples[i] * window;
  }
  fft(re, im);

  const bins = new Float32Array(FFT_SIZE / 2);
  for (let k = 0; k < bins.length; k += 1) {
    const magnitude = (2 * Math.hypot(re[k], im[k])) / FFT_SIZE;
    bins[k] = 20 * Math.log10(Math.max(magnitude, 1e-12));
  }
  return bins;
}

function chromaFor(midiNotes) {
  return computeChroma(spectrumDb(synthesize(midiNotes)), SAMPLE_RATE, FFT_SIZE);
}

const VOICINGS = {
  G: [43, 47, 50, 55, 59, 67],
  Cadd9: [48, 52, 55, 62, 67],
  Em7: [40, 47, 52, 55, 62, 64],
  Dsus4: [50, 57, 62, 67],
  A7sus4: [45, 52, 55, 62, 64]
};

test('FFT-Sanity: 440-Hz-Sinus liegt im erwarteten Bin', () => {
  const samples = new Float64Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i += 1) {
    samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / SAMPLE_RATE);
  }
  const bins = spectrumDb(samples);
  const binHz = SAMPLE_RATE / FFT_SIZE;
  let peak = 0;
  for (let k = 1; k < bins.length; k += 1) if (bins[k] > bins[peak]) peak = k;
  assert.ok(Math.abs(peak * binHz - 440) < binHz, `Peak bei ${peak * binHz} Hz`);
});

test('Chromagramm erkennt alle fünf Akkorde korrekt', () => {
  CHORD_ORDER.forEach((id) => {
    const chroma = chromaFor(VOICINGS[id]);
    let bestId = null;
    let bestScore = 0;
    CHORD_ORDER.forEach((candidate) => {
      const template = new Float32Array(12);
      CHORDS[candidate].pitchClasses.forEach((pc) => { template[pc] = 1; });
      let norm = 0;
      for (let i = 0; i < 12; i += 1) norm += template[i] * template[i];
      for (let i = 0; i < 12; i += 1) template[i] /= Math.sqrt(norm);
      const score = cosineSimilarity(chroma, template);
      if (score > bestScore) {
        bestScore = score;
        bestId = candidate;
      }
    });
    assert.equal(bestId, id, `${id} wurde als ${bestId} erkannt`);
    assert.ok(bestScore > 0.82, `${id}: Score ${bestScore.toFixed(3)} über 0.82`);
  });
});

test('Matcher löst pro Anschlag genau einen Versuch aus (Hysterese)', () => {
  const matcher = new ChordMatcher(CHORD_ORDER, CHORDS);
  const chroma = chromaFor(VOICINGS.G);
  const attempts = [];

  for (let frame = 0; frame < 12; frame += 1) {
    const result = matcher.update(chroma, false);
    assert.equal(result.bestId, 'G');
    if (result.attempt) attempts.push(frame);
  }

  assert.equal(attempts.length, 1, 'nur ein Versuch trotz 12 Frames');
  assert.equal(attempts[0], 0, 'erster Frame zählt als Anschlag');

  // Stille entschärft die Hysterese
  for (let frame = 0; frame < 2; frame += 1) {
    matcher.update(null, true);
  }

  const second = matcher.update(chroma, false);
  assert.equal(second.attempt, true, 'nach Stille wieder bewertbar');
});

test('Matcher bleibt gesperrt, solange der Akkord klingt', () => {
  const matcher = new ChordMatcher(CHORD_ORDER, CHORDS);
  const chroma = chromaFor(VOICINGS.G);

  assert.equal(matcher.update(chroma, false).attempt, true);
  for (let frame = 0; frame < 10; frame += 1) {
    assert.equal(matcher.update(chroma, false).attempt, false);
  }
});

test('Stille erzeugt keinen Versuch und keine NaN-Scores', () => {
  const matcher = new ChordMatcher(CHORD_ORDER, CHORDS);
  for (let frame = 0; frame < 20; frame += 1) {
    const result = matcher.update(null, true);
    assert.equal(result.attempt, false);
    assert.equal(result.bestScore, 0);
    CHORD_ORDER.forEach((id) => assert.ok(Number.isFinite(result.scores[id])));
  }
});

test('Chroma ignoriert Frequenzen unter 70 Hz und unter -82 dB', () => {
  const bins = new Float32Array(FFT_SIZE / 2).fill(-100);
  const binHz = SAMPLE_RATE / FFT_SIZE;

  // 60 Hz stark, 82.4 Hz (E2) stark
  bins[Math.round(60 / binHz)] = -10;
  bins[Math.round(82.4 / binHz)] = -20;

  const chroma = computeChroma(bins, SAMPLE_RATE, FFT_SIZE);
  assert.ok(chroma[4] > 0, 'E wird erkannt');
  assert.ok(chroma[11] === 0 && chroma[0] === 0, 'kein Beitrag aus 60 Hz');

  const quiet = new Float32Array(FFT_SIZE / 2).fill(-100);
  quiet[Math.round(196 / binHz)] = -90;
  const empty = computeChroma(quiet, SAMPLE_RATE, FFT_SIZE);
  assert.equal(empty.reduce((sum, value) => sum + value, 0), 0);
});

test('Template-Vektoren sind normalisiert und unterscheidbar', () => {
  const templates = {};
  CHORD_ORDER.forEach((id) => {
    const template = new Float32Array(12);
    CHORDS[id].pitchClasses.forEach((pc) => { template[pc] = 1; });
    let norm = 0;
    for (let i = 0; i < 12; i += 1) norm += template[i] * template[i];
    for (let i = 0; i < 12; i += 1) template[i] /= Math.sqrt(norm);
    templates[id] = template;
    assert.ok(Math.abs(norm - CHORDS[id].pitchClasses.length) < 1e-6);
  });

  assert.equal(cosineSimilarity(templates.G, templates.Em7) < 0.95, true);
  assert.equal(cosineSimilarity(templates.Cadd9, templates.Dsus4) < 0.95, true);
});

test('Akkord-Daten entsprechen den geforderten Voicings', () => {
  assert.deepEqual(CHORDS.G.strings, [3, 2, 0, 0, 0, 3]);
  assert.deepEqual(CHORDS.Cadd9.strings, [-1, 3, 2, 0, 3, 3]);
  assert.deepEqual(CHORDS.Em7.strings, [0, 2, 2, 0, 3, 0]);
  assert.deepEqual(CHORDS.Dsus4.strings, [-1, -1, 0, 2, 3, 3]);
  assert.deepEqual(CHORDS.A7sus4.strings, [-1, 0, 2, 0, 3, 0]);
  assert.deepEqual(CHORDS.G.frets, CHORDS.G.strings);
  assert.deepEqual(CHORDS.Dsus4.frets, CHORDS.Dsus4.strings);
  assert.deepEqual(CHORDS.A7sus4.frets, CHORDS.A7sus4.strings);

  assert.deepEqual(CHORDS.G.pitchClasses, [7, 11, 2]);
  assert.deepEqual(CHORDS.Cadd9.pitchClasses, [0, 4, 7, 2]);
  assert.deepEqual(CHORDS.Em7.pitchClasses, [4, 7, 11, 2]);
  assert.deepEqual(CHORDS.Dsus4.pitchClasses, [2, 7, 9]);
  assert.deepEqual(CHORDS.A7sus4.pitchClasses, [9, 4, 7, 2]);
});
