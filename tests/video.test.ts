import test from "node:test";
import assert from "node:assert/strict";
import { isNineBySixteen } from "../lib/video";

test("recognizes vertical 9:16 dimensions", () => {
  assert.equal(isNineBySixteen(1080, 1920), true);
  assert.equal(isNineBySixteen(720, 1280), true);
  assert.equal(isNineBySixteen(1920, 1080), false);
  assert.equal(isNineBySixteen(1000, 1400), false);
});
