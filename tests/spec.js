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

test('swap refuses out-of-bounds; empty cursor cell cannot swap', () => {
  const g = board();
  core.setBlock(g, 0, 0, 0);
  assert.equal(core.swapHorizontal(g, 5, 0, 1), false, 'out of bounds right');
  assert.equal(core.swapHorizontal(g, 0, 0, -1), false, 'out of bounds left');
  // cursor cell itself must hold a block: swap with empty cursor fails
  const h = board();
  core.setBlock(h, 1, 0, 1);
  assert.equal(core.swapHorizontal(h, 0, 0, 1), false, 'empty cursor cell');
  assert.equal(core.getBlock(h, 1, 0), 1, 'no change');
});

test('swap into an empty space: block moves, blocks above fall', () => {
  const g = board();
  // column 3: block color 0 at y=5, block color 1 above it at y=4
  core.setBlock(g, 3, 5, 0);
  core.setBlock(g, 3, 4, 1);
  // right neighbor (4,5) is empty
  assert.equal(core.swapHorizontal(g, 3, 5, 1), true, 'swap into empty succeeds');
  assert.equal(core.getBlock(g, 4, 5), 0, 'block moved into empty space');
  assert.equal(core.getBlock(g, 3, 5), 1, 'block above fell into the gap');
  assert.equal(core.getBlock(g, 3, 4), null, 'vacated column compacted');
});

test('swap is horizontal-only (no vertical swap helper, y ignored)', () => {
  const g = board();
  core.setBlock(g, 2, 3, 0);
  core.setBlock(g, 2, 4, 1);
  // dir targets x+1 — the block below (y+1) must not move vertically
  assert.equal(core.swapHorizontal(g, 2, 3, 1), true, 'moves into empty neighbor');
  assert.equal(core.getBlock(g, 3, 3), 0, 'block moved horizontally');
  assert.equal(core.getBlock(g, 2, 3), null, 'vacated cell emptied');
  assert.equal(core.getBlock(g, 2, 4), 1, 'vertical neighbor untouched');
});

test('swapPair swaps two colours', () => {
  const g = board();
  core.setBlock(g, 2, 3, 0);
  core.setBlock(g, 3, 3, 1);
  assert.equal(core.swapPair(g, 2, 3), true);
  assert.equal(core.getBlock(g, 2, 3), 1);
  assert.equal(core.getBlock(g, 3, 3), 0);
});

test('swapPair colour with space: colour settles, blocks fall', () => {
  const g = board();
  core.setBlock(g, 2, 3, 0); // colour at left cell
  core.setBlock(g, 2, 2, 1); // block above the left cell
  // right cell (3,3) is empty
  assert.equal(core.swapPair(g, 2, 3), true);
  assert.equal(core.getBlock(g, 3, 11), 0, 'colour falls to the bottom of its new column');
  assert.equal(core.getBlock(g, 2, 11), 1, 'above block falls to the bottom of the vacated column');
  assert.equal(core.getBlock(g, 2, 3), null);
  assert.equal(core.getBlock(g, 2, 2), null);
  assert.equal(core.getBlock(g, 3, 3), null);
});

test('swapPair space with colour: colour moves left and settles', () => {
  const g = board();
  core.setBlock(g, 3, 3, 0); // colour at right cell only
  assert.equal(core.swapPair(g, 2, 3), true);
  assert.equal(core.getBlock(g, 2, 11), 0, 'colour moved left and fell to bottom');
  assert.equal(core.getBlock(g, 2, 3), null);
  assert.equal(core.getBlock(g, 3, 3), null);
});

test('swapPair no-ops: both empty / identical colours / out of bounds', () => {
  const g = board();
  assert.equal(core.swapPair(g, 0, 0), false, 'both cells empty');
  const h = board();
  core.setBlock(h, 0, 0, 2);
  core.setBlock(h, 1, 0, 2);
  assert.equal(core.swapPair(h, 0, 0), false, 'identical colours');
  assert.equal(core.swapPair(g, 5, 0), false, 'pair out of bounds');
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

test('findMatches detects vertical runs of 3+', () => {
  const g = board();
  for (let y = 3; y <= 5; y++) core.setBlock(g, 3, y, 2);
  const m = core.findMatches(g);
  assert.equal(m.length, 3, 'vertical run clears exactly three cells');
  assert.ok(m.every((c) => c.x === 3));
  assert.deepEqual(m.map((c) => c.y).sort(), [3, 4, 5]);
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

test('insertBottomRow adds a row at the bottom; pile moves up', () => {
  const g = board();
  core.setBlock(g, 0, 11, 0); // one block at the bottom of column 0
  const ok = core.insertBottomRow(g, [1, 2, 3, 4, 0, 1]);
  assert.equal(ok, true, 'row placed');
  assert.equal(core.getBlock(g, 0, 11), 1, 'new block sits at the bottom');
  assert.equal(core.getBlock(g, 0, 10), 0, 'old block moved up one row');
  assert.equal(core.getBlock(g, 1, 11), 2);
  assert.equal(core.getBlock(g, 2, 11), 3);
});

test('insertBottomRow rejects full column (top-out)', () => {
  const g = board();
  for (let y = 0; y < 12; y++) core.setBlock(g, 3, y, 0);
  const ok = core.insertBottomRow(g, [0, 0, 0, 0, 0, 0]);
  assert.equal(ok, false, 'full column cannot accept another row');
  assert.equal(core.isTopOut(g), true);
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
      core.insertBottomRow(g, colors);
    }
    const x = Math.floor(rng() * (COLS - 1));
    const y = Math.floor(rng() * ROWS);
    if (core.swapPair(g, x, y)) {
      const r = core.resolveAll(g);
      score += r.totalCleared * (1 + r.chains);
    }
  }
  assert.ok(steps < MAX, `expected top-out within ${MAX} steps, ran ${steps}`);
  assert.ok(score > 0, `expected some clears, score=${score}`);
});
