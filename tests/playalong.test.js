'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Der Parser wird als klassisches IIFE-Bundle geladen und stellt
// `globalThis.GuitarProParser` bereit.
require('../app/js/vendor/guitarpro-parser.js');

const {
  appStringIndex,
  buildTrackOptions,
  buildChartFromSong,
  parseGuitarProFile,
  createDemoChart,
  eventLabel,
  matchPcs,
  HIT_WINDOWS,
  PlaySession
} = require('../app/js/playalong.js');

const FIXTURES = path.join(__dirname, 'fixtures');

test('Saitenindex wird von Guitar Pro (höchste = 0) auf die App gedreht', () => {
  assert.equal(appStringIndex(0, 6), 5); // hohe E
  assert.equal(appStringIndex(5, 6), 0); // tiefe E
  assert.equal(appStringIndex(0, 4), 3); // höchste Basssaite
  assert.equal(appStringIndex(3, 4), 0);
});

test('Demo-Chart enthält vier Riff-Durchläufe', () => {
  const chart = createDemoChart();
  assert.equal(chart.events.length, 28);
  assert.equal(chart.events[0].startMs, 2000);
  assert.equal(chart.noteCount, 28);
  assert.equal(chart.stringCount, 6);
  assert.deepEqual(chart.tuningNames, ['E', 'A', 'D', 'G', 'B', 'E']);
  assert.equal(eventLabel(chart.events[0]), 'E');
  assert.equal(chart.events[1].notes[0].fret, 7);
  assert.ok(chart.durationMs > chart.events[chart.events.length - 1].startMs);
});

test('PlaySession im Takt markiert verpasste Noten', () => {
  const chart = createDemoChart();
  const session = new PlaySession(chart, { mode: 'timed' });
  session.start(0);
  const first = session.currentEvent;
  session.update(first.startMs + HIT_WINDOWS.lateMs + 10);
  assert.equal(session.index, 1, 'erste Note ist verpasst');
  assert.equal(session.misses, 1);
  assert.equal(session.hits, 0);
});

test('PlaySession bewertet Treffer, Timing und Punkte', () => {
  const chart = createDemoChart();
  const session = new PlaySession(chart, { mode: 'timed' });
  session.start(0);
  const first = session.currentEvent;
  const miss = session.judge(first.startMs, [((first.pcs[0] + 1) % 12)]);
  assert.equal(miss.hit, false);
  assert.equal(session.index, 0, 'falsche Note verbraucht kein Event');

  const hit = session.judge(first.startMs, first.pcs);
  assert.equal(hit.hit, true);
  assert.equal(hit.quality, 'perfect');
  assert.equal(session.index, 1);
  assert.equal(session.hits, 1);
  assert.equal(session.combo, 1);
  assert.ok(session.score >= 100);

  session.recordWrong();
  assert.equal(session.combo, 0);
  assert.equal(session.wrong, 1);
  assert.equal(session.accuracy(), 50);
});

test('Note-by-Note wartet auf den richtigen Ton', () => {
  const chart = createDemoChart();
  const session = new PlaySession(chart, { mode: 'wait' });
  session.start(0);
  const first = session.currentEvent;
  const target = first.pcs[0];

  // Auch nach langer Zeit wird nichts als verpasst gewertet.
  session.update(60000);
  assert.equal(session.index, 0);
  assert.equal(session.misses, 0);
  assert.equal(session.finished, false);

  const wrong = session.judge(60000, [((target + 2) % 12)]);
  assert.equal(wrong.hit, false);
  assert.equal(session.index, 0);

  const hit = session.judge(60000, [target]);
  assert.equal(hit.hit, true);
  assert.equal(hit.quality, 'perfect');
  assert.equal(session.index, 1);
  assert.equal(session.currentEvent.startMs, chart.events[1].startMs);
});

test('Akkorde verlangen alle enthaltenen Pitch-Classes', () => {
  const chart = createDemoChart();
  const chord = {
    index: 0,
    startMs: 2600,
    endMs: 3000,
    notes: [],
    pcs: [0, 4, 7],
    isChord: true,
    label: 'C + E + G'
  };
  const sessionChart = { ...chart, events: [chord], durationMs: 4000 };
  const session = new PlaySession(sessionChart, { mode: 'wait', speed: 1 });
  session.start(0);

  assert.equal(matchPcs([0, 4, 7], [0, 4]), false);
  assert.equal(matchPcs([0, 4, 7], [0, 4, 7, 11]), true);
  assert.equal(session.judge(0, [0, 4]).hit, false);
  assert.equal(session.judge(0, [0, 4, 7, 11]).hit, true);
});

test('Guitar-Pro-Import: .gp4 und .gp5 erzeugen spielbare Charts', () => {
  ['guitarpro4_notes.gp4', 'guitarpro5_notes.gp5'].forEach((file) => {
    const song = parseGuitarProFile(fs.readFileSync(path.join(FIXTURES, file)));
    const tracks = buildTrackOptions(song);
    assert.ok(tracks.length > 0, `${file}: keine Stringed-Tracks`);
    const chart = buildChartFromSong(song, tracks[0].index);
    assert.ok(chart.events.length > 0, `${file}: keine Events`);
    assert.equal(chart.events[0].startMs, 2000);
    assert.equal(chart.stringCount, 6);
    assert.ok(chart.noteCount >= chart.events.length);
    assert.ok(chart.durationMs > 0);
    chart.events.forEach((event) => {
      assert.ok(event.pcs.length > 0);
      event.notes.forEach((note) => {
        assert.ok(note.string >= 0 && note.string < chart.stringCount);
        assert.ok(Number.isFinite(note.midi));
      });
    });
  });
});

test('Guitar-Pro-Import: .gp und .gpx (Guitar Pro 6/7+) funktionieren', () => {
  ['conversion_full-song.gpx', 'conversion_full-song.gp'].forEach((file) => {
    const song = parseGuitarProFile(fs.readFileSync(path.join(FIXTURES, file)));
    const tracks = buildTrackOptions(song);
    assert.ok(tracks.length > 0, `${file}: keine Stringed-Tracks`);
    const chart = buildChartFromSong(song, tracks[0].index);
    assert.ok(chart.events.length > 100, `${file}: zu wenige Events`);
    assert.ok(chart.durationMs > 60000, `${file}: Dauer zu kurz`);
    assert.ok(chart.tuningNames.length === chart.stringCount);
    assert.ok(chart.title.length > 0);
  });
});

test('Verpasste Events werden im Takt-Modus fortlaufend gezählt', () => {
  const chart = createDemoChart();
  const session = new PlaySession(chart, { mode: 'timed' });
  session.start(0);
  session.update(10000);
  assert.ok(session.misses > 3, `nur ${session.misses} Fehler`);
  assert.ok(session.index > 3);
});
