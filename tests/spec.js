// Tetris Attack fidelity test suite — runs against game-core.js in Node.
// Verifies the rules: 6x12 board, horizontal-only swapping, horizontal 3+ runs
// clear, cascade/gravity chains, top-out game over, deterministic PRNG.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../game-core.js';

const COLS = 6;
const ROWS = 12;

function board() {
  return core.createBoard(COLS, ROWS);
}

test('createBoard dimensions and empty state', () => {
  const g = board();
  assert.equal(g.length, ROWS, 'rows');
  assert.equal(g[0].length, COLS, 'cols');
  assert.ok(g.flat().every((c) => c === null), 'all cells empty');
});

test('setBlock/getBlock roundtrip', () => {
  const g = board();
  core.setBlock(g, 2, 3, 0);
  assert.equal(core.getBlock(g, 2, 3), 0);
  assert.equal(core.getBlock(g, 4, 3), null);
});

test('swapHorizontal swaps adjacent occupied cells', () => {
  const g = board();
  core.setBlock(g, 2, 3, 0);
  core.setBlock(g, 3, 3, 1);
  assert.equal(core.swapHorizontal(g, 2, 3, 1), true, 'swap succeeds');
  assert.equal(core.getBlock(g, 2, 3), 1, 'left cell got right block');
  assert.equal(core.getBlock(g, 3, 3), 0, 'right cell got left block');
  // reverse
  assert.equal(core.swapHorizontal(g, 3, 3, -1), true);
  assert.equal(core.getBlock(g, 2, 3), 0);
  assert.equal(core.getBlock(g, 3, 3), 1);
});

test('swap refuses empty neighbor and out-of-bounds', () => {
  const g = board();
  core.setBlock(g, 0, 0, 0);
  assert.equal(core.swapHorizontal(g, 0, 0, 1), false, 'right neighbor empty');
  assert.equal(core.getBlock(g, 0, 0), 0, 'no change');
  assert.equal(core.swapHorizontal(g, 0, 0, -1), false, 'out of bounds left');
  assert.equal(core.swapHorizontal(g, 5, 0, 1), false, 'out of bounds right');
});

test('swap is horizontal-only (no vertical swap helper, y ignored)', () => {
  const g = board();
  core.setBlock(g, 2, 3, 0);
  core.setBlock(g, 2, 4, 1);
  // dir targets x+1, not y — block below must not be involved
  assert.equal(core.swapHorizontal(g, 2, 3, 1), false, 'right neighbor empty');
  assert.equal(core.getBlock(g, 2, 3), 0);
  assert.equal(core.getBlock(g, 2, 4), 1);
});

test('findMatches detects horizontal runs of 3+', () => {
  const g = board();
  // row 5: R R R G B Y  -> run of 3 at x=0..2
  core.setBlock(g, 0, 5, 0);
  core.setBlock(g, 1, 5, 0);
  core.setBlock(g, 2, 5, 0);
  core.setBlock(g, 3, 5, 3);
  core.setBlock(g, 4, 5, 2);
  core.setBlock(g, 5, 5, 4);
  const m = core.findMatches(g);
  assert.equal(m.length, 3, 'exactly the 3-run cells');
  const xs = m.map((c) => c.x).sort();
  assert.deepEqual(xs, [0, 1, 2]);
  assert.ok(m.every((c) => c.y === 5));
});

test('findMatches handles run of 5 as one run', () => {
  const g = board();
  for (let x = 0; x < 5; x++) core.setBlock(g, x, 6, 1);
  const m = core.findMatches(g);
  assert.equal(m.length, 5, 'run of 5 clears all five cells');
  assert.ok(m.every((c) => c.x <= 4 && c.y === 6));
});

test('findMatches ignores vertical stacks', () => {
  const g = board();
  for (let y = 3; y <= 5; y++) core.setBlock(g, 3, y, 2);
  const m = core.findMatches(g);
  assert.equal(m.length, 0, 'vertical column is not cleared');
});

test('clearCells empties cells', () => {
  const g = board();
  for (let x = 0; x < 3; x++) core.setBlock(g, x, 1, 0);
  const n = core.clearCells(g, core.findMatches(g));
  assert.equal(n, 3);
  assert.ok(core.getBlock(g, 0, 1) === null);
  assert.ok(core.getBlock(g, 1, 1) === null);
  assert.ok(core.getBlock(g, 2, 1) === null);
});

