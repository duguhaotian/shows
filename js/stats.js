(function (root) {
  "use strict";

  var KEY = "grade2-oral-stats-v1";
  var MAX_SESSIONS = 40;
  var memory = null;

  function clampCount(value) {
    var n = value | 0;
    if (n < 0) return 0;
    if (n > 10000) return 10000;
    return n;
  }

  function storageGet() {
    try {
      return root.localStorage ? root.localStorage.getItem(KEY) : null;
    } catch (error) {
      return null;
    }
  }

  function storageSet(value) {
    try {
      if (root.localStorage) root.localStorage.setItem(KEY, value);
      else memory = value;
    } catch (error) {
      memory = value;
    }
  }

  function storageRemove() {
    try {
      if (root.localStorage) root.localStorage.removeItem(KEY);
    } catch (error) {
      /* keep the in-memory copy cleared below */
    }
    memory = null;
  }

  function load() {
    var raw = storageGet();
    if (raw == null && memory) raw = memory;
    if (!raw) return [];
    try {
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function save(list) {
    var raw = JSON.stringify(list);
    memory = raw;
    storageSet(raw);
  }

  function cleanSession(session) {
    var byKind = {};
    var source = session && session.byKind ? session.byKind : {};
    Object.keys(source).forEach(function (kind) {
      var row = source[kind] || {};
      var correct = clampCount(row.correct);
      var wrong = clampCount(row.wrong);
      var blank = clampCount(row.blank);
      if (correct + wrong + blank === 0) return;
      byKind[kind] = { correct: correct, wrong: wrong, blank: blank };
    });
    var correct = 0;
    var wrong = 0;
    var blank = 0;
    Object.keys(byKind).forEach(function (kind) {
      correct += byKind[kind].correct;
      wrong += byKind[kind].wrong;
      blank += byKind[kind].blank;
    });
    return {
      at: session && session.at ? session.at : Date.now(),
      topicId: session && session.topicId ? String(session.topicId) : "",
      seconds: clampCount(session && session.seconds),
      correct: correct,
      wrong: wrong,
      blank: blank,
      total: correct + wrong + blank,
      byKind: byKind
    };
  }

  function record(session) {
    var cleaned = cleanSession(session);
    if (!cleaned.total) return load();
    var list = load();
    list.push(cleaned);
    if (list.length > MAX_SESSIONS) list = list.slice(list.length - MAX_SESSIONS);
    save(list);
    return list;
  }

  function clear() {
    storageRemove();
    memory = null;
  }

  function accuracy(correct, total) {
    if (!total) return null;
    return Math.round((correct / total) * 100);
  }

  function summarize(sessions) {
    var list = sessions || [];
    var correct = 0;
    var wrong = 0;
    var blank = 0;
    var seconds = 0;
    var byKind = {};
    list.forEach(function (session) {
      correct += session.correct || 0;
      wrong += session.wrong || 0;
      blank += session.blank || 0;
      seconds += session.seconds || 0;
      var kinds = session.byKind || {};
      Object.keys(kinds).forEach(function (kind) {
        var row = kinds[kind];
        if (!byKind[kind]) byKind[kind] = { correct: 0, wrong: 0, blank: 0 };
        byKind[kind].correct += row.correct || 0;
        byKind[kind].wrong += row.wrong || 0;
        byKind[kind].blank += row.blank || 0;
      });
    });
    var total = correct + wrong + blank;
    var weakest = null;
    Object.keys(byKind).forEach(function (kind) {
      var row = byKind[kind];
      row.total = row.correct + row.wrong + row.blank;
      row.accuracy = accuracy(row.correct, row.total);
      if (row.total < 4) return;
      if (!weakest || row.accuracy < weakest.accuracy || (row.accuracy === weakest.accuracy && row.wrong > weakest.wrong)) {
        weakest = { kind: kind, accuracy: row.accuracy, wrong: row.wrong, total: row.total };
      }
    });
    var recent = list.slice(-8);
    return {
      sessions: list.length,
      correct: correct,
      wrong: wrong,
      blank: blank,
      total: total,
      seconds: seconds,
      accuracy: accuracy(correct, total),
      secondsPerQuestion: total ? Math.round((seconds / total) * 10) / 10 : null,
      byKind: byKind,
      recent: recent.map(function (session) {
        return accuracy(session.correct, session.total);
      }),
      weakest: weakest
    };
  }

  root.Stats = {
    load: load,
    record: record,
    clear: clear,
    summarize: summarize,
    accuracy: accuracy
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
