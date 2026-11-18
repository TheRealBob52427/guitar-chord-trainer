/**
 * App-Orchestrierung: UI, Zustand, Mikrofon-Lifecycle, Statistik, Metronom.
 */
(function () {
  'use strict';

  const {
    CHORDS,
    CHORD_ORDER,
    AudioEngine,
    Metronome,
    renderFretboard,
    DEFAULTS,
    Stats,
    Prefs,
    TUNING_STRINGS,
    GAUGE_RANGE_CENTS,
    frequencyToNote,
    centsFromFrequency,
    isInTune,
    formatCents,
    formatHz,
    NOTE_NAMES,
    PENTATONIC_RUNS,
    PENTATONIC_PATTERNS,
    PATTERN_COUNT,
    scalePitchClasses,
    scaleLabel,
    buildPatternSequence,
    patternFretRange,
    renderPentatonicFretboard,
    buildCagedShapes,
    visibleRange,
    chordFrequencies,
    RIFFS,
    getRiff,
    riffLabel,
    stringDescription,
    riffPlaybackFrequencies,
    renderRiffFretboard,
    RIFF_STRING_NAMES,
    nearestStringIndex,
    SONGS,
    getSong,
    songLabel,
    buildTrackOptions,
    buildChartFromSong,
    parseGuitarProFile,
    createDemoChart,
    eventLabel,
    matchPcs,
    PlaySession,
    APP_VERSION = '',
    REPO_URL = '',
    KOFI_URL = ''
  } = window.ChordTrainer;
  const MATCH_SCORE = DEFAULTS.matchThreshold;
  const MIN_BPM = 40;
  const MAX_BPM = 180;
  const storedPrefs = Prefs.loadPrefs(window.localStorage);

  const els = {
    startScreen: document.getElementById('startScreen'),
    startBtn: document.getElementById('startBtn'),
    startHelpBtn: document.getElementById('startHelpBtn'),
    secureHint: document.getElementById('secureHint'),
    mainApp: document.getElementById('mainApp'),
    modeTrainerBtn: document.getElementById('modeTrainerBtn'),
    modeTunerBtn: document.getElementById('modeTunerBtn'),
    modePentatonicBtn: document.getElementById('modePentatonicBtn'),
    modeRiffBtn: document.getElementById('modeRiffBtn'),
    modeSongBtn: document.getElementById('modeSongBtn'),
    modePlayBtn: document.getElementById('modePlayBtn'),
    modeHelpBtn: document.getElementById('modeHelpBtn'),
    trainerView: document.getElementById('trainerView'),
    tunerView: document.getElementById('tunerView'),
    pentatonicView: document.getElementById('pentatonicView'),
    riffView: document.getElementById('riffView'),
    songView: document.getElementById('songView'),
    playView: document.getElementById('playView'),
    helpView: document.getElementById('helpView'),
    helpChordDemo: document.getElementById('helpChordDemo'),
    helpScaleDemo: document.getElementById('helpScaleDemo'),
    tunerCard: document.getElementById('tunerCard'),
    tunerNote: document.getElementById('tunerNote'),
    tunerCents: document.getElementById('tunerCents'),
    tunerFreq: document.getElementById('tunerFreq'),
    tunerNeedle: document.getElementById('tunerNeedle'),
    tunerStatus: document.getElementById('tunerStatus'),
    tunerStatusDot: document.getElementById('tunerStatusDot'),
    tunerTarget: document.getElementById('tunerTarget'),
    tunerStrings: document.getElementById('tunerStrings'),
    tunerAuto: document.getElementById('tunerAuto'),
    refToneBtn: document.getElementById('refToneBtn'),
    tunerLive: document.getElementById('tunerLive'),
    scaleHeading: document.getElementById('scaleHeading'),
    scaleNotes: document.getElementById('scaleNotes'),
    scaleRoot: document.getElementById('scaleRoot'),
    scaleMinorBtn: document.getElementById('scaleMinorBtn'),
    scaleMajorBtn: document.getElementById('scaleMajorBtn'),
    scaleFretboard: document.getElementById('scaleFretboard'),
    scalePatterns: document.getElementById('scalePatterns'),
    scaleRange: document.getElementById('scaleRange'),
    cagedRoot: document.getElementById('cagedRoot'),
    cagedGrid: document.getElementById('cagedGrid'),
    cagedSummary: document.getElementById('cagedSummary'),
    chordPlayBtn: document.getElementById('chordPlayBtn'),
    practiceCard: document.getElementById('practiceCard'),
    practiceDot: document.getElementById('practiceDot'),
    practiceStatus: document.getElementById('practiceStatus'),
    practiceProgressLabel: document.getElementById('practiceProgressLabel'),
    practiceTarget: document.getElementById('practiceTarget'),
    practiceTargetLabel: document.getElementById('practiceTargetLabel'),
    practiceDetected: document.getElementById('practiceDetected'),
    practiceInfo: document.getElementById('practiceInfo'),
    practiceMeter: document.getElementById('practiceMeter'),
    practiceProgressFill: document.getElementById('practiceProgressFill'),
    practiceSequence: document.getElementById('practiceSequence'),
    scaleBackward: document.getElementById('scaleBackward'),
    scalePreviewBtn: document.getElementById('scalePreviewBtn'),
    scaleRepeats: document.getElementById('scaleRepeats'),
    repeatsValue: document.getElementById('repeatsValue'),
    practiceStart: document.getElementById('practiceStart'),
    practiceStop: document.getElementById('practiceStop'),
    practiceHint: document.getElementById('practiceHint'),
    practiceLive: document.getElementById('practiceLive'),
    songHeading: document.getElementById('songHeading'),
    songMeta: document.getElementById('songMeta'),
    songSelect: document.getElementById('songSelect'),
    songInfo: document.getElementById('songInfo'),
    songChord: document.getElementById('songChord'),
    songChordName: document.getElementById('songChordName'),
    songNext: document.getElementById('songNext'),
    songFretboard: document.getElementById('songFretboard'),
    songTimeline: document.getElementById('songTimeline'),
    songControls: document.getElementById('songControls'),
    songDot: document.getElementById('songDot'),
    songStatus: document.getElementById('songStatus'),
    songProgressLabel: document.getElementById('songProgressLabel'),
    songMeter: document.getElementById('songMeter'),
    songMeterFill: document.getElementById('songMeterFill'),
    songLevel: document.getElementById('songLevel'),
    songScore: document.getElementById('songScore'),
    songBpmSlider: document.getElementById('songBpmSlider'),
    songBpmValue: document.getElementById('songBpmValue'),
    songListenBtn: document.getElementById('songListenBtn'),
    songBeatDots: document.getElementById('songBeatDots'),
    songStart: document.getElementById('songStart'),
    songStop: document.getElementById('songStop'),
    songHint: document.getElementById('songHint'),
    songLive: document.getElementById('songLive'),
    playHeading: document.getElementById('playHeading'),
    playMeta: document.getElementById('playMeta'),
    playInfo: document.getElementById('playInfo'),
    playFileInput: document.getElementById('playFileInput'),
    playTrackSelect: document.getElementById('playTrackSelect'),
    playTimedBtn: document.getElementById('playTimedBtn'),
    playWaitBtn: document.getElementById('playWaitBtn'),
    playSpeed: document.getElementById('playSpeed'),
    playSpeedValue: document.getElementById('playSpeedValue'),
    playHighway: document.getElementById('playHighway'),
    playCanvas: document.getElementById('playCanvas'),
    playTarget: document.getElementById('playTarget'),
    playDetected: document.getElementById('playDetected'),
    playProgressLabel: document.getElementById('playProgressLabel'),
    playMeter: document.getElementById('playMeter'),
    playProgressFill: document.getElementById('playProgressFill'),
    playScore: document.getElementById('playScore'),
    playCombo: document.getElementById('playCombo'),
    playAccuracy: document.getElementById('playAccuracy'),
    playStatus: document.getElementById('playStatus'),
    playDot: document.getElementById('playDot'),
    playStart: document.getElementById('playStart'),
    playStop: document.getElementById('playStop'),
    playClickBtn: document.getElementById('playClickBtn'),
    playHint: document.getElementById('playHint'),
    playCard: document.getElementById('playCard'),
    playLive: document.getElementById('playLive'),
    riffHeading: document.getElementById('riffHeading'),
    riffMeta: document.getElementById('riffMeta'),
    riffSelect: document.getElementById('riffSelect'),
    riffInfo: document.getElementById('riffInfo'),
    riffFretboard: document.getElementById('riffFretboard'),
    riffPracticeCard: document.getElementById('riffPracticeCard'),
    riffDot: document.getElementById('riffDot'),
    riffStatus: document.getElementById('riffStatus'),
    riffProgressLabel: document.getElementById('riffProgressLabel'),
    riffTarget: document.getElementById('riffTarget'),
    riffTargetLabel: document.getElementById('riffTargetLabel'),
    riffDetected: document.getElementById('riffDetected'),
    riffPosition: document.getElementById('riffPosition'),
    riffMeter: document.getElementById('riffMeter'),
    riffProgressFill: document.getElementById('riffProgressFill'),
    riffSequence: document.getElementById('riffSequence'),
    riffPreviewBtn: document.getElementById('riffPreviewBtn'),
    riffStart: document.getElementById('riffStart'),
    riffStop: document.getElementById('riffStop'),
    riffClickBtn: document.getElementById('riffClickBtn'),
    riffHint: document.getElementById('riffHint'),
    riffLive: document.getElementById('riffLive'),
    riffBeatDots: document.getElementById('riffBeatDots'),
    chordHeading: document.getElementById('chordHeading'),
    chordNotes: document.getElementById('chordNotes'),
    chordTip: document.getElementById('chordTip'),
    fretboard: document.getElementById('fretboard'),
    detectionCard: document.getElementById('detectionCard'),
    statusText: document.getElementById('statusText'),
    statusDot: document.getElementById('statusDot'),
    scoreText: document.getElementById('scoreText'),
    meter: document.getElementById('meter'),
    meterFill: document.getElementById('meterFill'),
    levelText: document.getElementById('levelText'),
    statsInline: document.getElementById('statsInline'),
    liveStatus: document.getElementById('liveStatus'),
    bpmSlider: document.getElementById('bpmSlider'),
    bpmValue: document.getElementById('bpmValue'),
    metroToggle: document.getElementById('metroToggle'),
    beatDots: document.getElementById('beatDots'),
    chordButtons: document.getElementById('chordButtons'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    helpModal: document.getElementById('helpModal'),
    helpModalBody: document.getElementById('helpModalBody'),
    closeHelp: document.getElementById('closeHelp'),
    deviceSelect: document.getElementById('deviceSelect'),
    refreshDevices: document.getElementById('refreshDevices'),
    resetStats: document.getElementById('resetStats'),
    exportStats: document.getElementById('exportStats'),
    statsText: document.getElementById('statsText'),
    statsBreakdown: document.getElementById('statsBreakdown'),
    appVersion: document.getElementById('appVersion'),
    repoLink: document.getElementById('repoLink'),
    kofiLink: document.getElementById('kofiLink'),
    toast: document.getElementById('toast')
  };

  const state = {
    chordId: 'G',
    mode: storedPrefs.mode,
    tuningStringIndex: storedPrefs.tuningStringIndex,
    tunerAuto: storedPrefs.tunerAuto,
    tunerAutoCandidate: null,
    tunerAutoFrames: 0,
    tunerSmoothCents: null,
    tunerWasInTune: false,
    scale: {
      rootPc: storedPrefs.scale.rootPc,
      type: storedPrefs.scale.type,
      pattern: storedPrefs.scale.pattern,
      repeats: storedPrefs.scale.repeats,
      backward: storedPrefs.scale.backward,
      sequence: [],
      active: false,
      index: 0,
      hits: 0,
      misses: 0,
      needRelease: false,
      candidateFrames: 0,
      missLatched: false,
      lastLevelDb: null,
      lastHitAt: 0,
      lastHitPc: null,
      graceUntil: 0,
      feedbackUntil: 0
    },
    previewTimers: [],
    riff: {
      riffId: storedPrefs.riffId,
      notes: [],
      index: 0,
      hits: 0,
      misses: 0,
      active: false,
      needRelease: false,
      candidateFrames: 0,
      missLatched: false,
      lastLevelDb: null,
      lastHitPc: null,
      graceUntil: 0,
      feedbackUntil: 0,
      previewTimers: [],
      beatTimeout: null
    },
    song: {
      songId: SONGS[0].id,
      tempo: SONGS[0].bpm,
      active: false,
      barIndex: 0,
      attempts: 0,
      correct: 0,
      started: false,
      lastAttemptAt: 0,
      feedbackUntil: 0,
      barChangedAt: 0,
      beatTimeout: null,
      listenActive: false,
      listenTimers: [],
      listenToken: 0
    },
    running: false,
    cagedRootPc: storedPrefs.cagedRoot,
    audioPreviewUntil: 0,
    play: {
      song: null,
      tracks: [],
      trackIndex: 0,
      chart: null,
      session: null,
      mode: storedPrefs.playMode,
      speed: storedPrefs.playSpeed / 100,
      active: false,
      finished: false,
      frame: null,
      needRelease: false,
      lastLevelDb: null,
      lastHitPc: null,
      wrongLatched: false,
      lastDetected: '',
      lastStatus: '',
      statusHoldUntil: 0,
      sourceLabel: 'Demo',
      fileError: ''
    },
    selectedDeviceId: storedPrefs.deviceId,
    stats: Stats.loadStats(window.localStorage, CHORD_ORDER),
    statusHoldUntil: 0,
    beatTimeout: null,
    toastTimer: null
  };

  const engine = new AudioEngine({
    onUpdate: handleUpdate,
    onAttempt: handleAttempt,
    onTrackEnded: handleTrackEnded,
    onPitchUpdate: handlePitchUpdate,
    onGameUpdate: handleGameUpdate,
    onError: () => {}
  });

  const metronome = new Metronome({
    getContext: () => engine.ctx,
    onBeat: handleBeat,
    onStateChange: handleMetroState,
    bpm: storedPrefs.bpm
  });

  const songMetronome = new Metronome({
    getContext: () => engine.ctx,
    onBeat: handleSongBeat,
    onStateChange: handleSongMetroState,
    bpm: SONGS[0].bpm
  });

  const riffMetronome = new Metronome({
    getContext: () => engine.ctx,
    onBeat: handleRiffBeat,
    onStateChange: handleRiffMetroState,
    bpm: RIFFS[0].bpm
  });

  const START_BTN_HTML = '<span aria-hidden="true">🎤</span> Mikrofon aktivieren';

  function persistPrefs() {
    Prefs.savePrefs(window.localStorage, {
      mode: state.mode,
      bpm: metronome.bpm,
      tuningStringIndex: state.tuningStringIndex,
      tunerAuto: state.tunerAuto,
      scale: {
        rootPc: state.scale.rootPc,
        type: state.scale.type,
        pattern: state.scale.pattern,
        repeats: state.scale.repeats,
        backward: state.scale.backward
      },
      cagedRoot: state.cagedRootPc,
      playMode: state.play.mode,
      playSpeed: Math.round(state.play.speed * 100),
      riffId: state.riff.riffId,
      deviceId: state.selectedDeviceId
    });
  }

  /* ---------- Statistik ---------- */

  function renderStats() {
    const summary = Stats.summarize(state.stats, CHORD_ORDER);
    const percent = summary.total > 0 ? Math.round((summary.correct / summary.total) * 100) : 0;
    els.statsInline.textContent = `Treffer ${summary.correct} / ${summary.total}`;
    els.statsText.textContent = summary.total > 0
      ? `${summary.correct} von ${summary.total} richtig (${percent} %)`
      : 'Noch keine Versuche';
    renderStatsBreakdown(summary);
  }

  function renderStatsBreakdown(summary) {
    if (!els.statsBreakdown) return;
    els.statsBreakdown.textContent = '';

    const addRow = (labelText, correct, total) => {
      const row = document.createElement('div');
      row.className = 'stats-row';

      const label = document.createElement('span');
      label.textContent = labelText;

      const bar = document.createElement('span');
      bar.className = 'stats-bar';
      const fill = document.createElement('i');
      fill.style.width = `${total > 0 ? Math.round((correct / total) * 100) : 0}%`;
      bar.append(fill);

      const value = document.createElement('span');
      value.className = 'stats-row-value';
      value.textContent = `${correct} / ${total}`;

      row.append(label, bar, value);
      els.statsBreakdown.append(row);
    };

    summary.rows.forEach((row) => {
      addRow((CHORDS[row.id] && CHORDS[row.id].name) || row.id, row.correct, row.total);
    });
    if (summary.unassignedTotal > 0) {
      addRow('Altbestand', summary.unassignedCorrect, summary.unassignedTotal);
    }
  }

  function exportStatsCsv() {
    const csv = `\uFEFF${Stats.buildCsv(state.stats, CHORDS, CHORD_ORDER)}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = Stats.exportFilename();
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast('Statistik als CSV exportiert');
  }

  /* ---------- Status / Meter ---------- */

  function setStatus(text, kind, holdMs) {
    els.statusText.textContent = text;
    els.statusDot.className = 'status-dot' + (kind ? ` is-${kind}` : '');
    if (holdMs) state.statusHoldUntil = performance.now() + holdMs;
  }

  function setLiveStatus(text, kind) {
    if (performance.now() < state.statusHoldUntil) return;
    setStatus(text, kind, 0);
  }

  function resetMeter() {
    els.meterFill.style.width = '0%';
    els.meter.setAttribute('aria-valuenow', '0');
    els.scoreText.textContent = '0 %';
    els.levelText.textContent = 'Pegel: still';
    els.detectionCard.classList.remove('is-good');
    els.detectionCard.classList.remove('is-warn');
  }

  function handleUpdate(update) {
    if (state.mode === 'song') {
      handleSongUpdate(update);
      return;
    }
    if (state.mode === 'help') return;
    if (performance.now() < state.audioPreviewUntil) return;
    const target = CHORDS[state.chordId];
    const score = update.silent ? 0 : update.bestScore;
    const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
    const detected = update.bestId && update.bestScore >= MATCH_SCORE ? CHORDS[update.bestId] : null;
    const isTarget = Boolean(detected && detected.id === target.id);

    els.meterFill.style.width = `${percent}%`;
    els.meter.setAttribute('aria-valuenow', String(percent));
    els.scoreText.textContent = `${percent} %`;
    els.levelText.textContent = update.silent ? 'Pegel: still' : `Pegel: ${Math.round(update.levelDb)} dB`;
    els.detectionCard.classList.toggle('is-good', isTarget);
    els.detectionCard.classList.toggle('is-warn', Boolean(detected && !isTarget));

    if (isTarget) {
      setLiveStatus(`${target.symbol} erkannt ✓`, 'good');
    } else if (detected) {
      setLiveStatus(`Gehört: ${detected.symbol}`, 'warn');
    } else if (update.silent) {
      setLiveStatus('Warte auf Akkord …', '');
    } else {
      setLiveStatus(`Spiele ${target.symbol} …`, 'listening');
    }
  }

  function handleAttempt(attempt) {
    if (state.mode === 'song') {
      handleSongAttempt(attempt);
      return;
    }
    if (state.mode === 'help') return;
    if (performance.now() < state.audioPreviewUntil) return;
    const target = CHORDS[state.chordId];
    const heard = CHORDS[attempt.id];
    const success = attempt.id === target.id;

    state.stats = Stats.recordAttempt(state.stats, CHORD_ORDER, target.id, success);
    Stats.saveStats(window.localStorage, state.stats);
    renderStats();

    if (success) {
      setStatus(`${target.symbol} erkannt ✓`, 'good', 1600);
      if (els.liveStatus) els.liveStatus.textContent = `${target.name} richtig erkannt.`;
      pulseDetectionCard();
      if (navigator.vibrate) navigator.vibrate([35, 40, 70]);
    } else {
      setStatus(`Gehört: ${heard.symbol}`, 'warn', 1800);
      if (els.liveStatus) els.liveStatus.textContent = `Falscher Akkord. Gehört: ${heard.name}. Ziel: ${target.name}.`;
    }
  }

  function pulseDetectionCard() {
    els.detectionCard.classList.remove('pulse');
    void els.detectionCard.offsetWidth;
    els.detectionCard.classList.add('pulse');
    window.setTimeout(() => els.detectionCard.classList.remove('pulse'), 760);
  }

  /* ---------- Akkorde ---------- */

  function buildChordButtons() {
    CHORD_ORDER.forEach((id) => {
      const chord = CHORDS[id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chord-btn';
      button.dataset.chord = id;
      button.setAttribute('aria-pressed', String(id === state.chordId));

      const symbol = document.createElement('span');
      symbol.className = 'cb-symbol';
      symbol.textContent = chord.name;
      const notes = document.createElement('span');
      notes.className = 'cb-notes';
      notes.textContent = chord.notes.join(' · ');

      button.append(symbol, notes);
      button.addEventListener('click', () => {
        selectChord(id);
        syncCagedToChord(id);
      });
      els.chordButtons.append(button);
    });
  }

  /** CAGED-Karte auf den Grundton des gewählten Akkords stellen. */
  function syncCagedToChord(id) {
    const chord = CHORDS[id];
    if (!chord || !chord.pitchClasses.length) return;
    const rootPc = ((Number(chord.pitchClasses[0]) % 12) + 12) % 12;
    if (rootPc === state.cagedRootPc) return;
    state.cagedRootPc = rootPc;
    updateCagedDisplay();
    persistPrefs();
  }

  function selectChord(id) {
    if (!CHORDS[id]) return;
    state.chordId = id;
    state.statusHoldUntil = 0;

    const chord = CHORDS[id];
    els.chordHeading.textContent = chord.name;
    els.chordNotes.textContent = chord.notes.join(' · ');
    els.chordTip.textContent = chord.tip;
    els.fretboard.innerHTML = renderFretboard(chord);

    els.chordButtons.querySelectorAll('.chord-btn').forEach((button) => {
      const active = button.dataset.chord === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    engine.resetDetection();
    resetMeter();

    if (state.running) {
      setStatus(`Spiele ${chord.symbol} …`, 'listening', 0);
      setLiveStatus(`Spiele ${chord.symbol} …`, 'listening');
    }
  }

  /** Spielt den aktuellen Akkord als E-Gitarren-Strum vor. */
  async function playSelectedChord() {
    const chord = CHORDS[state.chordId];
    if (!chord) return;
    const frequencies = chordFrequencies(chord);
    if (!frequencies.length) return;

    // Eigene Wiedergabe nicht als Mikrofon-Treffer werten.
    state.audioPreviewUntil = performance.now() + 2900;
    if (els.chordPlayBtn) els.chordPlayBtn.disabled = true;
    try {
      await engine.playChord(frequencies, { duration: 2.4, strumSec: 0.04, peak: 0.36 });
      setLiveStatus(`${chord.symbol} angeschlagen · ${chord.name}`, '');
    } catch (error) {
      toast('Akkord konnte nicht abgespielt werden.');
    } finally {
      window.setTimeout(() => {
        if (els.chordPlayBtn) els.chordPlayBtn.disabled = false;
      }, 700);
    }
  }

  /* ---------- CAGED ---------- */

  function buildCagedRootOptions() {
    if (!els.cagedRoot) return;
    NOTE_NAMES.forEach((name, pitchClass) => {
      els.cagedRoot.add(new Option(name, String(pitchClass)));
    });
    els.cagedRoot.value = String(state.cagedRootPc);
  }

  function updateCagedDisplay() {
    if (!els.cagedGrid) return;
    const rootPc = state.cagedRootPc;
    const shapes = buildCagedShapes(rootPc);
    const rootName = NOTE_NAMES[rootPc];
    if (els.cagedSummary) {
      els.cagedSummary.textContent = `Akkordtöne von ${rootName}-Dur: ` +
        `${rootName} · ${NOTE_NAMES[(rootPc + 4) % 12]} · ${NOTE_NAMES[(rootPc + 7) % 12]}. ` +
        'Die fünf Formen decken das ganze Griffbrett ab.';
    }

    els.cagedGrid.innerHTML = shapes.map((shape) => {
      const range = visibleRange(shape);
      const chord = {
        name: `${shape.chordName} · ${shape.name}`,
        frets: shape.frets,
        fingers: []
      };
      return `
        <article class="caged-item" data-shape="${shape.id}">
          <div class="caged-item-head">
            <h3>${shape.name}</h3>
            <span>${shape.rootName} · ${shape.rootDescription}</span>
          </div>
          <div class="caged-diagram">${renderFretboard(chord, {
            startFret: range.startFret,
            fretCount: range.fretCount,
            showFingers: false
          })}</div>
        </article>`;
    }).join('');

    els.cagedRoot.value = String(rootPc);
  }

  function setCagedRoot(rootPc) {
    const parsed = Math.round(Number(rootPc));
    if (!Number.isFinite(parsed)) return;
    state.cagedRootPc = ((parsed % 12) + 12) % 12;
    updateCagedDisplay();
    persistPrefs();
  }

  /* ---------- Modus & Stimmgerät ---------- */

  function applyMode(mode) {
    const next = (mode === 'tuner' || mode === 'pentatonic' || mode === 'riff' || mode === 'song' || mode === 'play' || mode === 'help')
      ? mode
      : 'trainer';
    const tunerActive = next === 'tuner';
    const pentatonicActive = next === 'pentatonic';
    const riffActive = next === 'riff';
    const songActive = next === 'song';
    const playActive = next === 'play';
    const helpActive = next === 'help';
    state.mode = next;
    engine.stopReferenceTone();
    engine.stopToneSequence();

    els.modeTrainerBtn.classList.toggle('active', next === 'trainer');
    els.modeTunerBtn.classList.toggle('active', tunerActive);
    els.modePentatonicBtn.classList.toggle('active', pentatonicActive);
    els.modeRiffBtn.classList.toggle('active', riffActive);
    els.modeSongBtn.classList.toggle('active', songActive);
    els.modePlayBtn.classList.toggle('active', playActive);
    els.modeHelpBtn.classList.toggle('active', helpActive);
    els.modeTrainerBtn.setAttribute('aria-pressed', String(next === 'trainer'));
    els.modeTunerBtn.setAttribute('aria-pressed', String(tunerActive));
    els.modePentatonicBtn.setAttribute('aria-pressed', String(pentatonicActive));
    els.modeRiffBtn.setAttribute('aria-pressed', String(riffActive));
    els.modeSongBtn.setAttribute('aria-pressed', String(songActive));
    els.modePlayBtn.setAttribute('aria-pressed', String(playActive));
    els.modeHelpBtn.setAttribute('aria-pressed', String(helpActive));

    els.trainerView.hidden = next !== 'trainer';
    els.tunerView.hidden = !tunerActive;
    els.pentatonicView.hidden = !pentatonicActive;
    els.riffView.hidden = !riffActive;
    els.songView.hidden = !songActive;
    els.playView.hidden = !playActive;
    els.helpView.hidden = !helpActive;

    if (!songActive) stopSong();
    if (!riffActive) stopRiff();
    if (!playActive) stopPlay();

    if (tunerActive) {
      stopPractice();
      metronome.stop();
      engine.setMode('tuner');
      state.tunerSmoothCents = null;
      state.tunerWasInTune = false;
      state.tunerAutoCandidate = null;
      state.tunerAutoFrames = 0;
      updateTunerTarget();
      resetTunerDisplay();
    } else if (pentatonicActive) {
      stopPractice();
      metronome.stop();
      engine.setMode('scale');
      updateScaleDisplay();
    } else if (songActive) {
      stopPractice();
      metronome.stop();
      stopSong();
      engine.setChordOrder(CHORD_ORDER);
      engine.setMode('chords');
      initSongView();
    } else if (riffActive) {
      stopPractice();
      metronome.stop();
      stopSong();
      engine.setMode('scale');
      initRiffView();
    } else if (playActive) {
      stopPractice();
      metronome.stop();
      stopSong();
      engine.setMode('game');
      initPlayView();
    } else if (helpActive) {
      stopPractice();
      metronome.stop();
      engine.setMode('chords');
    } else {
      stopPractice();
      stopSong();
      engine.setMode('chords');
      selectChord(state.chordId);
    }

    persistPrefs();
  }

  function buildTunerStrings() {
    TUNING_STRINGS.forEach((string, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'string-btn';
      button.dataset.stringIndex = String(index);
      button.setAttribute('aria-pressed', String(index === state.tuningStringIndex));
      button.setAttribute('aria-label', `${string.id}, ${string.description}, ${formatHz(string.frequency)}`);

      const note = document.createElement('span');
      note.className = 'string-note';
      note.textContent = string.id;

      const hz = document.createElement('span');
      hz.className = 'string-hz';
      hz.textContent = formatHz(string.frequency).replace(' Hz', '');

      button.append(note, hz);
      button.addEventListener('click', () => selectTuningString(index));
      els.tunerStrings.append(button);
    });
  }

  function updateTunerTarget() {
    const target = TUNING_STRINGS[state.tuningStringIndex];
    const prefix = state.tunerAuto ? 'Auto · ' : '';
    els.tunerTarget.textContent = `${prefix}${target.id} · ${formatHz(target.frequency)}`;
    els.refToneBtn.textContent = `Referenzton ${target.id} abspielen`;
    els.tunerAuto.checked = state.tunerAuto;
    els.tunerStrings.querySelectorAll('.string-btn').forEach((button) => {
      const active = Number(button.dataset.stringIndex) === state.tuningStringIndex;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function selectTuningString(index) {
    if (!TUNING_STRINGS[index]) return;
    if (state.tunerAuto) setTunerAuto(false, false);
    state.tuningStringIndex = index;
    state.tunerSmoothCents = null;
    state.tunerWasInTune = false;
    state.tunerAutoCandidate = null;
    state.tunerAutoFrames = 0;
    engine.stopReferenceTone();
    updateTunerTarget();
    resetTunerDisplay();
    persistPrefs();
  }

  function setTunerAuto(enabled, persist) {
    state.tunerAuto = Boolean(enabled);
    state.tunerAutoCandidate = null;
    state.tunerAutoFrames = 0;
    state.tunerSmoothCents = null;
    state.tunerWasInTune = false;
    els.tunerAuto.checked = state.tunerAuto;
    updateTunerTarget();
    resetTunerDisplay();
    if (persist !== false) persistPrefs();
  }

  function setTunerStatus(text, kind) {
    els.tunerStatus.textContent = text;
    els.tunerStatusDot.className = 'status-dot' + (kind ? ` is-${kind}` : '');
  }

  function resetTunerDisplay() {
    const target = TUNING_STRINGS[state.tuningStringIndex];
    els.tunerNote.textContent = '–';
    els.tunerNote.classList.remove('in-tune');
    els.tunerCents.textContent = '0 Cent';
    els.tunerFreq.textContent = 'Kein Signal';
    els.tunerNeedle.style.left = '50%';
    els.tunerCard.classList.remove('is-good');
    els.tunerCard.classList.remove('is-warn');
    els.tunerLive.textContent = '';
    setTunerStatus(
      state.tunerAuto
        ? 'Auto-Erkennung aktiv – Spiele eine Saite an …'
        : `Spiele die ${target.description} …`,
      ''
    );
  }

  function handleTunerUpdate(update) {
    if (state.mode !== 'tuner') return;

    if (!update.pitch) {
      state.tunerAutoCandidate = null;
      state.tunerAutoFrames = 0;
      const target = TUNING_STRINGS[state.tuningStringIndex];
      state.tunerSmoothCents = null;
      state.tunerWasInTune = false;
      els.tunerNote.textContent = '–';
      els.tunerNote.classList.remove('in-tune');
      els.tunerCents.textContent = '0 Cent';
      els.tunerFreq.textContent = update.silent ? 'Kein Signal' : 'Ton unklar';
      els.tunerNeedle.style.left = '50%';
      els.tunerCard.classList.remove('is-good');
      els.tunerCard.classList.remove('is-warn');
      const idleText = state.tunerAuto
        ? 'Auto-Erkennung aktiv – Spiele eine Saite an …'
        : `Spiele die ${target.description} …`;
      setTunerStatus(
        update.silent ? idleText : 'Ton unklar – näher ans Mikrofon',
        update.silent ? '' : 'warn'
      );
      els.tunerLive.textContent = '';
      return;
    }

    // Auto-Modus: Die angeschlagene Saite wird aus der Tonhöhe bestimmt.
    // Erst nach zwei gleichen Messungen umschalten, damit der Zeiger nicht
    // zwischen benachbarten Saiten hin und her springt.
    if (state.tunerAuto) {
      const detectedIndex = nearestStringIndex(update.pitch.frequency);
      if (detectedIndex !== state.tuningStringIndex) {
        if (state.tunerAutoCandidate === detectedIndex) {
          state.tunerAutoFrames += 1;
        } else {
          state.tunerAutoCandidate = detectedIndex;
          state.tunerAutoFrames = 1;
        }
        if (state.tunerAutoFrames >= 2) {
          state.tuningStringIndex = detectedIndex;
          state.tunerSmoothCents = null;
          state.tunerWasInTune = false;
          state.tunerAutoCandidate = null;
          state.tunerAutoFrames = 0;
          updateTunerTarget();
          persistPrefs();
          els.tunerLive.textContent = `Auto-Erkennung: ${TUNING_STRINGS[detectedIndex].id} erkannt.`;
        }
      } else {
        state.tunerAutoCandidate = null;
        state.tunerAutoFrames = 0;
      }
    }

    const target = TUNING_STRINGS[state.tuningStringIndex];
    const note = frequencyToNote(update.pitch.frequency);
    const rawCents = centsFromFrequency(update.pitch.frequency, target.frequency);
    if (rawCents === null) return;

    state.tunerSmoothCents = state.tunerSmoothCents === null
      ? rawCents
      : state.tunerSmoothCents * 0.65 + rawCents * 0.35;
    const cents = state.tunerSmoothCents;
    const tuned = isInTune(cents);

    els.tunerNote.textContent = note.label;
    els.tunerNote.classList.toggle('in-tune', tuned);
    els.tunerCents.textContent = formatCents(cents);
    els.tunerFreq.textContent = formatHz(update.pitch.frequency);

    const clamped = Math.max(-GAUGE_RANGE_CENTS, Math.min(GAUGE_RANGE_CENTS, cents));
    els.tunerNeedle.style.left = `${50 + (clamped / GAUGE_RANGE_CENTS) * 50}%`;

    els.tunerCard.classList.toggle('is-good', tuned);
    els.tunerCard.classList.toggle('is-warn', !tuned);

    if (tuned) {
      setTunerStatus(`${target.id} stimmt ✓`, 'good');
      if (!state.tunerWasInTune) {
        els.tunerLive.textContent = `${target.id} ist gestimmt.`;
        if (navigator.vibrate) navigator.vibrate(25);
      }
    } else if (Math.abs(note.midi - target.midi) >= 2) {
      setTunerStatus(`Erkannt: ${note.label} · Ziel ${target.id}`, 'warn');
    } else {
      const direction = cents < 0 ? 'zu tief' : 'zu hoch';
      setTunerStatus(`${target.id} ${direction} · ${formatCents(cents)}`, 'warn');
    }
    state.tunerWasInTune = tuned;
  }

  async function playReferenceTone() {
    const target = TUNING_STRINGS[state.tuningStringIndex];
    try {
      await engine.playReferenceTone(target.frequency, 1.6);
    } catch (error) {
      toast('Referenzton konnte nicht abgespielt werden.');
    }
  }

  /* ---------- Pentatonik ---------- */

  function buildScaleRootOptions() {
    NOTE_NAMES.forEach((name, pitchClass) => {
      els.scaleRoot.add(new Option(name, String(pitchClass)));
    });
    els.scaleRoot.value = String(state.scale.rootPc);
  }

  function updateScaleTypeButtons() {
    const minor = state.scale.type === 'minor';
    els.scaleMinorBtn.classList.toggle('active', minor);
    els.scaleMajorBtn.classList.toggle('active', !minor);
    els.scaleMinorBtn.setAttribute('aria-pressed', String(minor));
    els.scaleMajorBtn.setAttribute('aria-pressed', String(!minor));
  }

  function applyScaleType(type) {
    if (state.scale.type === type) return;
    state.scale.type = type;
    stopPractice();
    updateScaleDisplay();
    refreshPracticeSequence();
    persistPrefs();
  }

  function currentPattern() {
    return PENTATONIC_PATTERNS[state.scale.pattern - 1] || PENTATONIC_PATTERNS[0];
  }

  function buildPatternButtons() {
    if (!els.scalePatterns) return;
    PENTATONIC_PATTERNS.forEach((pattern) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pattern-btn';
      button.dataset.pattern = String(pattern.id);
      button.textContent = String(pattern.id);
      button.setAttribute('aria-label', `${pattern.name}: ${pattern.description}`);
      button.setAttribute('aria-pressed', String(pattern.id === state.scale.pattern));
      button.addEventListener('click', () => selectPattern(pattern.id));
      els.scalePatterns.append(button);
    });
  }

  function updatePatternButtons() {
    if (!els.scalePatterns) return;
    els.scalePatterns.querySelectorAll('.pattern-btn').forEach((button) => {
      const active = Number(button.dataset.pattern) === state.scale.pattern;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function selectPattern(patternId) {
    const parsed = Math.round(Number(patternId));
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(1, Math.min(PATTERN_COUNT, parsed));
    if (next === state.scale.pattern) return;
    state.scale.pattern = next;
    stopPractice();
    updateScaleDisplay();
    refreshPracticeSequence();
    persistPrefs();
  }

  function updateScaleDisplay() {
    const { rootPc, type, pattern } = state.scale;
    const pcs = scalePitchClasses(rootPc, type);
    const activePattern = currentPattern();
    const range = patternFretRange(rootPc, type, pattern);
    els.scaleHeading.textContent = scaleLabel(rootPc, type);
    els.scaleNotes.textContent = pcs.map((pc) => NOTE_NAMES[pc]).join(' · ');
    els.scaleFretboard.innerHTML = renderPentatonicFretboard(rootPc, type, { pattern });
    if (els.scaleRange) {
      els.scaleRange.textContent = `${activePattern.name} · Bünde ${range.firstFret}–${range.lastFret} · ${activePattern.description}`;
    }
    if (els.helpScaleDemo) {
      els.helpScaleDemo.innerHTML = renderPentatonicFretboard(rootPc, type);
    }
    els.scaleRoot.value = String(rootPc);
    els.scaleBackward.checked = state.scale.backward;
    updateScaleTypeButtons();
    updatePatternButtons();
    updateScaleHighlight();
  }

  function totalScaleRuns() {
    return PENTATONIC_RUNS + (state.scale.backward ? 1 : 0);
  }

  function updatePracticeRunLabel() {
    const scale = state.scale;
    const note = scale.sequence[scale.active ? scale.index : 0];
    const run = note ? note.run : 1;
    const direction = note && note.direction === 'down' ? ' · rückwärts' : '';
    els.practiceTargetLabel.textContent = `Tonfolge ${run} / ${totalScaleRuns()}${direction} · ${currentPattern().name}`;
  }

  function refreshPracticeSequence() {
    const scale = state.scale;
    const pattern = currentPattern();
    scale.sequence = buildPatternSequence(
      scale.rootPc,
      scale.type,
      scale.pattern,
      PENTATONIC_RUNS,
      scale.repeats,
      scale.backward
    );
    els.practiceInfo.textContent = `${PENTATONIC_RUNS} Tonfolgen · ${pattern.name} · ${scale.repeats}× pro Ton` +
      (scale.backward ? ' · + rückwärts' : '');
    els.scaleBackward.checked = scale.backward;
    renderPracticeSequence();

    if (!scale.active) {
      const first = scale.sequence[0];
      els.practiceTarget.textContent = first ? first.name : '–';
      els.practiceTarget.classList.remove('is-good');
      els.practiceDetected.textContent = 'Erkannt: –';
      updatePracticeRunLabel();
      updatePracticeProgress();
      updateScaleHighlight();
    }
  }

  function renderPracticeSequence() {
    els.practiceSequence.textContent = '';
    const scale = state.scale;
    const sequence = scale.sequence;
    const total = sequence.length;
    if (!total) return;

    const visibleCount = 10;
    const anchorIndex = scale.active
      ? Math.min(scale.index, total - 1)
      : (scale.index >= total ? total - 1 : 0);
    const anchor = sequence[anchorIndex];
    const runStart = anchor ? sequence.findIndex((note) => note.run === anchor.run) : -1;
    const start = runStart >= 0 ? runStart : 0;

    sequence.slice(start, start + visibleCount).forEach((note, offset) => {
      const index = start + offset;
      const chip = document.createElement('span');
      chip.className = 'seq-chip';
      chip.dataset.index = String(index);
      chip.textContent = note.name;
      chip.setAttribute('aria-label', `Tonfolge ${note.run}, ${index + 1}. Ton: ${note.name}`);
      els.practiceSequence.append(chip);
    });
    if (start + visibleCount < total) {
      const more = document.createElement('span');
      more.className = 'seq-chip seq-more';
      more.textContent = '…';
      more.setAttribute('aria-hidden', 'true');
      els.practiceSequence.append(more);
    }
    updatePracticeSequenceState();
  }

  function updatePracticeSequenceState() {
    const chips = els.practiceSequence.children;
    for (let i = 0; i < chips.length; i += 1) {
      const index = Number(chips[i].dataset.index);
      chips[i].classList.toggle('is-done', index < state.scale.index);
      chips[i].classList.toggle('is-current', state.scale.active && index === state.scale.index);
    }
  }

  function updatePracticeProgress() {
    const total = state.scale.sequence.length;
    const done = Math.min(state.scale.index, total);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    els.practiceProgressLabel.textContent = `${done} / ${total}`;
    els.practiceProgressFill.style.width = `${percent}%`;
    els.practiceMeter.setAttribute('aria-valuenow', String(percent));
  }

  function setPracticeStatus(text, kind) {
    if (els.practiceStatus.textContent !== text) els.practiceStatus.textContent = text;
    els.practiceDot.className = 'status-dot' + (kind ? ` is-${kind}` : '');
  }

  function updateScaleSliderFill(input, value, min, max) {
    const percent = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${Math.max(0, Math.min(100, percent)).toFixed(1)}%`);
  }

  function syncPracticeControls() {
    els.repeatsValue.textContent = `${state.scale.repeats}×`;
    els.scaleRepeats.value = String(state.scale.repeats);
    els.scaleBackward.checked = state.scale.backward;
    updateScaleSliderFill(els.scaleRepeats, state.scale.repeats, 1, 4);
  }

  function pulsePracticeCard() {
    els.practiceCard.classList.remove('pulse');
    void els.practiceCard.offsetWidth;
    els.practiceCard.classList.add('pulse');
    window.setTimeout(() => els.practiceCard.classList.remove('pulse'), 760);
  }

  function setScaleControlsDisabled(disabled) {
    [els.scaleRoot, els.scaleMinorBtn, els.scaleMajorBtn, els.scaleRepeats, els.scaleBackward, els.scalePreviewBtn]
      .forEach((element) => { element.disabled = disabled; });
  }

  function updateScaleHighlight() {
    const active = state.scale.active;
    const target = active ? state.scale.sequence[state.scale.index] : null;
    const targetPos = target && Number.isInteger(target.stringIndex) && Number.isInteger(target.fret)
      ? `${target.stringIndex}-${target.fret}`
      : null;
    els.scaleFretboard.querySelectorAll('[data-pc]').forEach((element) => {
      const isTarget = target
        ? (targetPos ? element.dataset.pos === targetPos : Number(element.dataset.pc) === target.pc)
        : false;
      element.classList.toggle('is-target', isTarget);
    });
  }

  function clearPreviewTimers() {
    state.previewTimers.forEach((timer) => window.clearTimeout(timer));
    state.previewTimers = [];
    els.scaleFretboard.querySelectorAll('.is-playing')
      .forEach((element) => element.classList.remove('is-playing'));
  }

  async function previewScale() {
    if (state.scale.active) return;
    const { rootPc, type, pattern } = state.scale;
    const notes = buildPatternSequence(rootPc, type, pattern, 1, 1, false);
    const frequencies = notes.map((note) => note.frequency).filter(Number.isFinite);
    if (!frequencies.length) return;
    const noteSec = 0.24;
    const gapSec = 0.05;

    clearPreviewTimers();
    els.scalePreviewBtn.disabled = true;

    let duration = 0;
    try {
      duration = await engine.playToneSequence(frequencies, { noteSec, gapSec });
    } catch (error) {
      els.scalePreviewBtn.disabled = false;
      toast('Vorspielen war nicht möglich.');
      return;
    }

    notes.forEach((note, index) => {
      const timer = window.setTimeout(() => {
        els.scaleFretboard.querySelectorAll('.is-playing')
          .forEach((element) => element.classList.remove('is-playing'));
        const selector = Number.isInteger(note.stringIndex) && Number.isInteger(note.fret)
          ? `[data-pos="${note.stringIndex}-${note.fret}"]`
          : `[data-pc="${note.pc}"]`;
        els.scaleFretboard.querySelectorAll(selector)
          .forEach((element) => element.classList.add('is-playing'));
      }, Math.max(0, index * (noteSec + gapSec) * 1000));
      state.previewTimers.push(timer);
    });

    const endTimer = window.setTimeout(() => {
      clearPreviewTimers();
      els.scalePreviewBtn.disabled = state.scale.active;
    }, Math.max(250, duration * 1000 + 120));
    state.previewTimers.push(endTimer);
  }

  function stopPractice() {
    const scale = state.scale;
    engine.stopToneSequence();
    clearPreviewTimers();
    scale.active = false;
    scale.index = 0;
    scale.hits = 0;
    scale.misses = 0;
    scale.needRelease = false;
    scale.candidateFrames = 0;
    scale.missLatched = false;
    scale.lastLevelDb = null;
    scale.lastHitAt = 0;
    scale.lastHitPc = null;
    scale.graceUntil = 0;
    scale.feedbackUntil = 0;

    setScaleControlsDisabled(false);
    els.practiceStart.hidden = false;
    els.practiceStart.textContent = 'Übung starten';
    els.practiceStop.hidden = true;
    els.practiceCard.classList.remove('is-good');
    els.practiceCard.classList.remove('is-warn');
    els.practiceTarget.classList.remove('is-good');
    setPracticeStatus('Bereit zum Üben', '');
    els.practiceDetected.textContent = 'Erkannt: –';
    els.practiceHint.textContent = `Wähle Grundton, Tongeschlecht und Pattern, dann starte die Übung. ` +
      `${PENTATONIC_RUNS} Tonfolgen durch ${currentPattern().name} warten auf dich.`;

    const first = scale.sequence[0];
    els.practiceTarget.textContent = first ? first.name : '–';
    updatePracticeRunLabel();
    updatePracticeProgress();
    renderPracticeSequence();
    updateScaleHighlight();
  }

  function startPractice() {
    if (!state.running) {
      toast('Bitte zuerst das Mikrofon aktivieren.');
      return;
    }
    if (!state.scale.sequence.length) refreshPracticeSequence();

    engine.stopToneSequence();
    clearPreviewTimers();

    const scale = state.scale;
    scale.active = true;
    scale.index = 0;
    scale.hits = 0;
    scale.misses = 0;
    scale.needRelease = false;
    scale.candidateFrames = 0;
    scale.missLatched = false;
    scale.lastLevelDb = null;
    scale.lastHitAt = 0;
    scale.lastHitPc = null;
    scale.graceUntil = 0;
    scale.feedbackUntil = 0;

    setScaleControlsDisabled(true);
    els.practiceStart.hidden = true;
    els.practiceStop.hidden = false;
    els.practiceCard.classList.remove('is-good');
    els.practiceCard.classList.remove('is-warn');
    els.practiceTarget.classList.remove('is-good');
    els.practiceHint.textContent = scale.backward
      ? 'Jeden Ton einzeln anschlagen. Nach den fünf aufsteigenden Tonfolgen geht es rückwärts wieder abwärts.'
      : 'Jeden Ton einzeln anschlagen. Bei Wiederholungen kurz abdämpfen, damit der nächste Anschlag erkannt wird.';
    els.practiceDetected.textContent = 'Erkannt: –';

    const target = scale.sequence[0];
    els.practiceTarget.textContent = target.name;
    setPracticeStatus(`Spiele ${target.name} …`, 'listening');
    updatePracticeRunLabel();
    updatePracticeProgress();
    renderPracticeSequence();
    updateScaleHighlight();

    engine.setMode('scale');
    metronome.stop();

    if (els.practiceLive) {
      els.practiceLive.textContent = `Übung gestartet. Erste Tonfolge, erster Ton: ${target.name}.`;
    }
  }

  function finishPractice() {
    const scale = state.scale;
    scale.active = false;
    scale.candidateFrames = 0;
    scale.needRelease = false;

    setScaleControlsDisabled(false);
    els.practiceStart.hidden = false;
    els.practiceStart.textContent = 'Nochmal starten';
    els.practiceStop.hidden = true;
    els.practiceTarget.textContent = '✓';
    els.practiceTarget.classList.add('is-good');
    els.practiceTargetLabel.textContent = 'Ergebnis';
    els.practiceDetected.textContent = 'Erkannt: ✓';
    setPracticeStatus('Übung geschafft ✓', 'good');
    els.practiceHint.textContent = `${PENTATONIC_RUNS} Tonfolgen` +
      (scale.backward ? ' auf- und abwärts' : '') + ' geschafft · ' +
      `${scale.hits} von ${scale.sequence.length} Anschlägen richtig` +
      (scale.misses > 0 ? ` · ${scale.misses} Fehler` : '') + '.';
    els.practiceCard.classList.add('is-good');
    pulsePracticeCard();
    updatePracticeProgress();
    renderPracticeSequence();
    updateScaleHighlight();

    if (navigator.vibrate) navigator.vibrate([40, 50, 80]);
    if (els.practiceLive) {
      els.practiceLive.textContent = `${PENTATONIC_RUNS} Tonfolgen geschafft. ` +
        `${scale.hits} von ${scale.sequence.length} Anschlägen richtig.`;
    }
  }

  function acceptPracticeHit(target, now) {
    const scale = state.scale;
    scale.hits += 1;
    scale.index += 1;
    scale.candidateFrames = 0;
    scale.needRelease = true;
    scale.lastHitAt = now;
    scale.lastHitPc = target.pc;
    scale.graceUntil = now + 250;
    scale.missLatched = false;
    scale.feedbackUntil = now + 700;
    els.practiceCard.classList.remove('is-warn');
    els.practiceHint.textContent = `${target.name} richtig ✓`;
    pulsePracticeCard();
    if (navigator.vibrate) navigator.vibrate(20);

    if (scale.index >= scale.sequence.length) {
      finishPractice();
      return;
    }

    const next = scale.sequence[scale.index];
    updatePracticeProgress();
    renderPracticeSequence();
    updateScaleHighlight();
    updatePracticeRunLabel();
    els.practiceTarget.textContent = next.name;
    els.practiceTarget.classList.remove('is-good');
    setPracticeStatus(`Spiele ${next.name} …`, 'listening');
    if (next.run !== target.run) {
      const direction = next.direction === 'down' ? 'Jetzt rückwärts: ' : '';
      els.practiceHint.textContent = `Tonfolge ${target.run} geschafft ✓ ${direction}Weiter mit Tonfolge ${next.run}.`;
    }
    if (els.practiceLive) {
      els.practiceLive.textContent = `${target.name} richtig. Weiter mit ${next.name}.`;
    }
  }

  function handlePitchUpdate(update) {
    if (state.mode === 'tuner') {
      handleTunerUpdate(update);
    } else if (state.mode === 'pentatonic') {
      handleScalePitch(update);
    } else if (state.mode === 'riff') {
      handleRiffPitch(update);
    }
  }

  function handleScalePitch(update) {
    const scale = state.scale;
    if (!scale.active) return;
    const target = scale.sequence[scale.index];
    if (!target) return;

    const now = performance.now();
    const previousLevel = scale.lastLevelDb;
    scale.lastLevelDb = update.levelDb;
    const levelRise = previousLevel !== null && update.levelDb > -48 && update.levelDb - previousLevel > 5;
    const levelDrop = previousLevel !== null && previousLevel - update.levelDb > 8;
    const released = update.silent || update.levelDb < -55 ||
      (!update.pitch && (update.levelDb < -45 || levelDrop));
    const note = update.pitch ? frequencyToNote(update.pitch.frequency) : null;
    const pitchClass = note ? ((note.midi % 12) + 12) % 12 : null;

    if (scale.needRelease) {
      if (released || levelRise) {
        scale.needRelease = false;
        scale.lastHitPc = null;
      } else if (note && pitchClass !== scale.lastHitPc) {
        scale.needRelease = false;
        scale.lastHitPc = null;
      }
    }

    if (!note) {
      scale.candidateFrames = 0;
      if (released) {
        scale.missLatched = false;
        els.practiceCard.classList.remove('is-warn');
      }
      els.practiceDetected.textContent = released ? 'Erkannt: –' : 'Erkannt: ?';
      if (now > scale.feedbackUntil) {
        setPracticeStatus(`Spiele ${target.name} …`, 'listening');
      }
      return;
    }

    // Der gerade gewertete Ton klingt oft noch nach. Er darf nicht sofort als
    // Fehler für den nächsten Zielton zählen.
    if (scale.lastHitPc !== null && pitchClass === scale.lastHitPc) {
      scale.candidateFrames = 0;
      return;
    }

    els.practiceDetected.textContent = `Erkannt: ${note.name}`;

    if (pitchClass === target.pc) {
      scale.missLatched = false;
      els.practiceCard.classList.remove('is-warn');
      if (!scale.needRelease) {
        scale.candidateFrames += 1;
        if (scale.candidateFrames >= 2) acceptPracticeHit(target, now);
      }
      return;
    }

    scale.candidateFrames = 0;
    if (!scale.missLatched && update.levelDb > -50 && now > scale.graceUntil) {
      scale.missLatched = true;
      scale.misses += 1;
      els.practiceCard.classList.add('is-warn');
      setPracticeStatus('Ton passt nicht', 'warn');
      els.practiceHint.textContent = `Erwartet ${target.name} – gehört ${note.name}. Nochmal versuchen.`;
      scale.feedbackUntil = now + 900;
    }
  }

  /* ---------- Riff-/Einzelnoten-Modus ---------- */

  function currentRiff() {
    return getRiff(state.riff.riffId);
  }

  function setRiffStatus(text, kind) {
    if (els.riffStatus.textContent !== text) els.riffStatus.textContent = text;
    els.riffDot.className = 'status-dot' + (kind ? ` is-${kind}` : '');
  }

  function buildRiffOptions() {
    els.riffSelect.textContent = '';
    RIFFS.forEach((riff) => {
      els.riffSelect.add(new Option(riffLabel(riff), riff.id));
    });
    els.riffSelect.value = state.riff.riffId;
  }

  function riffStepLabel(index) {
    const total = state.riff.notes.length;
    const note = state.riff.notes[index];
    const section = note && note.section
      ? ` · ${note.section === 'Riff' ? 'Riff' : `Akkord ${note.section}`}`
      : '';
    return `Note ${Math.min(index + 1, total)} / ${total}${section}`;
  }

  function updateRiffTarget() {
    const note = state.riff.notes[state.riff.index];
    if (!note) return;
    els.riffTarget.textContent = note.name;
    els.riffTargetLabel.textContent = riffStepLabel(state.riff.index);
    els.riffPosition.textContent = `${note.label} · ${stringDescription(note)}`;
  }

  function updateRiffBoard() {
    const riff = currentRiff();
    const activeIndex = state.riff.index < state.riff.notes.length ? state.riff.index : null;
    els.riffFretboard.innerHTML = renderRiffFretboard(riff, activeIndex);
  }

  function renderRiffSequence() {
    els.riffSequence.textContent = '';
    state.riff.notes.forEach((note, index) => {
      const chip = document.createElement('span');
      chip.className = 'seq-chip';
      chip.dataset.index = String(index);

      const name = document.createElement('span');
      name.textContent = note.name;
      const position = document.createElement('small');
      position.textContent = `${RIFF_STRING_NAMES[note.string]}${note.fret}`;

      chip.append(name, position);
      chip.title = `Note ${index + 1}: ${note.label}, ${stringDescription(note)}`;
      chip.setAttribute('aria-label', chip.title);
      els.riffSequence.append(chip);
    });
    updateRiffSequenceState();
  }

  function updateRiffSequenceState() {
    const chips = els.riffSequence.children;
    for (let i = 0; i < chips.length; i += 1) {
      const index = Number(chips[i].dataset.index);
      chips[i].classList.toggle('is-done', index < state.riff.index);
      chips[i].classList.toggle('is-current', state.riff.active && index === state.riff.index);
    }
    const current = chips[state.riff.index];
    if (current && current.offsetLeft !== undefined) {
      els.riffSequence.scrollLeft = Math.max(0,
        current.offsetLeft - els.riffSequence.clientWidth / 2 + current.offsetWidth / 2);
    }
  }

  function updateRiffProgress() {
    const total = state.riff.notes.length;
    const done = Math.min(state.riff.index, total);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    els.riffProgressLabel.textContent = `${done} / ${total}`;
    els.riffProgressFill.style.width = `${percent}%`;
    els.riffMeter.setAttribute('aria-valuenow', String(percent));
  }

  function setRiffControlsDisabled(disabled) {
    [els.riffSelect, els.riffPreviewBtn].forEach((element) => { element.disabled = disabled; });
  }

  function updateRiffClickButton() {
    const playing = riffMetronome.playing;
    els.riffClickBtn.textContent = `${playing ? 'Klick stoppen' : 'Klick starten'} · ${riffMetronome.bpm} BPM`;
    els.riffClickBtn.setAttribute('aria-pressed', String(playing));
    els.riffClickBtn.classList.toggle('is-playing', playing);
    els.riffBeatDots.hidden = !playing;
  }

  function clearRiffPreviewTimers() {
    state.riff.previewTimers.forEach((timer) => window.clearTimeout(timer));
    state.riff.previewTimers = [];
    els.riffSequence.querySelectorAll('.is-playing').forEach((element) => element.classList.remove('is-playing'));
    els.riffFretboard.querySelectorAll('.is-playing').forEach((element) => element.classList.remove('is-playing'));
  }

  function initRiffView() {
    const riff = currentRiff();
    state.riff.riffId = riff.id;
    state.riff.notes = riff.notes;
    riffMetronome.setBpm(riff.bpm);

    els.riffHeading.textContent = riff.title;
    els.riffMeta.textContent = `${riff.artist} · ${riff.bpm} BPM`;
    els.riffInfo.textContent = riff.description;
    els.riffSelect.value = riff.id;
    els.riffSelect.disabled = false;
    els.riffStart.hidden = false;
    els.riffStart.textContent = 'Übung starten';
    els.riffStop.hidden = true;
    els.riffHint.textContent = `Spiele die ${riff.notes.length} Noten in der angezeigten Reihenfolge. ` +
      'Die Erkennung prüft jeden Ton – das Timing wird nicht bewertet.';

    const riffState = state.riff;
    riffState.index = 0;
    riffState.hits = 0;
    riffState.misses = 0;
    riffState.active = false;
    riffState.needRelease = false;
    riffState.candidateFrames = 0;
    riffState.missLatched = false;
    riffState.lastLevelDb = null;
    riffState.lastHitPc = null;
    riffState.graceUntil = 0;
    riffState.feedbackUntil = 0;

    els.riffPracticeCard.classList.remove('is-good', 'is-warn', 'pulse');
    els.riffTarget.classList.remove('is-good');
    els.riffDetected.textContent = 'Erkannt: –';
    setRiffStatus('Bereit zum Üben', '');
    renderRiffSequence();
    updateRiffTarget();
    updateRiffProgress();
    updateRiffBoard();
    updateRiffClickButton();
  }

  function clearRiffBeatDots() {
    const dots = els.riffBeatDots.children;
    for (let i = 0; i < dots.length; i += 1) dots[i].classList.remove('active');
  }

  function handleRiffBeat(beat) {
    const dots = els.riffBeatDots.children;
    for (let i = 0; i < dots.length; i += 1) {
      dots[i].classList.toggle('active', i === beat);
    }
    window.clearTimeout(state.riff.beatTimeout);
    state.riff.beatTimeout = window.setTimeout(clearRiffBeatDots, 150);
  }

  function handleRiffMetroState() {
    updateRiffClickButton();
    if (!riffMetronome.playing) {
      window.clearTimeout(state.riff.beatTimeout);
      clearRiffBeatDots();
    }
  }

  async function toggleRiffClick() {
    if (riffMetronome.playing) {
      riffMetronome.stop();
      return;
    }
    try {
      riffMetronome.setBpm(currentRiff().bpm);
      await riffMetronome.start();
    } catch (error) {
      toast('Klick konnte nicht starten.');
    }
  }

  function pulseRiffCard() {
    els.riffPracticeCard.classList.remove('pulse');
    void els.riffPracticeCard.offsetWidth;
    els.riffPracticeCard.classList.add('pulse');
    window.setTimeout(() => els.riffPracticeCard.classList.remove('pulse'), 760);
  }

  async function previewRiff() {
    if (state.riff.active) return;
    const riff = currentRiff();
    const beatSec = 60 / riff.bpm;
    const playbackFrequencies = riffPlaybackFrequencies(riff);
    const steps = [];
    const startTimes = [];
    let beatPosition = 0;

    riff.notes.forEach((note, index) => {
      const startSec = beatPosition * beatSec;
      // Jeder Ton klingt bis zum nächsten Anschlag weiter; die Gitarre
      // übernimmt den Rhythmus aus `note.beats`.
      const durationSec = Math.max(0.12, Math.min(2.1, note.beats * beatSec * 1.15));
      steps.push({
        frequency: playbackFrequencies[index],
        startSec,
        durationSec,
        gain: 1
      });
      startTimes.push(startSec);
      beatPosition += note.beats;
    });

    clearRiffPreviewTimers();
    els.riffPreviewBtn.disabled = true;

    let duration = 0;
    try {
      duration = await engine.playTimedSequence(steps, { peak: 0.5 });
    } catch (error) {
      els.riffPreviewBtn.disabled = false;
      toast('Vorspielen war nicht möglich.');
      return;
    }

    riff.notes.forEach((note, index) => {
      const timer = window.setTimeout(() => {
        els.riffSequence.querySelectorAll('.is-playing').forEach((element) => element.classList.remove('is-playing'));
        els.riffFretboard.querySelectorAll('.is-playing').forEach((element) => element.classList.remove('is-playing'));
        const chip = els.riffSequence.children[index];
        if (chip) chip.classList.add('is-playing');
        els.riffFretboard.querySelectorAll(`[data-pos="${note.string}-${note.fret}"]`)
          .forEach((element) => element.classList.add('is-playing'));
      }, Math.max(0, startTimes[index] * 1000));
      state.riff.previewTimers.push(timer);
    });

    const endTimer = window.setTimeout(() => {
      clearRiffPreviewTimers();
      els.riffPreviewBtn.disabled = state.riff.active;
    }, Math.max(250, duration * 1000 + 120));
    state.riff.previewTimers.push(endTimer);
  }

  function startRiff() {
    if (!state.running) {
      toast('Bitte zuerst das Mikrofon aktivieren.');
      return;
    }
    if (!state.riff.notes.length) initRiffView();

    engine.stopToneSequence();
    clearRiffPreviewTimers();

    const riff = state.riff;
    riff.active = true;
    riff.index = 0;
    riff.hits = 0;
    riff.misses = 0;
    riff.needRelease = false;
    riff.candidateFrames = 0;
    riff.missLatched = false;
    riff.lastLevelDb = null;
    riff.lastHitPc = null;
    riff.graceUntil = 0;
    riff.feedbackUntil = 0;

    setRiffControlsDisabled(true);
    els.riffStart.hidden = true;
    els.riffStop.hidden = false;
    els.riffPracticeCard.classList.remove('is-good', 'is-warn');
    els.riffTarget.classList.remove('is-good');

    const target = riff.notes[0];
    els.riffTarget.textContent = target.name;
    els.riffTargetLabel.textContent = riffStepLabel(0);
    els.riffPosition.textContent = `${target.label} · ${stringDescription(target)}`;
    els.riffDetected.textContent = 'Erkannt: –';
    setRiffStatus(`Spiele ${target.label} …`, 'listening');
    els.riffHint.textContent = 'Jeden Ton einzeln anschlagen. Bei gleichen Tönen kurz abdämpfen, ' +
      'damit der nächste Anschlag erkannt wird.';
    updateRiffProgress();
    renderRiffSequence();
    updateRiffBoard();

    engine.setMode('scale');

    if (els.riffLive) {
      els.riffLive.textContent = `Übung gestartet. Erste Note: ${target.label}, ${stringDescription(target)}.`;
    }
  }

  function stopRiff() {
    const riff = state.riff;
    if (!riff.notes.length) riff.notes = currentRiff().notes;
    engine.stopToneSequence();
    clearRiffPreviewTimers();
    riffMetronome.stop();

    riff.active = false;
    riff.index = 0;
    riff.hits = 0;
    riff.misses = 0;
    riff.needRelease = false;
    riff.candidateFrames = 0;
    riff.missLatched = false;
    riff.lastLevelDb = null;
    riff.lastHitPc = null;
    riff.graceUntil = 0;
    riff.feedbackUntil = 0;

    setRiffControlsDisabled(false);
    els.riffStart.hidden = false;
    els.riffStart.textContent = 'Übung starten';
    els.riffStop.hidden = true;
    els.riffPracticeCard.classList.remove('is-good', 'is-warn');
    els.riffTarget.classList.remove('is-good');
    els.riffDetected.textContent = 'Erkannt: –';
    setRiffStatus('Bereit zum Üben', '');
    els.riffHint.textContent = 'Wähle ein Riff und starte die Übung. Spiele jeden Ton einzeln in der angezeigten Reihenfolge.';

    renderRiffSequence();
    updateRiffTarget();
    updateRiffProgress();
    updateRiffBoard();
    updateRiffClickButton();
  }

  function finishRiff() {
    const riff = state.riff;
    riff.active = false;
    riff.candidateFrames = 0;
    riff.needRelease = false;

    setRiffControlsDisabled(false);
    els.riffStart.hidden = false;
    els.riffStart.textContent = 'Nochmal starten';
    els.riffStop.hidden = true;
    els.riffTarget.textContent = '✓';
    els.riffTarget.classList.add('is-good');
    els.riffTargetLabel.textContent = 'Ergebnis';
    els.riffDetected.textContent = 'Erkannt: ✓';
    setRiffStatus('Riff geschafft ✓', 'good');
    els.riffHint.textContent = `${riff.notes.length} Noten geschafft · ${riff.hits} richtig` +
      (riff.misses > 0 ? ` · ${riff.misses} Fehler` : '') + '.';
    els.riffPracticeCard.classList.add('is-good');
    pulseRiffCard();
    updateRiffProgress();
    renderRiffSequence();
    updateRiffBoard();

    if (navigator.vibrate) navigator.vibrate([40, 50, 80]);
    if (els.riffLive) {
      els.riffLive.textContent = `Riff geschafft. ${riff.hits} von ${riff.notes.length} Noten richtig.`;
    }
  }

  function acceptRiffHit(target, now) {
    const riff = state.riff;
    riff.hits += 1;
    riff.index += 1;
    riff.candidateFrames = 0;
    riff.needRelease = true;
    riff.lastHitPc = target.pc;
    riff.graceUntil = now + 250;
    riff.missLatched = false;
    riff.feedbackUntil = now + 700;
    els.riffPracticeCard.classList.remove('is-warn');
    els.riffHint.textContent = `${target.label} richtig ✓`;
    pulseRiffCard();
    if (navigator.vibrate) navigator.vibrate(20);

    if (riff.index >= riff.notes.length) {
      finishRiff();
      return;
    }

    const next = riff.notes[riff.index];
    updateRiffProgress();
    renderRiffSequence();
    updateRiffBoard();
    updateRiffTarget();
    els.riffTarget.classList.remove('is-good');
    setRiffStatus(`Spiele ${next.label} …`, 'listening');
    if (next.section !== target.section) {
      els.riffHint.textContent = `${target.section} geschafft ✓ Weiter mit ${next.section}.`;
    }
    if (els.riffLive) {
      els.riffLive.textContent = `${target.label} richtig. Weiter mit ${next.label}, ${stringDescription(next)}.`;
    }
  }

  function handleRiffPitch(update) {
    const riff = state.riff;
    if (!riff.active) return;
    const target = riff.notes[riff.index];
    if (!target) return;

    const now = performance.now();
    const previousLevel = riff.lastLevelDb;
    riff.lastLevelDb = update.levelDb;
    const levelRise = previousLevel !== null && update.levelDb > -48 && update.levelDb - previousLevel > 5;
    const levelDrop = previousLevel !== null && previousLevel - update.levelDb > 8;
    const released = update.silent || update.levelDb < -55 ||
      (!update.pitch && (update.levelDb < -45 || levelDrop));
    const note = update.pitch ? frequencyToNote(update.pitch.frequency) : null;
    const pitchClass = note ? ((note.midi % 12) + 12) % 12 : null;

    if (riff.needRelease) {
      if (released || levelRise) {
        riff.needRelease = false;
        riff.lastHitPc = null;
      } else if (note && pitchClass !== riff.lastHitPc) {
        riff.needRelease = false;
        riff.lastHitPc = null;
      }
    }

    if (!note) {
      riff.candidateFrames = 0;
      if (released) {
        riff.missLatched = false;
        els.riffPracticeCard.classList.remove('is-warn');
      }
      els.riffDetected.textContent = released ? 'Erkannt: –' : 'Erkannt: ?';
      if (now > riff.feedbackUntil) {
        setRiffStatus(`Spiele ${target.label} …`, 'listening');
      }
      return;
    }

    // Der gerade gewertete Ton klingt oft noch nach und darf nicht sofort als
    // Fehler für den nächsten Zielton zählen.
    if (riff.lastHitPc !== null && pitchClass === riff.lastHitPc) {
      riff.candidateFrames = 0;
      return;
    }

    els.riffDetected.textContent = `Erkannt: ${note.name}`;

    if (pitchClass === target.pc) {
      riff.missLatched = false;
      els.riffPracticeCard.classList.remove('is-warn');
      if (!riff.needRelease) {
        riff.candidateFrames += 1;
        if (riff.candidateFrames >= 2) acceptRiffHit(target, now);
      }
      return;
    }

    riff.candidateFrames = 0;
    if (!riff.missLatched && update.levelDb > -50 && now > riff.graceUntil) {
      riff.missLatched = true;
      riff.misses += 1;
      els.riffPracticeCard.classList.add('is-warn');
      setRiffStatus('Ton passt nicht', 'warn');
      els.riffHint.textContent = `Erwartet ${target.label} – gehört ${note.name}. Nochmal versuchen.`;
      riff.feedbackUntil = now + 900;
    }
  }

  /* ---------- Song-Modus ---------- */

  function currentSong() {
    return getSong(state.song.songId);
  }

  function handleSongMetroState(playing) {
    if (playing) return;
    // Wenn der Scheduler unerwartet endet, darf die UI nicht "läuft" zeigen.
    if (state.song.active) {
      state.song.active = false;
      els.songStart.hidden = false;
      els.songStop.hidden = true;
      els.songSelect.disabled = false;
      setSongStatus('Gestoppt', '');
    }
  }

  function setSongStatus(text, kind) {
    if (els.songStatus.textContent !== text) els.songStatus.textContent = text;
    els.songDot.className = 'status-dot' + (kind ? ` is-${kind}` : '');
  }

  function setSongTempo(value) {
    const song = currentSong();
    const tempo = Math.max(50, Math.min(120, Math.round(Number(value) || song.bpm)));
    state.song.tempo = tempo;
    const percent = Math.round((tempo / song.bpm) * 100);
    els.songBpmSlider.value = String(tempo);
    els.songBpmValue.textContent = `${tempo} BPM · ${percent} %`;
    els.songBpmSlider.style.setProperty('--fill', `${(((tempo - 50) / 70) * 100).toFixed(1)}%`);
    if (songMetronome.playing) songMetronome.setBpm(tempo);
  }

  /* ---------- Song anhören ---------- */

  function clearSongListenTimers() {
    state.song.listenTimers.forEach((timer) => window.clearTimeout(timer));
    state.song.listenTimers = [];
  }

  function setSongListenButton(active) {
    if (!els.songListenBtn) return;
    els.songListenBtn.textContent = active ? 'Wiedergabe stoppen' : 'Song anhören';
    els.songListenBtn.setAttribute('aria-pressed', String(active));
    els.songListenBtn.classList.toggle('is-playing', active);
    els.songListenBtn.disabled = state.song.active;
    els.songSelect.disabled = active || state.song.active;
    els.songBpmSlider.disabled = active || state.song.active;
    els.songStart.disabled = active;
  }

  function stopSongListen() {
    state.song.listenToken += 1;
    clearSongListenTimers();
    engine.stopToneSequence();
    const wasActive = state.song.listenActive;
    state.song.listenActive = false;
    state.song.barIndex = 0;
    setSongListenButton(false);
    clearSongBeatDots();
    if (wasActive || !state.song.active) {
      renderSongBar();
    }
    if (!state.song.active) {
      setSongStatus('Bereit zum Anhören', '');
      els.songHint.textContent = 'Höre dir die Akkordfolge an oder starte das Mitspielen.';
    }
  }

  async function startSongListen() {
    if (state.song.listenActive) return;
    if (state.song.active) stopSong();

    const song = currentSong();
    const bpm = state.song.tempo;
    const beatSec = 60 / bpm;
    const barSec = beatSec * 4;
    const strumGains = [1, 0.5, 0.78, 0.5, 0.95, 0.5, 0.78, 0.55];
    const steps = [];

    song.bars.forEach((chordId, barIndex) => {
      const chord = CHORDS[chordId];
      if (!chord) return;
      const frequencies = chordFrequencies(chord);
      for (let eighth = 0; eighth < 8; eighth += 1) {
        const strumStart = barIndex * barSec + eighth * (beatSec / 2);
        const offbeat = eighth % 2 === 1;
        const ring = offbeat ? beatSec * 0.45 : beatSec * 1.15;
        frequencies.forEach((frequency, stringIndex) => {
          steps.push({
            frequency,
            startSec: strumStart + stringIndex * 0.028,
            durationSec: Math.min(1.8, ring),
            gain: strumGains[eighth]
          });
        });
      }
    });

    clearSongListenTimers();
    state.song.listenToken += 1;
    const token = state.song.listenToken;
    state.song.listenActive = true;
    state.song.barIndex = 0;
    setSongListenButton(true);
    renderSongBar();
    resetSongMeter();
    setSongStatus('Wiedergabe läuft …', 'listening');
    els.songHint.textContent = `${song.title} · ${bpm} BPM – hör dir die Akkordfolge an.`;

    let duration = 0;
    try {
      duration = await engine.playTimedSequence(steps, { peak: 0.16, lead: 0.1 });
    } catch (error) {
      stopSongListen();
      toast('Song konnte nicht abgespielt werden.');
      return;
    }

    if (token !== state.song.listenToken) return;

    song.bars.forEach((_, barIndex) => {
      const barTimer = window.setTimeout(() => {
        if (token !== state.song.listenToken || !state.song.listenActive) return;
        state.song.barIndex = barIndex;
        renderSongBar();
        setSongStatus(`Wiedergabe · Takt ${barIndex + 1} / ${song.bars.length}`, 'listening');
      }, Math.max(0, barIndex * barSec * 1000 + 100));
      state.song.listenTimers.push(barTimer);

      for (let beat = 0; beat < 4; beat += 1) {
        const beatTimer = window.setTimeout(() => {
          if (token !== state.song.listenToken || !state.song.listenActive) return;
          updateSongBeatDots(beat);
        }, Math.max(0, (barIndex * 4 + beat) * beatSec * 1000 + 100));
        state.song.listenTimers.push(beatTimer);
      }
    });

    const endTimer = window.setTimeout(() => {
      if (token !== state.song.listenToken) return;
      stopSongListen();
      setSongStatus('Wiedergabe beendet', 'good');
      els.songHint.textContent = 'Nochmal anhören oder direkt mitspielen.';
    }, Math.max(500, duration * 1000 + 150));
    state.song.listenTimers.push(endTimer);
  }

  function toggleSongListen() {
    if (state.song.listenActive) {
      stopSongListen();
      setSongStatus('Wiedergabe gestoppt', '');
      return;
    }
    startSongListen();
  }

  function buildSongOptions() {
    els.songSelect.textContent = '';
    SONGS.forEach((song) => {
      els.songSelect.add(new Option(`${song.title} · ${song.artist}`, song.id));
    });
    els.songSelect.value = state.song.songId;
  }

  function renderSongTimeline() {
    els.songTimeline.textContent = '';
    const song = currentSong();
    song.bars.forEach((chordId, index) => {
      const chip = document.createElement('span');
      chip.className = 'song-bar';
      chip.dataset.index = String(index);
      chip.textContent = chordId;
      chip.title = `${index + 1}. Takt · ${CHORDS[chordId].name}`;
      els.songTimeline.append(chip);
    });
    updateSongTimeline();
  }

  function updateSongTimeline() {
    const bars = els.songTimeline.children;
    const current = state.song.barIndex;
    const next = (current + 1) % Math.max(1, bars.length);
    for (let i = 0; i < bars.length; i += 1) {
      bars[i].classList.toggle('is-current', i === current);
      bars[i].classList.toggle('is-next', i === next && next !== current);
      bars[i].classList.toggle('is-done', i < current);
    }
  }

  function renderSongBar() {
    const song = currentSong();
    const bars = song.bars;
    if (!bars.length) return;
    if (state.song.barIndex >= bars.length) state.song.barIndex = 0;
    const chord = CHORDS[bars[state.song.barIndex]];
    const next = CHORDS[bars[(state.song.barIndex + 1) % bars.length]];

    els.songChord.textContent = chord.symbol;
    els.songChordName.textContent = chord.name;
    els.songNext.textContent = next.symbol;
    els.songProgressLabel.textContent = `${state.song.barIndex + 1} / ${bars.length}`;
    els.songFretboard.innerHTML = renderFretboard(chord);
    updateSongTimeline();
  }

  function renderSongScore() {
    els.songScore.textContent = `Treffer: ${state.song.correct} / ${state.song.attempts}`;
  }

  function resetSongMeter() {
    els.songMeterFill.style.width = '0%';
    els.songMeter.setAttribute('aria-valuenow', '0');
    els.songLevel.textContent = 'Pegel: still';
    els.songControls.classList.remove('is-good');
    els.songControls.classList.remove('is-warn');
  }

  function initSongView() {
    const song = currentSong();
    stopSongListen();
    state.song.songId = song.id;
    if (!Number.isFinite(state.song.tempo) || state.song.tempo <= 0) {
      state.song.tempo = song.bpm;
    }

    els.songHeading.textContent = song.title;
    els.songMeta.textContent = `${song.artist} · ${song.bpm} BPM`;
    els.songInfo.textContent = song.description;
    els.songSelect.value = song.id;
    els.songSelect.disabled = false;
    els.songStart.hidden = false;
    els.songStart.textContent = 'Mitspielen starten';
    els.songStop.hidden = true;
    els.songHint.textContent = '„Song anhören“ spielt die Akkordfolge; „Mitspielen starten“ startet Klick und Akkordprüfung.';
    setSongTempo(state.song.tempo);
    renderSongBar();
    renderSongTimeline();
    renderSongScore();
    resetSongMeter();
    clearSongBeatDots();
    setSongListenButton(false);
    setSongStatus('Bereit zum Mitspielen', '');
  }

  function clearSongBeatDots() {
    const dots = els.songBeatDots.children;
    for (let i = 0; i < dots.length; i += 1) dots[i].classList.remove('active');
  }

  function updateSongBeatDots(beat) {
    const dots = els.songBeatDots.children;
    for (let i = 0; i < dots.length; i += 1) {
      dots[i].classList.toggle('active', i === beat);
    }
    window.clearTimeout(state.song.beatTimeout);
    state.song.beatTimeout = window.setTimeout(clearSongBeatDots, 150);
  }

  function handleSongBeat(beat) {
    if (!state.song.active) return;
    updateSongBeatDots(beat);
    if (beat !== 0) return;

    if (!state.song.started) {
      state.song.started = true;
      return;
    }

    const song = currentSong();
    state.song.barIndex = (state.song.barIndex + 1) % song.bars.length;
    state.song.feedbackUntil = 0;
    state.song.barChangedAt = performance.now();
    engine.resetDetection();
    renderSongBar();
    resetSongMeter();
    const chord = CHORDS[song.bars[state.song.barIndex]];
    els.songHint.textContent = `Jetzt ${chord.symbol} – spiele den Akkord im Takt.`;
    setSongStatus(`Spiele ${chord.symbol} …`, 'listening');
  }

  function pulseSongCard() {
    els.songControls.classList.remove('pulse');
    void els.songControls.offsetWidth;
    els.songControls.classList.add('pulse');
    window.setTimeout(() => els.songControls.classList.remove('pulse'), 760);
  }

  function handleSongUpdate(update) {
    if (!state.song.active) return;
    const song = currentSong();
    const target = CHORDS[song.bars[state.song.barIndex]];
    if (!target) return;

    const score = update.silent ? 0 : update.bestScore;
    const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
    const detected = update.bestId && update.bestScore >= MATCH_SCORE ? CHORDS[update.bestId] : null;

    els.songMeterFill.style.width = `${percent}%`;
    els.songMeter.setAttribute('aria-valuenow', String(percent));
    els.songLevel.textContent = update.silent ? 'Pegel: still' : `Pegel: ${Math.round(update.levelDb)} dB`;
    els.songControls.classList.toggle('is-good', Boolean(detected && detected.id === target.id));
    els.songControls.classList.toggle('is-warn', Boolean(detected && detected.id !== target.id));

    if (performance.now() < state.song.feedbackUntil) return;

    if (detected && detected.id === target.id) {
      setSongStatus(`${target.symbol} erkannt ✓`, 'good');
    } else if (detected) {
      setSongStatus(`Gehört: ${detected.symbol}`, 'warn');
    } else if (update.silent) {
      setSongStatus(`Spiele ${target.symbol} …`, 'listening');
    } else {
      setSongStatus(`Spiele ${target.symbol} …`, 'listening');
    }
  }

  function handleSongAttempt(attempt) {
    if (!state.song.active) return;
    if (performance.now() - state.song.barChangedAt < 250) return;
    const song = currentSong();
    const target = CHORDS[song.bars[state.song.barIndex]];
    const heard = CHORDS[attempt.id];
    if (!target || !heard) return;

    state.song.attempts += 1;
    const success = heard.id === target.id;
    if (success) state.song.correct += 1;
    state.song.feedbackUntil = performance.now() + 1200;
    renderSongScore();

    if (success) {
      setSongStatus(`${target.symbol} erkannt ✓`, 'good');
      els.songHint.textContent = `${target.symbol} sitzt. Weiter im Takt.`;
      pulseSongCard();
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      setSongStatus(`Gehört: ${heard.symbol}`, 'warn');
      els.songHint.textContent = `Erwartet ${target.symbol} – nochmal im Takt versuchen.`;
    }

    if (els.songLive) {
      els.songLive.textContent = success
        ? `${target.name} richtig.`
        : `Falscher Akkord. Gehört: ${heard.name}. Erwartet: ${target.name}.`;
    }
  }

  async function startSong() {
    if (!state.running) {
      toast('Bitte zuerst das Mikrofon aktivieren.');
      return;
    }
    const song = currentSong();
    stopSongListen();
    songMetronome.stop();

    state.song.active = true;
    state.song.barIndex = 0;
    state.song.attempts = 0;
    state.song.correct = 0;
    state.song.started = false;
    state.song.feedbackUntil = 0;
    state.song.barChangedAt = 0;
    setSongListenButton(false);

    engine.setChordOrder(song.chordOrder);
    engine.setMode('chords');
    engine.resetDetection();
    songMetronome.setBpm(state.song.tempo);

    els.songSelect.disabled = true;
    els.songStart.hidden = true;
    els.songStop.hidden = false;
    els.songControls.classList.remove('is-good');
    els.songControls.classList.remove('is-warn');
    els.songHint.textContent = '„Song anhören“ spielt die Akkordfolge; „Mitspielen starten“ startet Klick und Akkordprüfung.';
    renderSongBar();
    renderSongScore();
    resetSongMeter();
    clearSongBeatDots();
    setSongStatus(`Spiele ${CHORDS[song.bars[0]].symbol} …`, 'listening');

    try {
      await songMetronome.start();
    } catch (error) {
      state.song.active = false;
      els.songStart.hidden = false;
      els.songStop.hidden = true;
      els.songSelect.disabled = false;
      setSongStatus('Start fehlgeschlagen', 'warn');
      toast('Song konnte nicht gestartet werden.');
      return;
    }

    if (els.songLive) {
      els.songLive.textContent = `${song.title} gestartet. Erster Akkord: ${CHORDS[song.bars[0]].name}.`;
    }
  }

  function stopSong() {
    if (state.song.listenActive) stopSongListen();
    state.song.active = false;
    state.song.started = false;
    state.song.barIndex = 0;
    state.song.attempts = 0;
    state.song.correct = 0;
    state.song.feedbackUntil = 0;
    if (songMetronome.playing) songMetronome.stop();
    engine.setChordOrder(CHORD_ORDER);

    window.clearTimeout(state.song.beatTimeout);
    clearSongBeatDots();
    resetSongMeter();
    renderSongScore();
    if (els.songStart) {
      els.songStart.hidden = false;
      els.songStart.textContent = 'Mitspielen starten';
      els.songStop.hidden = true;
      els.songSelect.disabled = false;
      setSongListenButton(false);
      renderSongBar();
      if (els.songTimeline.children.length) updateSongTimeline();
      setSongStatus('Bereit zum Mitspielen', '');
      els.songHint.textContent = '„Song anhören“ spielt die Akkordfolge; „Mitspielen starten“ startet Klick und Akkordprüfung.';
    }
  }

  /* ---------- Play-Along / Real-Instrument-Gameplay ---------- */

  function setPlayStatus(text, kind) {
    if (!els.playStatus) return;
    if (els.playStatus.textContent !== text) els.playStatus.textContent = text;
    els.playDot.className = 'status-dot' + (kind ? ` is-${kind}` : '');
    state.play.lastStatus = text;
  }

  function formatDuration(ms) {
    const seconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function updatePlayModeButtons() {
    const timed = state.play.mode === 'timed';
    els.playTimedBtn.classList.toggle('active', timed);
    els.playWaitBtn.classList.toggle('active', !timed);
    els.playTimedBtn.setAttribute('aria-pressed', String(timed));
    els.playWaitBtn.setAttribute('aria-pressed', String(!timed));
  }

  function updatePlaySpeed() {
    const percent = Math.round(state.play.speed * 100);
    els.playSpeed.value = String(percent);
    els.playSpeedValue.textContent = `${percent} %`;
    els.playSpeed.style.setProperty('--fill', `${((percent - 50) / 50) * 100}%`);
  }

  function updatePlayClickButton() {
    if (!els.playClickBtn) return;
    const bpm = state.play.chart ? state.play.chart.bpm : 120;
    const playing = metronome.playing;
    els.playClickBtn.textContent = `${playing ? 'Klick stoppen' : 'Klick starten'} · ${bpm} BPM`;
    els.playClickBtn.setAttribute('aria-pressed', String(playing));
    els.playClickBtn.classList.toggle('is-playing', playing);
  }

  async function togglePlayClick() {
    if (metronome.playing) {
      metronome.stop();
      updatePlayClickButton();
      return;
    }
    const chart = state.play.chart;
    if (!chart) return;
    try {
      metronome.setBpm(chart.bpm);
      await metronome.start();
    } catch (error) {
      toast('Klick konnte nicht gestartet werden.');
    }
    updatePlayClickButton();
  }

  function setPlayMode(mode) {
    if (state.play.active) return;
    state.play.mode = mode === 'wait' ? 'wait' : 'timed';
    state.play.session = null;
    updatePlayModeButtons();
    resetPlayStats();
    drawPlayHighway(null);
    setPlayStatus(state.play.mode === 'wait' ? 'Note für Note: Das Lied wartet.' : 'Im Takt: Zeitfenster aktiv.', '');
    persistPrefs();
  }

  function setPlaySpeed(value) {
    if (state.play.active) return;
    const percent = Math.max(50, Math.min(100, Math.round(Number(value) || 100)));
    state.play.speed = percent / 100;
    updatePlaySpeed();
    drawPlayHighway(null);
    persistPrefs();
  }

  function resetPlayStats() {
    if (!els.playScore) return;
    els.playScore.textContent = '0';
    els.playCombo.textContent = 'Combo 0';
    els.playAccuracy.textContent = '100 %';
    els.playProgressLabel.textContent = state.play.chart
      ? `0 / ${state.play.chart.events.length}`
      : '0 / 0';
    els.playProgressFill.style.width = '0%';
    els.playMeter.setAttribute('aria-valuenow', '0');
    els.playTarget.textContent = state.play.chart && state.play.chart.events[0]
      ? eventLabel(state.play.chart.events[0])
      : '–';
    els.playDetected.textContent = 'Erkannt: –';
  }

  function updatePlayTrackSelect() {
    if (!els.playTrackSelect) return;
    els.playTrackSelect.textContent = '';
    if (state.play.song && state.play.tracks.length) {
      state.play.tracks.forEach((track) => {
        const option = new Option(`${track.name} · ${track.stringCount} Saiten`, String(track.index));
        els.playTrackSelect.add(option);
      });
      els.playTrackSelect.value = String(state.play.trackIndex);
      els.playTrackSelect.disabled = state.play.active || state.play.tracks.length < 2;
    } else {
      els.playTrackSelect.add(new Option('Demo · Seven Nation Army', 'demo'));
      els.playTrackSelect.value = 'demo';
      els.playTrackSelect.disabled = true;
    }
  }

  function applyPlayChart(chart, sourceLabel) {
    state.play.chart = chart;
    state.play.session = null;
    state.play.finished = false;
    state.play.lastDetected = '';
    state.play.sourceLabel = sourceLabel || '';
    els.playHeading.textContent = chart.title;
    els.playMeta.textContent = `${chart.artist || 'Guitar Pro'} · ${chart.trackName}`;
    const tuning = Array.isArray(chart.tuningNames) ? chart.tuningNames.join(' ') : 'E A D G B E';
    els.playInfo.textContent = `${sourceLabel ? `${sourceLabel} · ` : ''}` +
      `${chart.noteCount} Noten · ${formatDuration(chart.durationMs)} · ` +
      `${chart.stringCount} Saiten (${tuning}) · ${chart.bpm} BPM`;
    updatePlayTrackSelect();
    updatePlayModeButtons();
    updatePlaySpeed();
    updatePlayClickButton();
    resetPlayStats();
    drawPlayHighway(null);
    els.playStart.hidden = false;
    els.playStart.textContent = 'Spiel starten';
    els.playStop.hidden = true;
    setPlayStatus('Bereit zum Spielen', '');
    if (els.playHint) {
      els.playHint.textContent = chart.source === 'guitar-pro'
        ? 'Spiele die angezeigten Noten. „Im Takt“ bewertet auch das Timing, „Note für Note“ wartet auf jeden Treffer.'
        : 'Demo-Riff: Spiele die angezeigten Noten. Importiere oben eine Guitar-Pro-Datei für eigene Songs.';
    }
    if (els.playLive) {
      els.playLive.textContent = `${chart.title} geladen: ${chart.noteCount} Noten.`;
    }
  }

  function loadPlayDemo() {
    state.play.song = null;
    state.play.tracks = [];
    state.play.trackIndex = 0;
    applyPlayChart(createDemoChart(), 'Demo');
  }

  function initPlayView() {
    if (!state.play.chart) {
      loadPlayDemo();
      return;
    }
    updatePlayModeButtons();
    updatePlaySpeed();
    updatePlayTrackSelect();
    updatePlayClickButton();
    resetPlayStats();
    if (!state.play.active) {
      els.playStart.hidden = false;
      els.playStart.textContent = 'Spiel starten';
      els.playStop.hidden = true;
      setPlayStatus('Bereit zum Spielen', '');
    }
    drawPlayHighway(null);
  }

  async function importPlayFile(file) {
    if (!file) return;
    setPlayStatus('Guitar-Pro-Datei wird gelesen …', 'listening');
    try {
      const buffer = await file.arrayBuffer();
      const song = parseGuitarProFile(buffer);
      const tracks = buildTrackOptions(song);
      if (!tracks.length) throw new Error('Keine Gitarren- oder Bass-Spuren gefunden.');

      const preferred = tracks.find((track) => /guitar|gtr|lead|rhythm|gitarre|acoustic|disto|clean/i.test(track.name)) ||
        tracks.find((track) => track.stringCount === 6 && !/voice|choir|strings|pipe|timpani|brass/i.test(track.name)) ||
        tracks[0];
      state.play.song = song;
      state.play.tracks = tracks;
      state.play.trackIndex = preferred.index;
      const chart = buildChartFromSong(song, preferred.index);
      applyPlayChart(chart, file.name);
      toast(`${chart.title}: ${chart.noteCount} Noten importiert`);
    } catch (error) {
      const message = error && error.message ? error.message : 'Unbekannter Fehler';
      setPlayStatus('Import fehlgeschlagen', 'warn');
      toast(`Guitar-Pro-Import fehlgeschlagen: ${message}`);
    } finally {
      els.playFileInput.value = '';
    }
  }

  function selectPlayTrack(trackIndex) {
    if (!state.play.song || state.play.active) return;
    const index = Number(trackIndex);
    if (!Number.isFinite(index)) return;
    try {
      const chart = buildChartFromSong(state.play.song, index);
      state.play.trackIndex = index;
      applyPlayChart(chart, state.play.sourceLabel);
    } catch (error) {
      toast(`Track konnte nicht geladen werden: ${error.message}`);
    }
  }

  function setPlayControlsDisabled(disabled) {
    [els.playFileInput, els.playTrackSelect, els.playTimedBtn, els.playWaitBtn, els.playSpeed]
      .forEach((element) => {
        if (!element) return;
        element.disabled = disabled;
      });
  }

  function startPlay() {
    if (!state.play.chart) loadPlayDemo();
    if (!state.running) {
      toast('Bitte zuerst das Mikrofon aktivieren.');
      return;
    }
    if (state.play.active) stopPlay();
    const chart = state.play.chart;
    if (!chart || !chart.events.length) {
      toast('Keine Noten im Chart.');
      return;
    }

    state.play.session = new PlaySession(chart, {
      mode: state.play.mode,
      speed: state.play.speed
    });
    state.play.session.start(performance.now());
    state.play.active = true;
    state.play.finished = false;
    state.play.needRelease = false;
    state.play.lastLevelDb = null;
    state.play.lastHitPc = null;
    state.play.wrongLatched = false;
    state.play.lastDetected = '';
    state.play.statusHoldUntil = 0;

    engine.stopToneSequence();
    engine.setMode('game');
    engine.resetDetection();

    setPlayControlsDisabled(true);
    els.playStart.hidden = true;
    els.playStop.hidden = false;
    els.playCard.classList.remove('is-good', 'is-warn');
    resetPlayStats();
    setPlayStatus(state.play.mode === 'wait' ? 'Warte auf den ersten Ton …' : 'Los! Spiele die Noten im Takt.', 'listening');
    drawPlayHighway(null);
    state.play.frame = window.requestAnimationFrame(gameLoop);
    if (els.playLive) {
      els.playLive.textContent = `${chart.title} gestartet im Modus ${state.play.mode === 'wait' ? 'Note für Note' : 'Im Takt'}.`;
    }
  }

  function stopPlay() {
    state.play.active = false;
    state.play.finished = false;
    state.play.session = null;
    state.play.needRelease = false;
    state.play.lastLevelDb = null;
    state.play.lastHitPc = null;
    state.play.wrongLatched = false;
    if (state.play.frame !== null) {
      window.cancelAnimationFrame(state.play.frame);
      state.play.frame = null;
    }
    engine.stopToneSequence();
    metronome.stop();
    setPlayControlsDisabled(false);
    els.playStart.hidden = false;
    els.playStart.textContent = 'Nochmal starten';
    els.playStop.hidden = true;
    els.playTarget.textContent = '–';
    els.playDetected.textContent = 'Erkannt: –';
    els.playCard.classList.remove('is-good', 'is-warn');
    setPlayStatus('Gestoppt', '');
    drawPlayHighway(null);
  }

  function finishPlay() {
    const session = state.play.session;
    if (!session) return;
    state.play.active = false;
    state.play.finished = true;
    if (state.play.frame !== null) {
      window.cancelAnimationFrame(state.play.frame);
      state.play.frame = null;
    }
    engine.stopToneSequence();
    metronome.stop();
    setPlayControlsDisabled(false);
    els.playStart.hidden = false;
    els.playStart.textContent = 'Nochmal starten';
    els.playStop.hidden = true;
    els.playCard.classList.add('is-good');
    const summary = session.summary();
    els.playScore.textContent = String(summary.score);
    els.playCombo.textContent = `Combo ${summary.combo}`;
    els.playAccuracy.textContent = `${summary.accuracy} %`;
    els.playProgressFill.style.width = '100%';
    els.playMeter.setAttribute('aria-valuenow', '100');
    els.playProgressLabel.textContent = `${summary.hits} / ${session.chart.events.length}`;
    setPlayStatus(`Song geschafft · ${summary.accuracy} % · ${summary.score} Punkte`, 'good');
    if (els.playHint) {
      els.playHint.textContent = `${summary.hits} Treffer, ${summary.misses} verpasst, ` +
        `${summary.wrong} falsche Anschläge · beste Combo ${summary.combo}.`;
    }
    if (navigator.vibrate) navigator.vibrate([40, 50, 80]);
    drawPlayHighway(null);
  }

  function gameLoop() {
    if (!state.play.active || !state.play.session) return;
    const now = performance.now();
    const session = state.play.session;
    session.update(now);
    const display = session.displayMs(now);
    drawPlayHighway(display);
    updatePlayHud(now);
    if (session.finished) {
      finishPlay();
      return;
    }
    state.play.frame = window.requestAnimationFrame(gameLoop);
  }

  function updatePlayHud(now) {
    const session = state.play.session;
    if (!session) return;
    const event = session.currentEvent;
    const summary = session.summary();
    els.playScore.textContent = String(summary.score);
    els.playCombo.textContent = `Combo ${summary.combo}`;
    els.playAccuracy.textContent = `${summary.accuracy} %`;
    els.playProgressLabel.textContent = `${summary.hits + summary.misses} / ${session.chart.events.length}`;
    const percent = Math.round(summary.progress * 100);
    els.playProgressFill.style.width = `${percent}%`;
    els.playMeter.setAttribute('aria-valuenow', String(percent));

    if (!event) {
      els.playTarget.textContent = '✓';
      return;
    }
    const label = eventLabel(event);
    els.playTarget.textContent = label;
    if (performance.now() < state.play.statusHoldUntil) return;
    if (state.play.mode === 'wait') {
      setPlayStatus(`Warte auf ${label} …`, 'listening');
    } else {
      const remaining = event.startMs - session.elapsed(now);
      if (remaining > 400 && session.index === 0) {
        setPlayStatus(`Bereit in ${Math.ceil(remaining / 1000)} …`, 'listening');
      } else if (remaining > 0) {
        setPlayStatus(`Gleich: ${label}`, 'listening');
      } else {
        setPlayStatus(`Jetzt: ${label}`, 'listening');
      }
    }
  }

  function chromaPitchClasses(chroma) {
    if (!chroma || !chroma.length) return [];
    let max = 0;
    for (let i = 0; i < 12; i += 1) max = Math.max(max, chroma[i]);
    if (max <= 0) return [];
    const threshold = Math.max(0.08, max * 0.28);
    const pcs = [];
    for (let i = 0; i < 12; i += 1) {
      if (chroma[i] >= threshold) pcs.push(i);
    }
    return pcs;
  }

  function handleGameUpdate(update) {
    if (state.mode !== 'play') return;
    if (!state.play.active || !state.play.session) {
      if (update.silent) els.playDetected.textContent = 'Erkannt: –';
      return;
    }
    const session = state.play.session;
    const event = session.currentEvent;
    if (!event) return;

    const previousLevel = state.play.lastLevelDb;
    state.play.lastLevelDb = update.levelDb;
    const levelRise = previousLevel !== null && update.levelDb > -48 && update.levelDb - previousLevel > 5;
    const levelDrop = previousLevel !== null && previousLevel - update.levelDb > 8;
    const released = update.silent || update.levelDb < -55 ||
      (!update.pitch && (update.levelDb < -45 || levelDrop));

    if (state.play.needRelease) {
      if (released || levelRise) {
        state.play.needRelease = false;
        state.play.lastHitPc = null;
      } else if (!event.isChord && update.pitch) {
        const note = frequencyToNote(update.pitch.frequency);
        const pc = note ? ((note.midi % 12) + 12) % 12 : null;
        if (pc !== null && pc !== state.play.lastHitPc) {
          state.play.needRelease = false;
          state.play.lastHitPc = null;
        }
      }
    }
    if (released) state.play.wrongLatched = false;

    if (update.silent) {
      els.playDetected.textContent = 'Erkannt: –';
      return;
    }

    let detectedPcs = [];
    let detectedLabel = '';
    if (event.isChord) {
      detectedPcs = chromaPitchClasses(update.chroma);
      detectedLabel = detectedPcs.map((pc) => NOTE_NAMES[pc]).join(' + ');
    } else if (update.pitch) {
      const note = frequencyToNote(update.pitch.frequency);
      if (note) {
        detectedPcs = [((note.midi % 12) + 12) % 12];
        detectedLabel = note.name;
      }
    }
    if (!detectedPcs.length) {
      if (update.levelDb > -50) els.playDetected.textContent = 'Erkannt: ?';
      return;
    }
    els.playDetected.textContent = `Erkannt: ${detectedLabel}`;

    if (matchPcs(event.pcs, detectedPcs)) {
      state.play.wrongLatched = false;
      if (!state.play.needRelease) {
        const result = session.judge(performance.now(), detectedPcs);
        if (result && result.hit) {
          state.play.needRelease = true;
          state.play.lastHitPc = event.pcs[0];
          onPlayHit(result);
        }
      }
    } else if (!state.play.wrongLatched && update.levelDb > -50) {
      state.play.wrongLatched = true;
      session.recordWrong();
      const expected = event.isChord ? event.pcs.map((pc) => NOTE_NAMES[pc]).join(' + ') : eventLabel(event);
      const heard = detectedLabel || '?';
      els.playCard.classList.add('is-warn');
      setPlayStatus(`Erwartet ${expected} – gehört ${heard}`, 'warn');
      state.play.statusHoldUntil = performance.now() + 900;
      if (els.playHint) els.playHint.textContent = `Erwartet ${expected} – gehört ${heard}. Weiter versuchen.`;
    }
  }

  function onPlayHit(result) {
    const session = state.play.session;
    if (!session) return;
    els.playCard.classList.remove('is-warn');
    els.playCard.classList.add('is-good');
    pulsePlayCard();
    window.setTimeout(() => els.playCard.classList.remove('is-good'), 500);
    const event = result.event;
    const detail = event.isChord
      ? event.pcs.map((pc) => NOTE_NAMES[pc]).join(' + ')
      : `${event.notes[0].name} · ${event.notes[0].fret}. Bund`;
    setPlayStatus(`${result.qualityLabel} ✓ ${detail} · +${result.points}`, 'good');
    state.play.statusHoldUntil = performance.now() + 650;
    if (els.playHint) {
      els.playHint.textContent = state.play.mode === 'wait'
        ? `Treffer: ${detail}. Weiter mit dem nächsten Ton.`
        : `Treffer: ${detail} (${Math.round(result.deltaMs)} ms).`;
    }
    if (navigator.vibrate) navigator.vibrate(18);
    if (els.playLive) els.playLive.textContent = `${detail} richtig.`;
    if (session.finished) {
      finishPlay();
    } else if (state.play.mode === 'wait') {
      const next = session.currentEvent;
      if (next) {
        els.playTarget.textContent = eventLabel(next);
        drawPlayHighway(session.displayMs(performance.now()));
      }
    }
  }

  function pulsePlayCard() {
    els.playCard.classList.remove('pulse');
    void els.playCard.offsetWidth;
    els.playCard.classList.add('pulse');
    window.setTimeout(() => els.playCard.classList.remove('pulse'), 500);
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawPlayHighway(displayMs) {
    const canvas = els.playCanvas;
    const chart = state.play.chart;
    if (!canvas) return;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 360;
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#101020');
    gradient.addColorStop(1, '#0b0b16');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    if (!chart) return;

    const laneCount = Math.max(1, chart.stringCount || 6);
    const laneWidth = width / laneCount;
    const topY = 12;
    const hitY = height - 58;
    const display = displayMs === null
      ? (chart.events[0] ? chart.events[0].startMs - 900 : 0)
      : displayMs;
    const fallMs = 2800 / Math.max(0.5, state.play.speed);
    const session = state.play.session;
    const currentIndex = session ? session.index : 0;

    // Spuren
    for (let lane = 0; lane <= laneCount; lane += 1) {
      const x = lane * laneWidth;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, hitY);
      ctx.stroke();
    }
    // Bund-/Saiten-Labels
    ctx.textAlign = 'center';
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    for (let lane = 0; lane < laneCount; lane += 1) {
      const label = chart.tuningNames && chart.tuningNames[lane] ? chart.tuningNames[lane] : '';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(label, lane * laneWidth + laneWidth / 2, height - 20);
    }

    // Trefferlinie
    ctx.strokeStyle = 'rgba(233,69,96,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(width, hitY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(233,69,96,0.12)';
    ctx.fillRect(0, hitY - 3, width, 6);

    // Noten
    const colorFor = (index, note) => {
      if (index < currentIndex) return 'rgba(74,222,128,0.35)';
      if (index === currentIndex) return '#ff5f78';
      return note.isChord ? '#8f8fb8' : '#c9c9e6';
    };

    for (let index = 0; index < chart.events.length; index += 1) {
      const event = chart.events[index];
      const time = event.startMs - display;
      if (time > fallMs) break;
      if (time < -420) continue;
      const y = hitY - (time / fallMs) * (hitY - topY);
      const isCurrent = index === currentIndex;
      const alpha = index < currentIndex ? 0.45 : 1;
      ctx.globalAlpha = alpha;
      if (event.isChord && event.notes.length > 1) {
        const first = event.notes[0];
        const last = event.notes[event.notes.length - 1];
        ctx.strokeStyle = colorFor(index, event);
        ctx.lineWidth = isCurrent ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(first.string * laneWidth + laneWidth / 2, y);
        ctx.lineTo(last.string * laneWidth + laneWidth / 2, y);
        ctx.stroke();
      }
      event.notes.forEach((note) => {
        const lane = Math.max(0, Math.min(laneCount - 1, note.string));
        const x = lane * laneWidth + laneWidth * 0.14;
        const blockWidth = laneWidth * 0.72;
        ctx.fillStyle = colorFor(index, event);
        roundRect(ctx, x, y - 8, blockWidth, 16, 5);
        ctx.fill();
        if (isCurrent) {
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1.5;
          roundRect(ctx, x, y - 8, blockWidth, 16, 5);
          ctx.stroke();
        }
        if (blockWidth > 30) {
          ctx.fillStyle = index < currentIndex ? '#0b0b16' : '#101020';
          ctx.font = '700 8px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          ctx.fillText(`${note.name}${note.fret ? note.fret : ''}`, x + blockWidth / 2, y + 3);
        }
      });
      ctx.globalAlpha = 1;
    }

    // Count-in
    const firstEvent = chart.events[0];
    if (firstEvent && display < firstEvent.startMs - 300 && (!session || session.index === 0)) {
      const remaining = Math.ceil((firstEvent.startMs - display) / 1000);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`Start in ${Math.max(0, remaining)}`, width / 2, topY + 36);
    }

    // Fortschrittslinie am Rand
    if (session) {
      const progress = session.progress();
      ctx.fillStyle = 'rgba(233,69,96,0.55)';
      ctx.fillRect(0, 0, width * progress, 3);
    }
  }



  async function startMic() {
    if (!window.isSecureContext) {
      els.secureHint.hidden = false;
      toast('Mikrofon braucht HTTPS oder localhost.');
      return;
    }

    els.startBtn.disabled = true;
    els.startBtn.textContent = 'Mikrofon wird geöffnet …';

    try {
      const info = await engine.start(state.selectedDeviceId || undefined);
      state.running = true;
      state.selectedDeviceId = info.deviceId || '';
      persistPrefs();
      els.startScreen.hidden = true;
      els.mainApp.hidden = false;
      applyMode(state.mode);
      if (state.mode === 'trainer') {
        setStatus(`Mikrofon aktiv – spiele ${CHORDS[state.chordId].symbol}`, 'listening');
      }
      refreshDevices();
    } catch (error) {
      state.running = false;
      handleMicError(error);
    } finally {
      els.startBtn.disabled = false;
      els.startBtn.innerHTML = START_BTN_HTML;
    }
  }

  function handleMicError(error) {
    let message = 'Mikrofon konnte nicht geöffnet werden.';
    if (error && error.name === 'NotAllowedError') {
      message = 'Mikrofonzugriff verweigert. Bitte im Browser erlauben.';
    } else if (error && error.name === 'NotFoundError') {
      message = 'Kein Audio-Eingang gefunden. Bitte Gerät anschließen.';
    } else if (error && error.name === 'NotReadableError') {
      message = 'Eingang wird bereits von einer anderen App verwendet.';
    } else if (error && error.name === 'OverconstrainedError') {
      message = 'Gewähltes Gerät ist nicht verfügbar.';
    } else if (error && error.message) {
      message = error.message;
    }
    toast(message, 3600);
  }

  function handleTrackEnded() {
    state.running = false;
    stopPractice();
    stopSong();
    stopRiff();
    metronome.stop();
    els.mainApp.hidden = true;
    els.startScreen.hidden = false;
    resetMeter();
    setStatus('Eingang getrennt', 'warn', 4000);
    toast('Audio-Eingang getrennt. Bitte Mikrofon neu aktivieren.', 3600);
  }

  /* ---------- Geräte ---------- */

  async function refreshDevices() {
    let devices = [];
    try {
      devices = await engine.listDevices();
    } catch (error) {
      toast('Geräteliste konnte nicht geladen werden.');
      return;
    }

    const current = engine.deviceId || state.selectedDeviceId;
    const select = els.deviceSelect;
    select.innerHTML = '';

    const defaultOption = new Option('Standardgerät', '');
    select.add(defaultOption);

    const seen = new Set();
    let index = 0;
    devices.forEach((device) => {
      if (!device.deviceId || device.deviceId === 'default' || device.deviceId === 'communications') return;
      if (seen.has(device.deviceId)) return;
      seen.add(device.deviceId);
      index += 1;
      const label = device.label || `Audio-Eingang ${index}`;
      select.add(new Option(label, device.deviceId));
    });

    if (current && !seen.has(current)) {
      select.add(new Option('Aktueller Eingang', current));
    }

    select.value = current || '';
  }

  async function switchDevice(deviceId) {
    state.selectedDeviceId = deviceId;
    persistPrefs();
    if (!state.running) return;

    const previous = engine.deviceId;
    try {
      const info = await engine.start(deviceId || undefined);
      state.selectedDeviceId = info.deviceId || '';
      persistPrefs();
      applyMode(state.mode);
      toast(info.label ? `Eingang: ${info.label}` : 'Eingang gewechselt');
      refreshDevices();
    } catch (error) {
      toast('Gerät nicht verfügbar – versuche vorherigen Eingang.', 3200);
      if (previous) {
        try {
          await engine.start(previous);
          state.selectedDeviceId = previous;
          persistPrefs();
          applyMode(state.mode);
        } catch (fallbackError) {
          state.running = false;
          els.mainApp.hidden = true;
          els.startScreen.hidden = false;
          toast('Audio-Eingang verloren. Bitte Mikrofon neu aktivieren.', 3600);
        }
      }
      refreshDevices();
    }
  }

  /* ---------- Metronom ---------- */

  function updateSliderFill(bpm) {
    const percent = ((bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100;
    els.bpmSlider.style.setProperty('--fill', `${percent.toFixed(1)}%`);
  }

  function setBpm(value) {
    const bpm = metronome.setBpm(value);
    els.bpmSlider.value = String(bpm);
    els.bpmValue.textContent = String(bpm);
    updateSliderFill(bpm);
    persistPrefs();
  }

  function handleBeat(beat) {
    const dots = els.beatDots.children;
    for (let i = 0; i < dots.length; i += 1) {
      dots[i].classList.toggle('active', i === beat);
    }
    window.clearTimeout(state.beatTimeout);
    state.beatTimeout = window.setTimeout(clearBeatDots, 130);
  }

  function clearBeatDots() {
    const dots = els.beatDots.children;
    for (let i = 0; i < dots.length; i += 1) dots[i].classList.remove('active');
  }

  function handleMetroState(playing) {
    els.metroToggle.classList.toggle('playing', playing);
    els.metroToggle.setAttribute('aria-pressed', String(playing));
    els.metroToggle.setAttribute('aria-label', playing ? 'Metronom stoppen' : 'Metronom starten');
    if (!playing) {
      window.clearTimeout(state.beatTimeout);
      clearBeatDots();
    }
  }

  async function toggleMetronome() {
    if (metronome.playing) {
      metronome.stop();
      return;
    }
    try {
      await metronome.start();
    } catch (error) {
      toast('Metronom konnte nicht starten.');
    }
  }

  /* ---------- Settings-Sheet ---------- */

  let lastFocusedElement = null;

  function openHelp() {
    lastFocusedElement = document.activeElement;
    const clone = els.helpView.cloneNode(true);
    clone.removeAttribute('id');
    clone.removeAttribute('hidden');
    clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    els.helpModalBody.replaceChildren(...clone.childNodes);
    els.helpModal.hidden = false;
    document.body.style.overflow = 'hidden';
    els.closeHelp.focus({ preventScroll: true });
  }

  function closeHelp() {
    els.helpModal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  function initAbout() {
    if (els.appVersion && APP_VERSION) els.appVersion.textContent = APP_VERSION;
    if (els.repoLink && REPO_URL) els.repoLink.href = REPO_URL;
    if (els.kofiLink && KOFI_URL) els.kofiLink.href = KOFI_URL;
  }

  function openSettings() {
    lastFocusedElement = document.activeElement;
    els.settingsModal.hidden = false;
    document.body.style.overflow = 'hidden';
    refreshDevices();
    els.closeSettings.focus({ preventScroll: true });
  }

  function closeSettings() {
    els.settingsModal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }

  /* ---------- Toast ---------- */

  function toast(message, duration) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
      els.toast.classList.remove('show');
    }, duration || 2600);
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    els.startBtn.addEventListener('click', startMic);
    els.startHelpBtn.addEventListener('click', openHelp);

    els.settingsBtn.addEventListener('click', openSettings);
    els.closeSettings.addEventListener('click', closeSettings);
    els.settingsModal.querySelector('[data-close-settings]').addEventListener('click', closeSettings);
    els.closeHelp.addEventListener('click', closeHelp);
    els.helpModal.querySelector('[data-close-help]').addEventListener('click', closeHelp);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (!els.settingsModal.hidden) closeSettings();
      if (!els.helpModal.hidden) closeHelp();
    });

    els.settingsModal.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || els.settingsModal.hidden) return;
      const focusable = Array.from(
        els.settingsModal.querySelectorAll('button, select, input, a[href], [tabindex]:not([tabindex="-1"])')
      ).filter((element) => !element.disabled && element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    els.refreshDevices.addEventListener('click', refreshDevices);
    els.deviceSelect.addEventListener('change', (event) => switchDevice(event.target.value));

    els.modeTrainerBtn.addEventListener('click', () => applyMode('trainer'));
    els.modeTunerBtn.addEventListener('click', () => applyMode('tuner'));
    els.modePentatonicBtn.addEventListener('click', () => applyMode('pentatonic'));
    els.modeRiffBtn.addEventListener('click', () => applyMode('riff'));
    els.modeSongBtn.addEventListener('click', () => applyMode('song'));
    els.modePlayBtn.addEventListener('click', () => applyMode('play'));
    els.modeHelpBtn.addEventListener('click', () => applyMode('help'));
    els.refToneBtn.addEventListener('click', playReferenceTone);
    els.tunerAuto.addEventListener('change', (event) => setTunerAuto(event.target.checked));

    els.songSelect.addEventListener('change', (event) => {
      stopSong();
      state.song.songId = event.target.value;
      const song = currentSong();
      state.song.tempo = song.bpm;
      initSongView();
    });
    els.songBpmSlider.addEventListener('input', (event) => {
      setSongTempo(event.target.value);
    });
    els.songStart.addEventListener('click', () => { startSong(); });
    els.songListenBtn.addEventListener('click', toggleSongListen);
    els.songStop.addEventListener('click', () => {
      stopSong();
      toast('Song gestoppt');
    });

    els.playFileInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      if (file) importPlayFile(file);
    });
    els.playTrackSelect.addEventListener('change', (event) => selectPlayTrack(event.target.value));
    els.playTimedBtn.addEventListener('click', () => setPlayMode('timed'));
    els.playWaitBtn.addEventListener('click', () => setPlayMode('wait'));
    els.playSpeed.addEventListener('input', (event) => setPlaySpeed(event.target.value));
    els.playStart.addEventListener('click', startPlay);
    els.playClickBtn.addEventListener('click', togglePlayClick);
    els.playStop.addEventListener('click', () => {
      stopPlay();
      toast('Spiel gestoppt');
    });
    window.addEventListener('resize', () => {
      if (state.mode === 'play') drawPlayHighway(state.play.session ? state.play.session.displayMs(performance.now()) : null);
    });

    els.riffSelect.addEventListener('change', (event) => {
      stopRiff();
      state.riff.riffId = event.target.value;
      initRiffView();
      persistPrefs();
    });
    els.riffPreviewBtn.addEventListener('click', previewRiff);
    els.riffStart.addEventListener('click', startRiff);
    els.riffStop.addEventListener('click', () => {
      stopRiff();
      toast('Riff-Übung gestoppt');
    });
    els.riffClickBtn.addEventListener('click', toggleRiffClick);

    els.scaleRoot.addEventListener('change', (event) => {
      state.scale.rootPc = Number(event.target.value);
      stopPractice();
      updateScaleDisplay();
      refreshPracticeSequence();
      persistPrefs();
    });
    els.scaleMinorBtn.addEventListener('click', () => applyScaleType('minor'));
    els.scaleMajorBtn.addEventListener('click', () => applyScaleType('major'));
    if (els.cagedRoot) {
      els.cagedRoot.addEventListener('change', (event) => setCagedRoot(event.target.value));
    }
    if (els.chordPlayBtn) {
      els.chordPlayBtn.addEventListener('click', playSelectedChord);
    }

    els.scaleRepeats.addEventListener('input', (event) => {
      state.scale.repeats = Number(event.target.value);
      syncPracticeControls();
      stopPractice();
      refreshPracticeSequence();
      persistPrefs();
    });
    els.scaleBackward.addEventListener('change', (event) => {
      state.scale.backward = event.target.checked;
      stopPractice();
      refreshPracticeSequence();
      persistPrefs();
    });
    els.scalePreviewBtn.addEventListener('click', previewScale);

    els.practiceStart.addEventListener('click', startPractice);
    els.practiceStop.addEventListener('click', () => {
      stopPractice();
      toast('Übung gestoppt');
    });

    els.exportStats.addEventListener('click', exportStatsCsv);

    els.resetStats.addEventListener('click', () => {
      if (!window.confirm('Statistik wirklich zurücksetzen?')) return;
      state.stats = Stats.resetStats(window.localStorage, CHORD_ORDER);
      Stats.saveStats(window.localStorage, state.stats);
      renderStats();
      toast('Statistik zurückgesetzt');
    });

    els.bpmSlider.addEventListener('input', (event) => setBpm(event.target.value));
    els.metroToggle.addEventListener('click', toggleMetronome);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        metronome.stop();
        stopSong();
        stopRiff();
      }
    });

    window.addEventListener('pagehide', () => {
      metronome.stop();
      stopSong();
      stopRiff();
      engine.stopStream();
    });

    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      // Aus dem bfcache zurück: der alte Stream ist beendet, also sauber
      // wieder am Start-Screen aufsetzen.
      state.running = false;
      stopPractice();
      stopSong();
      els.mainApp.hidden = true;
      els.startScreen.hidden = false;
      resetMeter();
      setStatus('Mikrofon aktivieren', '');
    });

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    }
  }

  /* ---------- Init ---------- */

  function init() {
    if (!window.isSecureContext) {
      els.secureHint.hidden = false;
    }

    buildChordButtons();
    buildTunerStrings();
    buildScaleRootOptions();
    buildPatternButtons();
    buildCagedRootOptions();
    if (els.helpChordDemo) {
      els.helpChordDemo.innerHTML = renderFretboard(CHORDS.G);
    }
    updateScaleDisplay();
    refreshPracticeSequence();
    syncPracticeControls();
    stopPractice();
    updateCagedDisplay();
    buildSongOptions();
    initSongView();
    buildRiffOptions();
    initRiffView();
    renderStats();
    initAbout();
    updateTunerTarget();
    setBpm(metronome.bpm);
    bindEvents();
    applyMode(state.mode);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {
          /* Offline-Modus ist optional; die App funktioniert auch ohne SW. */
        });
      });
    }
  }

  init();
})();
