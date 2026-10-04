"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const store = {};
const context = {
  console,
  localStorage: {
    getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; }
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/stats.js", "utf8"), context);
const Stats = context.Stats;

assert.deepStrictEqual(Stats.summarize([]).sessions, 0);
assert.strictEqual(Stats.summarize([]).accuracy, null);

Stats.record({
  at: 1000,
  topicId: "mixall",
  seconds: 80,
  byKind: {
    mul: { correct: 3, wrong: 1, blank: 0 },
    div: { correct: 1, wrong: 0, blank: 1 }
  }
});
Stats.record({
  at: 2000,
  topicId: "mul",
  seconds: 40,
  byKind: { mul: { correct: 8, wrong: 2, blank: 0 } }
});

const summary = Stats.summarize(Stats.load());
assert.strictEqual(summary.sessions, 2);
assert.strictEqual(summary.correct, 12);
assert.strictEqual(summary.wrong, 3);
assert.strictEqual(summary.blank, 1);
assert.strictEqual(summary.total, 16);
assert.strictEqual(summary.accuracy, 75);
assert.strictEqual(summary.secondsPerQuestion, 7.5);
assert.strictEqual(summary.byKind.mul.accuracy, 79);
assert.strictEqual(summary.byKind.div.total, 2);
assert.deepStrictEqual(Array.from(summary.recent), [67, 80]);
assert.strictEqual(summary.weakest.kind, "mul");

Stats.record({ topicId: "x", seconds: 1, byKind: {} });
assert.strictEqual(Stats.load().length, 2);

for (let i = 0; i < 50; i++) {
  Stats.record({ topicId: "mul", seconds: 1, byKind: { mul: { correct: 1, wrong: 0, blank: 0 } } });
}
assert.strictEqual(Stats.load().length, 40);

Stats.clear();
assert.strictEqual(Stats.load().length, 0);

console.log("stats tests passed");
