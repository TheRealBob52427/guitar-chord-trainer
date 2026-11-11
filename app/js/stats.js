/**
 * Persistente Akkord-Statistik (localStorage) mit Migration vom alten
 * {correct,total}-Format und CSV-Export.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'guitarTrainer.stats.v2';
  const LEGACY_KEY = 'guitarTrainer.stats.v1';

  function toCount(value) {
    const numeric = Math.floor(Number(value));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }

  function emptyByChord(order) {
    const byChord = {};
    order.forEach((id) => {
      byChord[id] = { correct: 0, total: 0 };
    });
    return byChord;
  }

  function createEmptyStats(order) {
    return {
      version: 2,
      correct: 0,
      total: 0,
      byChord: emptyByChord(order),
      updatedAt: null
    };
  }

  /**
   * Validiert und repariert gespeicherte Daten. Unbekannte Akkorde werden
   * verworfen, korrupte Zahlen zu 0, Inkonsistenzen zugunsten der Summen
   * der Einzelakkorde korrigiert.
   */
  function normalizeStats(raw, order) {
    const stats = createEmptyStats(order);
    if (!raw || typeof raw !== 'object') return stats;

    let assignedTotal = 0;
    let assignedCorrect = 0;
    order.forEach((id) => {
      const entry = raw.byChord && raw.byChord[id];
      let correct = toCount(entry && entry.correct);
      let total = toCount(entry && entry.total);
      if (total < correct) total = correct;
      stats.byChord[id] = { correct, total };
      assignedTotal += total;
      assignedCorrect += correct;
    });

    stats.total = Math.max(toCount(raw.total), assignedTotal);
    stats.correct = Math.min(stats.total, Math.max(toCount(raw.correct), assignedCorrect));
    if (typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))) {
      stats.updatedAt = raw.updatedAt;
    }
    return stats;
  }

  function loadStats(storage, order) {
    if (!storage || typeof storage.getItem !== 'function') return createEmptyStats(order);
    try {
      const v2 = storage.getItem(STORAGE_KEY);
      if (v2) return normalizeStats(JSON.parse(v2), order);
    } catch (error) { /* korrupte Daten -> Migration/Neustart */ }

    try {
      const legacy = storage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return normalizeStats({
          total: parsed.total,
          correct: parsed.correct
        }, order);
      }
    } catch (error) { /* ignorieren */ }

    return createEmptyStats(order);
  }

  function saveStats(storage, stats) {
    if (!storage || typeof storage.setItem !== 'function') return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(stats));
      return true;
    } catch (error) {
      return false;
    }
  }

  function recordAttempt(stats, order, chordId, success) {
    if (!stats || !stats.byChord || !stats.byChord[chordId]) return stats;
    stats.total += 1;
    if (success) stats.correct += 1;
    stats.byChord[chordId].total += 1;
    if (success) stats.byChord[chordId].correct += 1;
    stats.updatedAt = new Date().toISOString();
    return stats;
  }

  function resetStats(storage, order) {
    try {
      if (storage && typeof storage.removeItem === 'function') {
        storage.removeItem(STORAGE_KEY);
        storage.removeItem(LEGACY_KEY);
      }
    } catch (error) { /* ignorieren */ }
    return createEmptyStats(order);
  }

  function summarize(stats, order) {
    const rows = order.map((id) => {
      const entry = (stats.byChord && stats.byChord[id]) || { correct: 0, total: 0 };
      return {
        id,
        correct: entry.correct,
        total: entry.total,
        percent: entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0
      };
    });
    const assignedTotal = rows.reduce((sum, row) => sum + row.total, 0);
    const assignedCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
    const unassignedTotal = Math.max(0, stats.total - assignedTotal);
    const unassignedCorrect = Math.max(0, Math.min(unassignedTotal, stats.correct - assignedCorrect));
    return {
      correct: stats.correct,
      total: stats.total,
      percent: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      rows,
      unassignedTotal,
      unassignedCorrect,
      updatedAt: stats.updatedAt
    };
  }

  function csvCell(value) {
    const text = String(value);
    return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  /**
   * CSV mit Semikolon (deutsches Excel), inkl. Zeile für Altbestand aus dem
   * v1-Format, der keinem Akkord zugeordnet werden kann.
   */
  function buildCsv(stats, chords, order) {
    const summary = summarize(stats, order);
    const rows = [['Akkord', 'Versuche', 'Treffer', 'Trefferquote']];

    summary.rows.forEach((row) => {
      const name = (chords[row.id] && chords[row.id].name) || row.id;
      rows.push([
        name,
        row.total,
        row.correct,
        row.total > 0 ? `${row.percent} %` : '–'
      ]);
    });

    if (summary.unassignedTotal > 0) {
      rows.push([
        'Altbestand (v1)',
        summary.unassignedTotal,
        summary.unassignedCorrect,
        `${Math.round((summary.unassignedCorrect / summary.unassignedTotal) * 100)} %`
      ]);
    }

    rows.push([
      'Gesamt',
      summary.total,
      summary.correct,
      summary.total > 0 ? `${summary.percent} %` : '–'
    ]);

    return `${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
  }

  function exportFilename(date) {
    const value = date instanceof Date ? date : new Date();
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `akkord-statistik-${year}-${month}-${day}.csv`;
  }

  const api = {
    STORAGE_KEY,
    LEGACY_KEY,
    createEmptyStats,
    normalizeStats,
    loadStats,
    saveStats,
    recordAttempt,
    resetStats,
    summarize,
    buildCsv,
    exportFilename
  };

  global.ChordTrainer = global.ChordTrainer || {};
  global.ChordTrainer.Stats = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
