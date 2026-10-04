"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const context = { globalThis: {}, console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("js/practice.js", "utf8"), context);
const Practice = context.Practice;

function evalPrompt(prompt, fields) {
  const source = prompt
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");
  if (fields.length === 1) {
    assert.strictEqual(Function(`"use strict"; return (${source});`)(), fields[0].answer);
    return;
  }
  const [dividend, divisor] = source.split("/").map((part) => Number(part.trim()));
  const quotient = fields[0].answer;
  const remainder = fields[1].answer;
  assert.strictEqual(dividend, quotient * divisor + remainder);
  assert.ok(remainder > 0 && remainder < divisor);
  assert.ok(quotient >= 1 && quotient <= 9);
  assert.ok(divisor >= 2 && divisor <= 9);
}

function sample(topic, count) {
  for (let round = 0; round < 30; round++) {
    const items = Practice.generateSet(topic, count);
    assert.strictEqual(items.length, count);
    const prompts = new Set(items.map((item) => item.prompt));
    assert.strictEqual(prompts.size, count);
    items.forEach((item) => {
      assert.ok(Practice.SKILL_IDS.includes(item.kind));
      if (topic !== "mixall") assert.strictEqual(item.kind, topic);
      evalPrompt(item.prompt, item.fields);
      item.fields.forEach((field) => {
        assert.ok(Number.isInteger(field.answer));
        assert.ok(field.answer >= 0);
        assert.ok(field.answer <= 100);
      });
    });
  }
}

["mixall", "add100", "sub100", "mix100", "mul", "div", "rem", "mulmix"].forEach((topic) => {
  sample(topic, 20);
});

assert.strictEqual(Practice.parseAnswer(" １２ "), 12);
assert.strictEqual(Practice.parseAnswer("3.5"), null);
assert.strictEqual(Practice.parseAnswer("-1"), null);
assert.strictEqual(Practice.isCorrect({ fields: [{ answer: 7 }, { answer: 1 }] }, ["7", "1"]), true);
assert.strictEqual(Practice.isCorrect({ fields: [{ answer: 7 }] }, [""]), false);

console.log("practice tests passed");
