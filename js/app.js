(function () {
  "use strict";

  var practice = globalThis.Practice;
  var state = {
    topicId: "mixall",
    count: 20,
    items: [],
    startedAt: 0,
    checked: false,
    active: null
  };

  var topicBox = document.querySelector("#topics");
  var countBox = document.querySelector("#counts");
  var sheet = document.querySelector("#sheet");
  var list = document.querySelector("#questions");
  var result = document.querySelector("#result");
  var timer = document.querySelector("#timer");
  var title = document.querySelector("#sheet-title");
  var startBtn = document.querySelector("#start");
  var checkBtn = document.querySelector("#check");
  var againBtn = document.querySelector("#again");
  var printBtn = document.querySelector("#print");
  var keypad = document.querySelector("#keypad");
  var analysisBody = document.querySelector("#analysis-body");
  var clearBtn = document.querySelector("#clear-stats");
  var timerId = 0;
  var stats = globalThis.Stats;

  practice.TOPICS.forEach(function (topic) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "topic";
    button.dataset.topic = topic.id;
    button.setAttribute("aria-pressed", topic.id === state.topicId ? "true" : "false");
    var name = document.createElement("strong");
    name.textContent = topic.name;
    var hint = document.createElement("span");
    hint.textContent = topic.hint;
    button.append(name, hint);
    button.addEventListener("click", function () {
      state.topicId = topic.id;
      syncTopics();
    });
    topicBox.append(button);
  });

  [10, 20, 30].forEach(function (count) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.dataset.count = String(count);
    button.textContent = count + " 题";
    button.setAttribute("aria-pressed", count === state.count ? "true" : "false");
    button.addEventListener("click", function () {
      state.count = count;
      syncCounts();
    });
    countBox.append(button);
  });

  function syncTopics() {
    topicBox.querySelectorAll(".topic").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.topic === state.topicId ? "true" : "false");
    });
  }

  function syncCounts() {
    countBox.querySelectorAll(".chip").forEach(function (button) {
      button.setAttribute("aria-pressed", Number(button.dataset.count) === state.count ? "true" : "false");
    });
  }

  function topicName(id) {
    var found = practice.TOPICS.filter(function (topic) { return topic.id === id; })[0];
    return found ? found.name : "口算";
  }

  function formatSeconds(seconds) {
    var min = Math.floor(seconds / 60);
    var sec = seconds % 60;
    return min + " 分 " + String(sec).padStart(2, "0") + " 秒";
  }

  function formatWhen(ts) {
    var date = new Date(ts);
    var pad = function (n) { return String(n).padStart(2, "0"); };
    return (date.getMonth() + 1) + "月" + date.getDate() + "日 " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  }

  function outcome(item, raws) {
    if (practice.isCorrect(item, raws)) return "correct";
    var blank = item.fields.every(function (field, index) {
      return String(raws[index] == null ? "" : raws[index]).trim() === "";
    });
    return blank ? "blank" : "wrong";
  }

  function addText(parent, tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    parent.append(node);
    return node;
  }

  function renderAnalysis() {
    var sessions = stats.load();
    var summary = stats.summarize(sessions);
    analysisBody.replaceChildren();
    clearBtn.classList.toggle("hidden", summary.sessions === 0);
    if (!summary.sessions) {
      addText(analysisBody, "p", "meta", "还没有记录。做完一组并检查答案后，这里会统计正确率、用时和各题型表现。记录只保存在这台浏览器里。");
      return;
    }

    var grid = document.createElement("div");
    grid.className = "stat-grid";
    [
      [summary.accuracy + "%", "总正确率"],
      [String(summary.correct) + " / " + summary.total, "做对题数"],
      [String(summary.wrong), "答错"],
      [String(summary.blank), "未做"],
      [summary.secondsPerQuestion + " 秒", "平均每题"],
      [String(summary.sessions), "练习次数"]
    ].forEach(function (pair) {
      var card = document.createElement("div");
      card.className = "stat-card";
      addText(card, "strong", "", pair[0]);
      addText(card, "span", "", pair[1]);
      grid.append(card);
    });
    analysisBody.append(grid);

    var insight = document.createElement("p");
    insight.className = "insight";
    if (!summary.weakest) {
      insight.textContent = "各题型还不到 4 题，再练一组就能看出哪里比较弱。";
    } else if (summary.weakest.accuracy >= 90) {
      insight.textContent = "练得比较多的题型里，最低正确率也有 " + summary.weakest.accuracy + "%。可以继续用综合练习保持手感。";
    } else {
      insight.textContent = topicName(summary.weakest.kind) + " 正确率 " + summary.weakest.accuracy + "%，是目前最需要再练的题型。";
    }
    analysisBody.append(insight);

    addText(analysisBody, "h3", "subhead", "各题型正确率");
    practice.SKILL_IDS.forEach(function (kind) {
      var row = summary.byKind[kind];
      var line = document.createElement("div");
      line.className = "bar-row";
      addText(line, "span", "", topicName(kind));
      var track = document.createElement("span");
      track.className = "bar-track";
      var fill = document.createElement("span");
      fill.className = "bar-fill";
      var percent = row ? row.accuracy : 0;
      if (summary.weakest && summary.weakest.kind === kind) fill.classList.add("weak");
      fill.style.width = (row ? percent : 0) + "%";
      track.append(fill);
      line.append(track);
      addText(line, "span", "bar-num", row ? percent + "%" : "—");
      analysisBody.append(line);
    });

    addText(analysisBody, "h3", "subhead", "最近正确率");
    var trend = document.createElement("div");
    trend.className = "trend";
    trend.setAttribute("role", "img");
    trend.setAttribute("aria-label", "最近 " + summary.recent.length + " 次正确率");
    summary.recent.forEach(function (percent) {
      var col = document.createElement("div");
      col.className = "trend-col";
      var track = document.createElement("span");
      track.className = "trend-track";
      var bar = document.createElement("span");
      bar.className = "trend-bar";
      bar.style.height = Math.max(percent, 4) + "%";
      track.append(bar);
      col.append(track);
      addText(col, "span", "", String(percent));
      trend.append(col);
    });
    analysisBody.append(trend);

    addText(analysisBody, "h3", "subhead", "最近记录");
    var history = document.createElement("ol");
    history.className = "history";
    sessions.slice(-8).reverse().forEach(function (session) {
      var item = document.createElement("li");
      addText(item, "span", "", formatWhen(session.at));
      addText(item, "span", "", topicName(session.topicId));
      addText(item, "span", "", session.correct + "/" + session.total);
      addText(item, "span", "", formatSeconds(session.seconds));
      history.append(item);
    });
    analysisBody.append(history);
  }

  function elapsedText() {
    var seconds = Math.max(0, Math.round((Date.now() - state.startedAt) / 1000));
    var min = Math.floor(seconds / 60);
    var sec = seconds % 60;
    return min + " 分 " + String(sec).padStart(2, "0") + " 秒";
  }

  function render() {
    list.replaceChildren();
    state.items.forEach(function (item, index) {
      var row = document.createElement("li");
      row.className = "question";
      var num = document.createElement("span");
      num.className = "num";
      num.textContent = String(index + 1).padStart(2, "0");
      var expr = document.createElement("div");
      expr.className = "expr";
      var prompt = document.createElement("span");
      prompt.textContent = item.prompt + " =";
      expr.append(prompt);
      item.fields.forEach(function (field, fieldIndex) {
        var group = document.createElement("span");
        group.className = "pair";
        if (field.label) {
          var label = document.createElement("span");
          label.className = "field-label";
          label.textContent = field.label;
          group.append(label);
        }
        var input = document.createElement("input");
        input.className = "answer";
        input.inputMode = "numeric";
        input.autocomplete = "off";
        input.setAttribute("aria-label", "第 " + (index + 1) + " 题" + (field.label ? field.label : "答案"));
        input.dataset.index = String(index);
        input.dataset.field = String(fieldIndex);
        input.addEventListener("focus", function () { state.active = input; });
        input.addEventListener("keydown", onKeydown);
        group.append(input);
        expr.append(group);
      });
      var mark = document.createElement("span");
      mark.className = "mark";
      expr.append(mark);
      row.append(num, expr);
      list.append(row);
    });
    title.textContent = topicName(state.topicId);
    state.checked = false;
    clearInterval(timerId);
    timer.textContent = "用时 0 分 00 秒";
    timerId = setInterval(function () {
      if (!state.checked) timer.textContent = "用时 " + elapsedText();
    }, 1000);
    result.classList.add("hidden");
    result.replaceChildren();
    sheet.classList.remove("hidden");
    keypad.classList.remove("hidden");
    sheet.scrollIntoView({ behavior: "smooth", block: "start" });
    var first = list.querySelector("input");
    if (first) first.focus();
  }

  function answersFor(index) {
    return Array.prototype.map.call(
      list.querySelectorAll('input[data-index="' + index + '"]'),
      function (input) { return input.value; }
    );
  }

  function check() {
    if (state.checked || !state.items.length) return;
    var correct = 0;
    var byKind = {};
    state.items.forEach(function (item, index) {
      var row = list.children[index];
      var inputs = row.querySelectorAll("input");
      var raws = answersFor(index);
      var resultKind = outcome(item, raws);
      var bucket = byKind[item.kind] || (byKind[item.kind] = { correct: 0, wrong: 0, blank: 0 });
      bucket[resultKind] += 1;
      var ok = resultKind === "correct";
      row.classList.toggle("correct", ok);
      row.classList.toggle("wrong", !ok);
      if (ok) correct += 1;
      var mark = row.querySelector(".mark");
      if (ok) {
        mark.className = "mark ok";
        mark.textContent = "对";
      } else {
        mark.className = "mark no";
        var expected = item.fields.map(function (field) {
          return (field.label ? field.label : "") + field.answer;
        }).join(" …… ");
        mark.textContent = "答案 " + expected;
      }
      inputs.forEach(function (input) { input.readOnly = true; });
    });
    state.checked = true;
    clearInterval(timerId);
    var seconds = Math.max(0, Math.round((Date.now() - state.startedAt) / 1000));
    stats.record({
      at: Date.now(),
      topicId: state.topicId,
      seconds: seconds,
      byKind: byKind
    });
    renderAnalysis();
    var score = document.createElement("p");
    score.className = "score";
    score.textContent = "做对 " + correct + " / " + state.items.length;
    var time = document.createElement("p");
    time.className = "meta";
    time.textContent = "用时 " + elapsedText() + "，已记入练习分析。";
    var jump = document.createElement("button");
    jump.type = "button";
    jump.className = "ghost";
    jump.textContent = "查看分析";
    jump.addEventListener("click", function () {
      document.querySelector("#analysis").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    result.replaceChildren(score, time, jump);
    result.classList.remove("hidden");
    timer.textContent = "用时 " + elapsedText();
  }

  function start() {
    state.items = practice.generateSet(state.topicId, state.count);
    state.startedAt = Date.now();
    render();
  }

  function onKeydown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    var inputs = Array.prototype.slice.call(list.querySelectorAll("input"));
    var next = inputs[inputs.indexOf(event.target) + 1];
    if (next) next.focus();
    else check();
  }

  function pressKey(key) {
    var input = state.active;
    if (!input || input.readOnly) {
      input = list.querySelector("input:not([readonly])");
      state.active = input;
    }
    if (!input) return;
    input.focus();
    if (key === "del") {
      input.value = input.value.slice(0, -1);
      return;
    }
    if (key === "next") {
      var inputs = Array.prototype.slice.call(list.querySelectorAll("input:not([readonly])"));
      var next = inputs[inputs.indexOf(input) + 1];
      if (next) next.focus();
      else check();
      return;
    }
    if (input.value.length >= 4) return;
    input.value += key;
  }

  renderAnalysis();
  clearBtn.addEventListener("click", function () {
    if (!stats.load().length) return;
    if (!window.confirm("清空这台浏览器上的练习记录？")) return;
    stats.clear();
    renderAnalysis();
  });
  startBtn.addEventListener("click", start);
  checkBtn.addEventListener("click", check);
  againBtn.addEventListener("click", start);
  printBtn.addEventListener("click", function () { window.print(); });
  keypad.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    pressKey(button.dataset.key);
  });
})();
