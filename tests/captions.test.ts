import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHashtags, platformCaption, youtubeTitle } from "../lib/captions";

test("normalizes, deduplicates, and limits hashtags", () => {
  assert.deepEqual(normalizeHashtags("#Gaming gaming, funny-clips #wow!"), ["#Gaming", "#gaming", "#funnyclips", "#wow"]);
  assert.equal(normalizeHashtags(Array.from({ length: 40 }, (_, index) => `tag${index}`)).length, 30);
});

test("builds platform captions", () => {
  assert.equal(platformCaption("youtube", "A good clip", ["gaming", "#shorts"]), "A good clip\n\n#gaming #shorts");
});

test("uses the first caption line as a YouTube title", () => {
  assert.equal(youtubeTitle("First line\nSecond line"), "First line");
  assert.equal(youtubeTitle("x".repeat(120)).length, 100);
});