test('gravity compacts columns downward', () => {
  const g = board();
  core.setBlock(g, 2, 1, 0);
  assert.equal(core.gravity(g), true, 'block moved');
  assert.equal(core.getBlock(g, 2, 11), 0, 'fell to bottom');
  assert.equal(core.getBlock(g, 2, 1), null);
});

test('resolveAll clears a match and counts chains', () => {
  const g = board();
  for (let x = 0; x < 3; x++) core.setBlock(g, x, 5, 0);
  const r = core.resolveAll(g);
  assert.equal(r.totalCleared, 3, 'three blocks cleared');
  assert.equal(r.chains, 1, 'one match iteration');
  assert.ok(g[5][0] === null && g[5][1] === null && g[5][2] === null, 'cleared row empty');
});

test('cascade: falling blocks create a chain (combo)', () => {
  const g = board();
  // Row 11: A A A B C D  -> clears A at x=0..2
  core.setBlock(g, 0, 11, 0);
  core.setBlock(g, 1, 11, 0);
  core.setBlock(g, 2, 11, 0);
  core.setBlock(g, 3, 11, 1);
  core.setBlock(g, 4, 11, 2);
  core.setBlock(g, 5, 11, 3);
  // Staggered G blocks above columns 0..2 on DIFFERENT rows (no pre-match):
  // they only line up into G-G-G at row 11 after gravity, creating chain 2.
  core.setBlock(g, 0, 10, 1);
  core.setBlock(g, 1, 9, 1);
  core.setBlock(g, 2, 8, 1);
  const r = core.resolveAll(g);
  assert.ok(r.chains >= 2, `expected cascade, got chains=${r.chains}`);
  assert.ok(r.totalCleared >= 6, 'cleared both runs');
});

test('insertTopRow stacks new blocks atop column piles', () => {
  const g = board();
  core.setBlock(g, 0, 11, 0); // col 0 has height 1 (pile at bottom)
  const ok = core.insertTopRow(g, [1, 2, 3, 4, 0, 1]);
  assert.equal(ok, true, 'all six blocks placed');
  assert.equal(core.getBlock(g, 0, 10), 1, 'new block sits atop the pile');
  assert.equal(core.getBlock(g, 0, 11), 0, 'old bottom block stays');
  assert.equal(core.getBlock(g, 1, 11), 2, 'empty column receives block at bottom');
  assert.equal(core.getBlock(g, 1, 10), null);
});

test('insertTopRow rejects full column (top-out)', () => {
  const g = board();
  for (let y = 0; y < 12; y++) core.setBlock(g, 3, y, 0);
  const ok = core.insertTopRow(g, [0, 0, 0, 0, 0, 0]);
  assert.equal(ok, false, 'full column rejects insertion');
  assert.equal(core.isTopOut(g), true, 'full column means top-out');
});

test('isTopOut triggers when top row occupied', () => {
  const g = board();
  assert.equal(core.isTopOut(g), false);
  core.setBlock(g, 0, 0, 0);
  assert.equal(core.isTopOut(g), true);
});

test('createRng is deterministic', () => {
  const a = core.createRng(42);
  const b = core.createRng(42);
  const seqA = Array.from({ length: 100 }, () => a());
  const seqB = Array.from({ length: 100 }, () => b());
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every((v) => v >= 0 && v < 1));
  const c = core.createRng(43);
  assert.notDeepEqual(Array.from({ length: 100 }, () => c()), seqA);
});

test('stress: random play eventually tops out, score accumulates', () => {
  const g = board();
  const rng = core.createRng(7);
  let score = 0;
  let steps = 0;
  const MAX = 3000;
  while (!core.isTopOut(g) && steps < MAX) {
    steps++;
    if (steps % 4 === 0) {
      const colors = Array.from({ length: COLS }, () => Math.floor(rng() * 5));
      core.insertTopRow(g, colors);
    }
    const x = Math.floor(rng() * COLS);
    const y = Math.floor(rng() * ROWS);
    const dir = rng() < 0.5 ? 1 : -1;
    if (core.swapHorizontal(g, x, y, dir)) {
      const r = core.resolveAll(g);
      score += r.totalCleared * (1 + r.chains);
    }
  }
  assert.ok(steps < MAX, `expected top-out within ${MAX} steps, ran ${steps}`);
  assert.ok(score > 0, `expected some clears, score=${score}`);
});
