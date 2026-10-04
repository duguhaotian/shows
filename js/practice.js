(function (root) {
  "use strict";

  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pick(list) {
    return list[randInt(0, list.length - 1)];
  }

  var TOPICS = [
    { id: "mixall", name: "综合练习", hint: "二年级各题型混在一起" },
    { id: "add100", name: "100以内加法", hint: "进位和不进位" },
    { id: "sub100", name: "100以内减法", hint: "退位和不退位" },
    { id: "mix100", name: "加减混合", hint: "两步，得数不超过 100" },
    { id: "mul", name: "表内乘法", hint: "2 到 9 的乘法口诀" },
    { id: "div", name: "表内除法", hint: "用口诀直接求商" },
    { id: "rem", name: "有余数的除法", hint: "商是一位数" },
    { id: "mulmix", name: "乘加乘减", hint: "先乘，再加或减" }
  ];

  function problem(prompt, fields) {
    return { prompt: prompt, fields: fields };
  }

  function single(answer) {
    return [{ answer: answer }];
  }

  function genAdd100() {
    var wantCarry = Math.random() < 0.6;
    var i, a, b, carry;
    for (i = 0; i < 80; i++) {
      a = randInt(8, 89);
      b = randInt(8, 100 - a);
      if (a + b < 12) continue;
      carry = a % 10 + (b % 10) >= 10;
      if (carry !== wantCarry) continue;
      return problem(a + " + " + b, single(a + b));
    }
    return problem("27 + 35", single(62));
  }

  function genSub100() {
    var wantBorrow = Math.random() < 0.6;
    var i, a, b, borrow;
    for (i = 0; i < 80; i++) {
      a = randInt(20, 100);
      b = randInt(8, a - 1);
      borrow = a % 10 < b % 10;
      if (borrow !== wantBorrow) continue;
      return problem(a + " − " + b, single(a - b));
    }
    return problem("80 − 27", single(53));
  }

  function genMix100() {
    var attempt, value, tokens, step, plus, room, b, ok;
    for (attempt = 0; attempt < 100; attempt++) {
      value = randInt(20, 80);
      tokens = [String(value)];
      ok = true;
      for (step = 0; step < 2; step++) {
        plus = Math.random() < 0.5;
        if (plus) {
          room = 100 - value;
          if (room < 6) {
            ok = false;
            break;
          }
          b = randInt(5, Math.min(35, room));
          value += b;
          tokens.push("+", String(b));
        } else {
          if (value < 10) {
            ok = false;
            break;
          }
          b = randInt(5, Math.min(35, value));
          value -= b;
          tokens.push("−", String(b));
        }
      }
      if (!ok || value < 0 || value > 100) continue;
      return problem(tokens.join(" "), single(value));
    }
    return problem("46 + 17 − 8", single(55));
  }

  function genMul() {
    var a = Math.random() < 0.08 ? 1 : randInt(2, 9);
    var b = randInt(2, 9);
    if (Math.random() < 0.5) {
      var swap = a;
      a = b;
      b = swap;
    }
    return problem(a + " × " + b, single(a * b));
  }

  function genDiv() {
    var quotient = randInt(1, 9);
    var divisor = randInt(2, 9);
    return problem(quotient * divisor + " ÷ " + divisor, single(quotient));
  }

  function genRem() {
    var divisor = randInt(2, 9);
    var quotient = randInt(1, 9);
    var remainder = randInt(1, divisor - 1);
    var dividend = quotient * divisor + remainder;
    return problem(dividend + " ÷ " + divisor, [
      { label: "商", answer: quotient },
      { label: "余", answer: remainder }
    ]);
  }

  function genMulMix() {
    var a = randInt(2, 9);
    var b = randInt(2, 9);
    var prod = a * b;
    var c;
    if (Math.random() < 0.5) {
      c = randInt(1, Math.min(18, 100 - prod));
      return problem(a + " × " + b + " + " + c, single(prod + c));
    }
    c = randInt(1, Math.min(18, prod - 1));
    return problem(a + " × " + b + " − " + c, single(prod - c));
  }

  var GENERATORS = {
    add100: genAdd100,
    sub100: genSub100,
    mix100: genMix100,
    mul: genMul,
    div: genDiv,
    rem: genRem,
    mulmix: genMulMix
  };

  var MIX_IDS = ["add100", "sub100", "mix100", "mul", "div", "rem", "mulmix"];

  function makeOne(topicId) {
    if (topicId === "mixall") return GENERATORS[pick(MIX_IDS)]();
    var gen = GENERATORS[topicId];
    if (!gen) throw new Error("未知题型：" + topicId);
    return gen();
  }

  function generateSet(topicId, count) {
    var n = count | 0;
    if (n < 1) n = 1;
    if (n > 40) n = 40;
    var seen = {};
    var items = [];
    var guard = 0;
    while (items.length < n && guard < n * 50) {
      guard += 1;
      var item = makeOne(topicId);
      if (seen[item.prompt]) continue;
      seen[item.prompt] = true;
      items.push(item);
    }
    return items;
  }

  function normalizeDigits(raw) {
    return String(raw == null ? "" : raw)
      .trim()
      .replace(/[０-９]/g, function (ch) {
        return String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30);
      });
  }

  function parseAnswer(raw) {
    var text = normalizeDigits(raw);
    if (!/^\d+$/.test(text)) return null;
    return Number(text);
  }

  function isCorrect(item, rawAnswers) {
    return item.fields.every(function (field, index) {
      var given = rawAnswers && rawAnswers.length > index ? rawAnswers[index] : "";
      return parseAnswer(given) === field.answer;
    });
  }

  root.Practice = {
    TOPICS: TOPICS,
    generateSet: generateSet,
    parseAnswer: parseAnswer,
    isCorrect: isCorrect
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
