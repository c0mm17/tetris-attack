// Deep randomized fidelity checker: many seeds, Tetris Attack invariants.
// Guards against crashes, board corruption, unresolved matches, and
// non-determinism across the whole game lifecycle.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../game-core.js';

const COLS = 6;
const ROWS = 12;

function runSeed(seed, maxSteps) {
  const grid = core.createBoard(COLS, ROWS);
  const rng = core.createRng(seed);
  let score = 0;
  let steps = 0;
  while (!core.isTopOut(grid) && steps < maxSteps) {
    steps++;
    if (steps % 3 === 0) {
      const colors = Array.from({ length: COLS }, () => Math.floor(rng() * 5));
      core.insertTopRow(grid, colors);
    }
    const x = Math.floor(rng() * (COLS - 1));
    const y = Math.floor(rng() * ROWS);
    if (core.swapPair(grid, x, y)) {
      const r = core.resolveAll(grid);
      score += r.totalCleared * (1 + r.chains);
    }
    // invariants every step:
    assert.equal(grid.length, ROWS, 'row count stable');
    for (const row of grid) assert.equal(row.length, COLS, 'col count stable');
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const v = grid[y][x];
        assert.ok(v === null || (Number.isInteger(v) && v >= 0 && v < 5), 'valid cell value');
      }
  }
  assert.ok(steps <= maxSteps, 'terminated by top-out or step budget');
  return { steps, score };
}

test('deep: no unresolved matches survive resolveAll', () => {
  const grid = core.createBoard(COLS, ROWS);
  // scatter random blocks then resolve; assert zero matches remain
  const rng = core.createRng(99);
  for (let y = 4; y < 12; y++)
    for (let x = 0; x < COLS; x++)
      core.setBlock(grid, x, y, Math.floor(rng() * 5));
  core.resolveAll(grid);
  assert.equal(core.findMatches(grid).length, 0, 'fully resolved board has no horizontal 3-runs');
});

test('deep: 50 seeds run cleanly and accumulate score', () => {
  const seeds = Array.from({ length: 50 }, (_, i) => i * 17 + 3);
  let totalScore = 0;
  for (const s of seeds) {
    const { steps, score } = runSeed(s, 2500);
    if (score > 0) totalScore += score;
    assert.ok(steps >= 1, `seed ${s} progressed`);
    assert.ok(score >= 0, `seed ${s} score ${score}`);
  }
  assert.ok(totalScore > 0, 'matches occurred across seeds');
});

test('deep: same seed is fully deterministic end-to-end', () => {
  const a = runSeed(1234, 800);
  const b = runSeed(1234, 800);
  assert.deepEqual(a, b, 'identical trajectory');
});
