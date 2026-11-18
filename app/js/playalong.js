/**
 * Play-Along: Chart-Erzeugung, Guitar-Pro-Import und Spiel-Logik.
 *
 * Reine Funktionen/Klassen ohne DOM und Web Audio, damit sie in Node testbar
 * sind. Der Guitar-Pro-Parser wird als globales `GuitarProParser` geladen
 * (siehe app/js/vendor/guitarpro-parser.js).
 */
(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // tief -> hoch
  const DEFAULT_LEAD_IN_MS = 2600;
  const HIT_WINDOWS = Object.freeze({
    perfectMs: 60,
    goodMs: 130,
    earlyMs: 180,
    lateMs: 220
  });

  function normalizePc(value) {
    return ((Number(value) % 12) + 12) % 12;
  }

  function midiToName(midi) {
    const value = Math.round(Number(midi));
    if (!Number.isFinite(value)) return '';
    return `${NOTE_NAMES[normalizePc(value)]}${Math.floor(value / 12) - 1}`;
  }

  function midiToPitchClass(midi) {
    return normalizePc(Math.round(Number(midi)));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** Saitennamen einer Gitarre/Bass-Stimmung, tief -> hoch. */
  function tuningNames(tuning) {
    if (!Array.isArray(tuning) || !tuning.length) return ['E', 'A', 'D', 'G', 'B', 'E'];
    return tuning.slice().reverse().map((midi) => NOTE_NAMES[midiToPitchClass(midi)]);
  }

  /**
   * Wandelt Guitar-Pro-Noten in App-Saitenindizes um.
   * Guitar Pro zählt Saite 0 als höchste Saite; die App von tief nach hoch.
   */
  function appStringIndex(noteString, stringCount) {
    const count = Math.max(1, Number(stringCount) || 6);
    return clamp(count - 1 - Number(noteString), 0, count - 1);
  }

  /** Listet die spielbaren Stringed-Tracks eines Guitar-Pro-Songs. */
  function buildTrackOptions(song) {
    if (!song || !Array.isArray(song.tracks)) return [];
    return song.tracks
      .map((track, index) => ({
        index,
        name: track.name || `Track ${index + 1}`,
        kind: track.kind,
        stringCount: Array.isArray(track.tuning) ? track.tuning.length : 0,
        tuning: Array.isArray(track.tuning) ? track.tuning.slice() : []
      }))
      .filter((track) => track.kind === 'stringed' && track.stringCount > 0);
  }

  function makeEventNote(note, stringCount) {
    const midi = Number(note.midi);
    return {
      midi,
      pc: midiToPitchClass(midi),
      name: NOTE_NAMES[midiToPitchClass(midi)],
      label: midiToName(midi),
      string: appStringIndex(note.string, stringCount),
      fret: Number(note.fret) || 0
    };
  }

  /**
   * Baut aus einem Guitar-Pro-Song und einem Track ein Play-Along-Chart.
   *
   * Die Zeitachse beginnt mit einem Lead-In, damit die ersten Noten sichtbar
   * auf das Griffbrett zulaufen. Wiederholungen und Tempoänderungen werden
   * vom Parser bereits in `scheduleTrack` berücksichtigt.
   */
  function buildChartFromSong(song, trackIndex, options) {
    const Parser = global.GuitarProParser;
    if (!Parser) {
      throw new Error('Guitar-Pro-Parser ist nicht geladen.');
    }
    const track = song && song.tracks && song.tracks[trackIndex];
    if (!track || track.kind !== 'stringed' || !Array.isArray(track.tuning)) {
      throw new Error('Dieser Track enthält keine Gitarren- oder Bass-Noten.');
    }

    const opts = options && typeof options === 'object' ? options : {};
    const bpm = (song.tempoChanges && song.tempoChanges[0] && song.tempoChanges[0].bpm) || 120;
    const defaultLeadIn = Math.max(1600, Math.round((4 * 60000) / bpm));
    const leadInMs = Number.isFinite(opts.leadInMs) ? Math.max(0, opts.leadInMs) : defaultLeadIn;
    const timeline = Parser.buildTimeline(song);
    const scheduled = Parser.scheduleTrack(song, track, timeline)
      .slice()
      .sort((a, b) => a.startMs - b.startMs || a.note.string - b.note.string);

    const stringCount = track.tuning.length;
    const rawEvents = [];

    scheduled.forEach((item) => {
      const rawNote = item.note;
      if (!rawNote || rawNote.dead) return;
      const midi = Number(rawNote.midi);
      if (!Number.isFinite(midi)) return;
      const startMs = Number(item.startMs);
      const endMs = Math.max(startMs + 40, Number(item.endMs) || startMs + 40);

      let event = rawEvents[rawEvents.length - 1];
      if (!event || Math.abs(event.startMs - startMs) > 8) {
        event = { startMs, endMs, notes: [] };
        rawEvents.push(event);
      }
      event.endMs = Math.max(event.endMs, endMs);
      const note = makeEventNote(rawNote, stringCount);
      const duplicate = event.notes.some((entry) => entry.string === note.string && entry.midi === note.midi);
      if (!duplicate) event.notes.push(note);
    });

    const firstStart = rawEvents.length ? rawEvents[0].startMs : 0;
    const shift = leadInMs - firstStart;
    const events = rawEvents.map((event, index) => {
      const notes = event.notes.slice().sort((a, b) => a.string - b.string || a.midi - b.midi);
      const pcs = [...new Set(notes.map((note) => note.pc))].sort((a, b) => a - b);
      return {
        index,
        startMs: Math.max(0, event.startMs + shift),
        endMs: Math.max(0, event.endMs + shift),
        notes,
        pcs,
        isChord: pcs.length > 1,
        label: notes.map((note) => `${note.name}${note.fret ? `/${note.fret}` : ''}`).join(' + ')
      };
    });

    const durationMs = events.length
      ? events[events.length - 1].endMs + 900
      : 0;

    return {
      id: `gp-${trackIndex}`,
      title: (song.info && song.info.title) || 'Guitar-Pro-Song',
      artist: (song.info && song.info.artist) || '',
      album: (song.info && song.info.album) || '',
      trackIndex,
      trackName: track.name || `Track ${trackIndex + 1}`,
      bpm: (song.tempoChanges && song.tempoChanges[0] && song.tempoChanges[0].bpm) || 120,
      stringCount,
      tuning: track.tuning.slice(),
      tuningNames: tuningNames(track.tuning),
      events,
      durationMs,
      noteCount: events.reduce((sum, event) => sum + event.notes.length, 0),
      source: 'guitar-pro'
    };
  }

  /** Parst eine Guitar-Pro-Datei (ArrayBuffer/Uint8Array) zu einem Song. */
  function parseGuitarProFile(data) {
    const Parser = global.GuitarProParser;
    if (!Parser) throw new Error('Guitar-Pro-Parser ist nicht geladen.');
    // In manchen Umgebungen (z. B. iframe/fetch) kommt ein ArrayBuffer aus
    // einem anderen Realm; der Parser prüft `instanceof`. Ein lokaler
    // Uint8Array macht die Übergabe zuverlässig.
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    return Parser.parseGuitarPro(bytes);
  }

  /**
   * Eingebautes Demo-Chart (Seven-Nation-Army-Riff, vier Durchläufe).
   * Dient zum Ausprobieren ohne eigene Datei.
   */
  function createDemoChart() {
    const bpm = 120;
    const beatMs = 60000 / bpm;
    const pattern = [
      { string: 1, fret: 7, beats: 0.5 },
      { string: 1, fret: 7, beats: 0.5 },
      { string: 1, fret: 10, beats: 0.5 },
      { string: 1, fret: 7, beats: 0.5 },
      { string: 1, fret: 5, beats: 0.5 },
      { string: 1, fret: 3, beats: 0.5 },
      { string: 1, fret: 2, beats: 1.0 }
    ];
    const tuning = STANDARD_TUNING;
    const tuningHighToLow = tuning.slice().reverse();
    const events = [];
    let cursor = 4 * beatMs;
    for (let loop = 0; loop < 4; loop += 1) {
      pattern.forEach((step) => {
        const midi = tuning[step.string] + step.fret;
        const duration = step.beats * beatMs;
        events.push({
          index: events.length,
          startMs: cursor,
          endMs: cursor + duration,
          notes: [{
            midi,
            pc: midiToPitchClass(midi),
            name: NOTE_NAMES[midiToPitchClass(midi)],
            label: midiToName(midi),
            string: step.string,
            fret: step.fret
          }],
          pcs: [midiToPitchClass(midi)],
          isChord: false,
          label: `${NOTE_NAMES[midiToPitchClass(midi)]}/${step.fret}`
        });
        cursor += duration;
      });
    }
    return {
      id: 'demo-seven-nation-army',
      title: 'Seven Nation Army (Demo)',
      artist: 'The White Stripes',
      album: '',
      trackName: 'Riff',
      bpm,
      stringCount: 6,
      tuning: tuningHighToLow,
      tuningNames: tuningNames(tuningHighToLow),
      events,
      durationMs: cursor + 900,
      noteCount: events.length,
      source: 'demo'
    };
  }

  /** Einfache, gut sichtbare Beschreibung eines Events. */
  function eventLabel(event) {
    if (!event) return '–';
    if (event.isChord) return event.pcs.map((pc) => NOTE_NAMES[pc]).join(' + ');
    return event.notes[0] ? event.notes[0].name : '–';
  }

  function matchPcs(targetPcs, detectedPcs) {
    if (!Array.isArray(targetPcs) || !targetPcs.length) return false;
    if (!detectedPcs || !detectedPcs.length) return false;
    const detected = new Set(detectedPcs.map(normalizePc));
    return targetPcs.every((pc) => detected.has(normalizePc(pc)));
  }

  /**
   * Spiel-Session mit zwei Modi:
   * - `timed`: Uhr läuft, Noten außerhalb des Fensters zählen als Fehler.
   * - `wait`: die Uhr steht am aktuellen Event, bis er richtig gespielt wurde.
   */
  class PlaySession {
    constructor(chart, options) {
      if (!chart || !Array.isArray(chart.events)) throw new Error('Chart fehlt.');
      const opts = options && typeof options === 'object' ? options : {};
      this.chart = chart;
      this.mode = opts.mode === 'wait' ? 'wait' : 'timed';
      this.speed = clamp(Number(opts.speed) || 1, 0.4, 1.25);
      this.index = 0;
      this.hits = 0;
      this.misses = 0;
      this.wrong = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.score = 0;
      this.startedAt = null;
      this.finished = false;
      this.lastJudge = null;
      this.waitingSince = null;
    }

    start(now) {
      this.startedAt = Number.isFinite(now) ? now : 0;
      this.waitingSince = this.startedAt;
      return this;
    }

    elapsed(now) {
      if (this.startedAt === null) return 0;
      return Math.max(0, (Number(now) - this.startedAt) * this.speed);
    }

    get currentEvent() {
      return this.chart.events[this.index] || null;
    }

    /** Anzeigezeit für die Highway-Position. */
    displayMs(now) {
      if (this.mode === 'wait') {
        const event = this.currentEvent;
        return event ? event.startMs : this.chart.durationMs;
      }
      return this.elapsed(now);
    }

    /** Markiert verstrichene Events im Timed-Modus als Fehler. */
    update(now) {
      if (this.finished) return this;
      const elapsed = this.elapsed(now);
      if (this.mode === 'timed') {
        while (this.index < this.chart.events.length) {
          const event = this.chart.events[this.index];
          if (elapsed <= event.startMs + HIT_WINDOWS.lateMs) break;
          this.misses += 1;
          this.combo = 0;
          this.index += 1;
        }
      }
      if (this.index >= this.chart.events.length ||
          (this.mode === 'timed' && elapsed > this.chart.durationMs)) {
        this.finished = true;
      }
      return this;
    }

    qualityFor(deltaMs) {
      const diff = Math.abs(deltaMs);
      if (diff <= HIT_WINDOWS.perfectMs) return { id: 'perfect', label: 'Perfekt', factor: 1 };
      if (diff <= HIT_WINDOWS.goodMs) return { id: 'good', label: 'Gut', factor: 0.7 };
      return { id: 'ok', label: 'Okay', factor: 0.4 };
    }

    /**
     * Wertet eine erkannte Pitch-Class-Menge aus.
     * Gibt null zurück, wenn gerade kein Event im Fenster liegt.
     */
    judge(now, detectedPcs) {
      if (this.finished) return null;
      const event = this.currentEvent;
      if (!event) return null;
      const elapsed = this.elapsed(now);
      const delta = this.mode === 'wait' ? 0 : elapsed - event.startMs;

      if (this.mode === 'timed' && delta > HIT_WINDOWS.lateMs) {
        this.update(now);
        return null;
      }
      if (this.mode === 'timed' && delta < -HIT_WINDOWS.earlyMs) return null;
      if (this.mode === 'wait' && delta < -HIT_WINDOWS.earlyMs) {
        // Im Warte-Modus steht die Uhr am Event; nichts zu tun.
      }

      if (!matchPcs(event.pcs, detectedPcs)) {
        return { hit: false, event, deltaMs: delta };
      }

      const quality = this.qualityFor(delta);
      const points = Math.round(100 * quality.factor + this.combo * 2);
      this.hits += 1;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += points;
      this.lastJudge = {
        hit: true,
        event,
        deltaMs: delta,
        quality: quality.id,
        qualityLabel: quality.label,
        points
      };
      this.index += 1;
      this.waitingSince = Number(now);
      if (this.index >= this.chart.events.length) this.finished = true;
      return this.lastJudge;
    }

    /** Zählt einen falschen Anschlag (ohne Event zu verbrauchen). */
    recordWrong() {
      this.wrong += 1;
      this.combo = 0;
    }

    accuracy() {
      const total = this.hits + this.misses + this.wrong;
      return total > 0 ? Math.round((this.hits / total) * 100) : 100;
    }

    progress() {
      const total = this.chart.events.length;
      return total > 0 ? Math.min(1, this.index / total) : 0;
    }

    summary() {
      return {
        hits: this.hits,
        misses: this.misses,
        wrong: this.wrong,
        combo: this.maxCombo,
        score: this.score,
        accuracy: this.accuracy(),
        progress: this.progress(),
        finished: this.finished
      };
    }
  }

  const api = {
    NOTE_NAMES,
    STANDARD_TUNING,
    DEFAULT_LEAD_IN_MS,
    HIT_WINDOWS,
    normalizePc,
    midiToName,
    midiToPitchClass,
    tuningNames,
    appStringIndex,
    buildTrackOptions,
    buildChartFromSong,
    parseGuitarProFile,
    createDemoChart,
    eventLabel,
    matchPcs,
    PlaySession
  };

  global.ChordTrainer = global.ChordTrainer || {};
  Object.assign(global.ChordTrainer, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
