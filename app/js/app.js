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
    TUNING_STRINGS,
    GAUGE_RANGE_CENTS,
    frequencyToNote,
    centsFromFrequency,
    isInTune,
    formatCents,
    formatHz,
    NOTE_NAMES,
    scalePitchClasses,
    scaleLabel,
    buildSequence: buildPentatonicSequence,
    renderPentatonicFretboard
  } = window.ChordTrainer;
  const MATCH_SCORE = DEFAULTS.matchThreshold;
  const MIN_BPM = 40;
  const MAX_BPM = 180;

  const els = {
    startScreen: document.getElementById('startScreen'),
    startBtn: document.getElementById('startBtn'),
    secureHint: document.getElementById('secureHint'),
    mainApp: document.getElementById('mainApp'),
    modeTrainerBtn: document.getElementById('modeTrainerBtn'),
    modeTunerBtn: document.getElementById('modeTunerBtn'),
    modePentatonicBtn: document.getElementById('modePentatonicBtn'),
    trainerView: document.getElementById('trainerView'),
    tunerView: document.getElementById('tunerView'),
    pentatonicView: document.getElementById('pentatonicView'),
    tunerCard: document.getElementById('tunerCard'),
    tunerNote: document.getElementById('tunerNote'),
    tunerCents: document.getElementById('tunerCents'),
    tunerFreq: document.getElementById('tunerFreq'),
    tunerNeedle: document.getElementById('tunerNeedle'),
    tunerStatus: document.getElementById('tunerStatus'),
    tunerStatusDot: document.getElementById('tunerStatusDot'),
    tunerTarget: document.getElementById('tunerTarget'),
    tunerStrings: document.getElementById('tunerStrings'),
    refToneBtn: document.getElementById('refToneBtn'),
    tunerLive: document.getElementById('tunerLive'),
    scaleHeading: document.getElementById('scaleHeading'),
    scaleNotes: document.getElementById('scaleNotes'),
    scaleRoot: document.getElementById('scaleRoot'),
    scaleMinorBtn: document.getElementById('scaleMinorBtn'),
    scaleMajorBtn: document.getElementById('scaleMajorBtn'),
    scaleFretboard: document.getElementById('scaleFretboard'),
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
    scaleAttacks: document.getElementById('scaleAttacks'),
    attacksValue: document.getElementById('attacksValue'),
    scaleRepeats: document.getElementById('scaleRepeats'),
    repeatsValue: document.getElementById('repeatsValue'),
    practiceStart: document.getElementById('practiceStart'),
    practiceStop: document.getElementById('practiceStop'),
    practiceHint: document.getElementById('practiceHint'),
    practiceLive: document.getElementById('practiceLive'),
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
    deviceSelect: document.getElementById('deviceSelect'),
    refreshDevices: document.getElementById('refreshDevices'),
    resetStats: document.getElementById('resetStats'),
    exportStats: document.getElementById('exportStats'),
    statsText: document.getElementById('statsText'),
    statsBreakdown: document.getElementById('statsBreakdown'),
    toast: document.getElementById('toast')
  };

  const state = {
    chordId: 'G',
    mode: 'trainer',
    tuningStringIndex: 0,
    tunerSmoothCents: null,
    tunerWasInTune: false,
    scale: {
      rootPc: 9,
      type: 'minor',
      attacks: 15,
      repeats: 2,
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
    running: false,
    selectedDeviceId: '',
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
    onError: () => {}
  });

  const metronome = new Metronome({
    getContext: () => engine.ctx,
    onBeat: handleBeat,
    onStateChange: handleMetroState
  });

  const START_BTN_HTML = '<span aria-hidden="true">🎤</span> Mikrofon aktivieren';

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
      button.addEventListener('click', () => selectChord(id));
      els.chordButtons.append(button);
    });
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

  /* ---------- Modus & Stimmgerät ---------- */

  function applyMode(mode) {
    const next = (mode === 'tuner' || mode === 'pentatonic') ? mode : 'trainer';
    const tunerActive = next === 'tuner';
    const pentatonicActive = next === 'pentatonic';
    state.mode = next;
    engine.stopReferenceTone();

    els.modeTrainerBtn.classList.toggle('active', next === 'trainer');
    els.modeTunerBtn.classList.toggle('active', tunerActive);
    els.modePentatonicBtn.classList.toggle('active', pentatonicActive);
    els.modeTrainerBtn.setAttribute('aria-pressed', String(next === 'trainer'));
    els.modeTunerBtn.setAttribute('aria-pressed', String(tunerActive));
    els.modePentatonicBtn.setAttribute('aria-pressed', String(pentatonicActive));

    els.trainerView.hidden = next !== 'trainer';
    els.tunerView.hidden = !tunerActive;
    els.pentatonicView.hidden = !pentatonicActive;

    if (tunerActive) {
      stopPractice();
      metronome.stop();
      engine.setMode('tuner');
      state.tunerSmoothCents = null;
      state.tunerWasInTune = false;
      updateTunerTarget();
      resetTunerDisplay();
    } else if (pentatonicActive) {
      stopPractice();
      metronome.stop();
      engine.setMode('scale');
      updateScaleDisplay();
    } else {
      stopPractice();
      engine.setMode('chords');
      selectChord(state.chordId);
    }
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
    els.tunerTarget.textContent = `${target.id} · ${formatHz(target.frequency)}`;
    els.refToneBtn.textContent = `Referenzton ${target.id} abspielen`;
    els.tunerStrings.querySelectorAll('.string-btn').forEach((button) => {
      const active = Number(button.dataset.stringIndex) === state.tuningStringIndex;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function selectTuningString(index) {
    if (!TUNING_STRINGS[index]) return;
    state.tuningStringIndex = index;
    state.tunerSmoothCents = null;
    state.tunerWasInTune = false;
    engine.stopReferenceTone();
    updateTunerTarget();
    resetTunerDisplay();
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
    setTunerStatus(`Spiele die ${target.description} …`, '');
  }

  function handleTunerUpdate(update) {
    if (state.mode !== 'tuner') return;
    const target = TUNING_STRINGS[state.tuningStringIndex];

    if (!update.pitch) {
      state.tunerSmoothCents = null;
      state.tunerWasInTune = false;
      els.tunerNote.textContent = '–';
      els.tunerNote.classList.remove('in-tune');
      els.tunerCents.textContent = '0 Cent';
      els.tunerFreq.textContent = update.silent ? 'Kein Signal' : 'Ton unklar';
      els.tunerNeedle.style.left = '50%';
      els.tunerCard.classList.remove('is-good');
      els.tunerCard.classList.remove('is-warn');
      setTunerStatus(
        update.silent ? `Spiele die ${target.description} …` : 'Ton unklar – näher ans Mikrofon',
        update.silent ? '' : 'warn'
      );
      els.tunerLive.textContent = '';
      return;
    }

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
  }

  function updateScaleDisplay() {
    const { rootPc, type } = state.scale;
    const pcs = scalePitchClasses(rootPc, type);
    els.scaleHeading.textContent = scaleLabel(rootPc, type);
    els.scaleNotes.textContent = pcs.map((pc) => NOTE_NAMES[pc]).join(' · ');
    els.scaleFretboard.innerHTML = renderPentatonicFretboard(rootPc, type);
    els.scaleRoot.value = String(rootPc);
    updateScaleTypeButtons();
    updateScaleHighlight();
  }

  function refreshPracticeSequence() {
    const scale = state.scale;
    scale.sequence = buildPentatonicSequence(scale.rootPc, scale.type, scale.attacks, scale.repeats);
    els.practiceInfo.textContent = `${scale.attacks} Anschläge · ${scale.repeats}× pro Ton`;
    renderPracticeSequence();

    if (!scale.active) {
      const first = scale.sequence[0];
      els.practiceTarget.textContent = first ? first.name : '–';
      els.practiceTarget.classList.remove('is-good');
      els.practiceDetected.textContent = 'Erkannt: –';
      updatePracticeProgress();
      updateScaleHighlight();
    }
  }

  function renderPracticeSequence() {
    els.practiceSequence.textContent = '';
    const sequence = state.scale.sequence;
    const total = sequence.length;
    const visibleCount = 6;
    let start = state.scale.index;
    if (start >= total) start = Math.max(0, total - visibleCount);
    if (!state.scale.active) start = 0;

    sequence.slice(start, start + visibleCount).forEach((note, offset) => {
      const index = start + offset;
      const chip = document.createElement('span');
      chip.className = 'seq-chip';
      chip.dataset.index = String(index);
      chip.textContent = note.name;
      chip.setAttribute('aria-label', `${index + 1}. ${note.name}`);
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
    els.attacksValue.textContent = String(state.scale.attacks);
    els.repeatsValue.textContent = `${state.scale.repeats}×`;
    updateScaleSliderFill(els.scaleAttacks, state.scale.attacks, 5, 40);
    updateScaleSliderFill(els.scaleRepeats, state.scale.repeats, 1, 4);
  }

  function pulsePracticeCard() {
    els.practiceCard.classList.remove('pulse');
    void els.practiceCard.offsetWidth;
    els.practiceCard.classList.add('pulse');
    window.setTimeout(() => els.practiceCard.classList.remove('pulse'), 760);
  }

  function setScaleControlsDisabled(disabled) {
    [els.scaleRoot, els.scaleMinorBtn, els.scaleMajorBtn, els.scaleAttacks, els.scaleRepeats]
      .forEach((element) => { element.disabled = disabled; });
  }

  function updateScaleHighlight() {
    const active = state.scale.active;
    const target = active ? state.scale.sequence[state.scale.index] : null;
    els.scaleFretboard.querySelectorAll('[data-pc]').forEach((element) => {
      const isTarget = Boolean(target && Number(element.dataset.pc) === target.pc);
      element.classList.toggle('is-target', isTarget);
    });
  }

  function stopPractice() {
    const scale = state.scale;
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
    els.practiceTargetLabel.textContent = 'Zielton';
    setPracticeStatus('Bereit zum Üben', '');
    els.practiceDetected.textContent = 'Erkannt: –';
    els.practiceHint.textContent = 'Wähle Pentatonik und Anschläge, dann starte die Übung. Spiele jeden Ton einzeln und sauber.';

    const first = scale.sequence[0];
    els.practiceTarget.textContent = first ? first.name : '–';
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
    els.practiceTargetLabel.textContent = 'Zielton';
    els.practiceHint.textContent = 'Jeden Ton einzeln anschlagen. Bei Wiederholungen kurz abdämpfen, damit der nächste Anschlag erkannt wird.';
    els.practiceDetected.textContent = 'Erkannt: –';

    const target = scale.sequence[0];
    els.practiceTarget.textContent = target.name;
    setPracticeStatus(`Spiele ${target.name} …`, 'listening');
    updatePracticeProgress();
    renderPracticeSequence();
    updateScaleHighlight();

    engine.setMode('scale');
    metronome.stop();

    if (els.practiceLive) {
      els.practiceLive.textContent = `Übung gestartet. Erster Ton: ${target.name}.`;
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
    els.practiceHint.textContent = `${scale.hits} von ${scale.sequence.length} Anschlägen richtig` +
      (scale.misses > 0 ? ` · ${scale.misses} Fehler` : '') + '.';
    els.practiceCard.classList.add('is-good');
    pulsePracticeCard();
    updatePracticeProgress();
    renderPracticeSequence();
    updateScaleHighlight();

    if (navigator.vibrate) navigator.vibrate([40, 50, 80]);
    if (els.practiceLive) {
      els.practiceLive.textContent = `Übung geschafft. ${scale.hits} von ${scale.sequence.length} Anschlägen richtig.`;
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
    els.practiceTarget.textContent = next.name;
    els.practiceTarget.classList.remove('is-good');
    setPracticeStatus(`Spiele ${next.name} …`, 'listening');
    if (els.practiceLive) {
      els.practiceLive.textContent = `${target.name} richtig. Weiter mit ${next.name}.`;
    }
  }

  function handlePitchUpdate(update) {
    if (state.mode === 'tuner') {
      handleTunerUpdate(update);
    } else if (state.mode === 'pentatonic') {
      handleScalePitch(update);
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

  /* ---------- Mikrofon ---------- */

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
      state.selectedDeviceId = info.deviceId || state.selectedDeviceId;
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
    if (!state.running) return;

    const previous = engine.deviceId;
    try {
      const info = await engine.start(deviceId || undefined);
      state.selectedDeviceId = info.deviceId || deviceId;
      applyMode(state.mode);
      toast(info.label ? `Eingang: ${info.label}` : 'Eingang gewechselt');
      refreshDevices();
    } catch (error) {
      toast('Gerät nicht verfügbar – versuche vorherigen Eingang.', 3200);
      if (previous) {
        try {
          await engine.start(previous);
          state.selectedDeviceId = previous;
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

    els.settingsBtn.addEventListener('click', openSettings);
    els.closeSettings.addEventListener('click', closeSettings);
    els.settingsModal.querySelector('[data-close-settings]').addEventListener('click', closeSettings);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !els.settingsModal.hidden) closeSettings();
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
    els.refToneBtn.addEventListener('click', playReferenceTone);

    els.scaleRoot.addEventListener('change', (event) => {
      state.scale.rootPc = Number(event.target.value);
      stopPractice();
      updateScaleDisplay();
      refreshPracticeSequence();
    });
    els.scaleMinorBtn.addEventListener('click', () => applyScaleType('minor'));
    els.scaleMajorBtn.addEventListener('click', () => applyScaleType('major'));

    els.scaleAttacks.addEventListener('input', (event) => {
      state.scale.attacks = Number(event.target.value);
      syncPracticeControls();
      stopPractice();
      refreshPracticeSequence();
    });
    els.scaleRepeats.addEventListener('input', (event) => {
      state.scale.repeats = Number(event.target.value);
      syncPracticeControls();
      stopPractice();
      refreshPracticeSequence();
    });

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
      if (document.hidden) metronome.stop();
    });

    window.addEventListener('pagehide', () => {
      metronome.stop();
      engine.stopStream();
    });

    window.addEventListener('pageshow', (event) => {
      if (!event.persisted) return;
      // Aus dem bfcache zurück: der alte Stream ist beendet, also sauber
      // wieder am Start-Screen aufsetzen.
      state.running = false;
      stopPractice();
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
    updateScaleDisplay();
    refreshPracticeSequence();
    syncPracticeControls();
    stopPractice();
    renderStats();
    updateTunerTarget();
    setBpm(metronome.bpm);
    bindEvents();
    applyMode('trainer');

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
