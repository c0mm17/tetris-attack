// Static smoke check for the page and core module (no browser needed).
// Validates index.html wiring and that game-core.js exports the whole API.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../game-core.js';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf-8');

test('game-core exports the full API', () => {
  const fns = [
    'createBoard', 'setBlock', 'getBlock', 'swapHorizontal', 'swapPair',
    'findMatches', 'clearCells', 'gravity', 'resolveAll',
    'insertTopRow', 'insertBottomRow', 'isTopOut', 'createRng',
  ];
  for (const n of fns) {
    assert.equal(typeof core[n], 'function', `${n} is a function`);
  }
  assert.equal(Array.isArray(core.COLORS), true, 'COLORS is an array');
  assert.equal(core.COLORS.length, 5);
});

test('index.html imports game-core.js', () => {
  assert.ok(/game-core\.js/.test(html), 'references game-core.js');
  assert.ok(/<script/i.test(html), 'has a script element');
});

test('page declares Tetris Attack title', () => {
  assert.ok(/Tetris Attack/i.test(html), 'title mentions Tetris Attack');
});

test('keyboard controls wired', () => {
  assert.ok(/Arrow|keydown|addEventListener/i.test(html), 'keydown handling');
  assert.ok(/KeyZ|KeyX|'z'|"z"|'x'|"x"|keyCode/i.test(html), 'swap keys present');
});

test('happy hardcore audio present', () => {
  assert.ok(/AudioContext|webkitAudioContext/i.test(html), 'Web Audio used');
  assert.ok(/kick|bass|hi[- ]?hat|lead|hoover/i.test(html), 'hardcore parts present');
  assert.ok(/165|bpm|BPM/i.test(html), '165 BPM tempo');
});

test('no external CDN dependencies', () => {
  assert.ok(!/https?:\/\/[^ ]+\.(js|css)/.test(html.replace('game-core.js', '')), 'no external assets');
});
