'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { CHORDS, CHORD_ORDER } = require('../app/js/chords.js');
const Stats = require('../app/js/stats.js');

function memoryStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(String(key), String(value)); },
    removeItem(key) { map.delete(key); },
    has(key) { return map.has(key); }
  };
}

test('Leere Statistik ist konsistent', () => {
  const stats = Stats.createEmptyStats(CHORD_ORDER);
  assert.equal(stats.total, 0);
  assert.equal(stats.correct, 0);
  CHORD_ORDER.forEach((id) => assert.deepEqual(stats.byChord[id], { correct: 0, total: 0 }));

  const summary = Stats.summarize(stats, CHORD_ORDER);
  assert.equal(summary.percent, 0);
  assert.equal(summary.unassignedTotal, 0);
  assert.equal(summary.rows.length, 5);
});

test('Treffer werden global und pro Akkord gezählt', () => {
  const stats = Stats.createEmptyStats(CHORD_ORDER);
  Stats.recordAttempt(stats, CHORD_ORDER, 'G', true);
  Stats.recordAttempt(stats, CHORD_ORDER, 'G', false);
  Stats.recordAttempt(stats, CHORD_ORDER, 'Cadd9', true);

  assert.equal(stats.total, 3);
  assert.equal(stats.correct, 2);
  assert.deepEqual(stats.byChord.G, { correct: 1, total: 2 });
  assert.deepEqual(stats.byChord.Cadd9, { correct: 1, total: 1 });
  assert.ok(stats.updatedAt);

  const summary = Stats.summarize(stats, CHORD_ORDER);
  assert.equal(summary.percent, 67);
  assert.ok(summary.rows.find((row) => row.id === 'G').percent === 50);
});

test('Statistik überlebt Speichern und Laden', () => {
  const storage = memoryStorage();
  const stats = Stats.createEmptyStats(CHORD_ORDER);
  Stats.recordAttempt(stats, CHORD_ORDER, 'Em7', true);
  Stats.recordAttempt(stats, CHORD_ORDER, 'Dsus4', false);
  assert.equal(Stats.saveStats(storage, stats), true);

  const loaded = Stats.loadStats(storage, CHORD_ORDER);
  assert.equal(loaded.total, 2);
  assert.equal(loaded.correct, 1);
  assert.deepEqual(loaded.byChord.Em7, { correct: 1, total: 1 });
  assert.deepEqual(loaded.byChord.Dsus4, { correct: 0, total: 1 });
});

test('v1-Daten werden migriert und als Altbestand ausgewiesen', () => {
  const storage = memoryStorage({
    'guitarTrainer.stats.v1': JSON.stringify({ correct: 4, total: 10 })
  });
  const stats = Stats.loadStats(storage, CHORD_ORDER);
  assert.equal(stats.total, 10);
  assert.equal(stats.correct, 4);

  const summary = Stats.summarize(stats, CHORD_ORDER);
  assert.equal(summary.unassignedTotal, 10);
  assert.equal(summary.unassignedCorrect, 4);

  Stats.recordAttempt(stats, CHORD_ORDER, 'G', true);
  const updated = Stats.summarize(stats, CHORD_ORDER);
  assert.equal(updated.total, 11);
  assert.equal(updated.unassignedTotal, 10);
});

test('CSV enthält Akkordzeilen, Altbestand, Gesamt und deutsche Prozente', () => {
  const storage = memoryStorage({
    'guitarTrainer.stats.v1': JSON.stringify({ correct: 4, total: 10 })
  });
  const stats = Stats.loadStats(storage, CHORD_ORDER);
  Stats.recordAttempt(stats, CHORD_ORDER, 'G', true);
  Stats.recordAttempt(stats, CHORD_ORDER, 'G', false);
  Stats.recordAttempt(stats, CHORD_ORDER, 'Cadd9', true);

  const csv = Stats.buildCsv(stats, CHORDS, CHORD_ORDER);
  assert.match(csv, /^Akkord;Versuche;Treffer;Trefferquote\r\n/);
  assert.match(csv, /G-Dur;2;1;50 %/);
  assert.match(csv, /Cadd9;1;1;100 %/);
  assert.match(csv, /E-Moll 7;0;0;–/);
  assert.match(csv, /Altbestand \(v1\);10;4;40 %/);
  assert.match(csv, /Gesamt;13;6;46 %/);
  assert.ok(csv.endsWith('\r\n'));
});

test('Reset entfernt v2 und v1', () => {
  const storage = memoryStorage({
    'guitarTrainer.stats.v1': JSON.stringify({ correct: 2, total: 3 }),
    'guitarTrainer.stats.v2': JSON.stringify({ correct: 2, total: 3 })
  });
  const stats = Stats.resetStats(storage, CHORD_ORDER);
  assert.equal(stats.total, 0);
  assert.equal(storage.has('guitarTrainer.stats.v1'), false);
  assert.equal(storage.has('guitarTrainer.stats.v2'), false);
});

test('Korrupte Daten werden repariert statt zu crashen', () => {
  const stats = Stats.normalizeStats({
    total: 2,
    correct: 9,
    byChord: {
      G: { correct: 3, total: 1 },
      Unbekannt: { correct: 5, total: 5 }
    }
  }, CHORD_ORDER);
  assert.equal(stats.byChord.G.total, 3);
  assert.equal(stats.byChord.G.correct, 3);
  assert.equal(stats.total, 3);
  assert.equal(stats.correct, 3);
  assert.equal(stats.byChord.Unbekannt, undefined);
});

test('Export-Dateiname enthält das Datum', () => {
  assert.equal(
    Stats.exportFilename(new Date(2026, 10, 11)),
    'akkord-statistik-2026-11-11.csv'
  );
});
