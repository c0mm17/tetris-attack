// game-core.js — Pure logic for Tetris Attack (a.k.a. Panel de Pon).
// ESM module, NO DOM / no browser-only APIs. Node-importable:
//   import * as core from './game-core.js'
//
// Board model: grid is a rows x cols 2D array. grid[y][x] where
//   x = column (0..cols-1), y = row (0..rows-1). y=0 is the TOP row.
// Each cell is null (empty) or a color index (integer 0..4).

export const COLORS = ['R', 'G', 'B', 'Y', 'P'];

// Create an empty rows x cols board (all null).
export function createBoard(cols = 6, rows = 12) {
  const grid = [];
  for (let y = 0; y < rows; y++) {
    grid.push(new Array(cols).fill(null));
  }
  return grid;
}

// Place a color at (x, y). No-op if out of bounds.
export function setBlock(grid, x, y, color) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return;
  grid[y][x] = color;
}

// Read the color at (x, y), or null if empty / out of bounds.
export function getBlock(grid, x, y) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return null;
  return grid[y][x];
}

// Swap the block at (x, y) with the block at (x+dir, y) — HORIZONTAL only.
// dir is +1 (right) or -1 (left). Both cells must be in bounds AND both
// occupied. Returns true on success, false (no change) otherwise.
export function swapHorizontal(grid, x, y, dir) {
  if (y < 0 || y >= grid.length) return false;
  const nx = x + dir;
  if (x < 0 || x >= grid[y].length) return false;
  if (nx < 0 || nx >= grid[y].length) return false;
  const a = grid[y][x];
  const b = grid[y][nx];
  if (a === null) return false; // cursor cell must hold a block
  if (b === null) {
    // Swap into an empty space: the block moves into it, and blocks above
    // the vacated cell fall down to fill the gap.
    grid[y][nx] = a;
    grid[y][x] = null;
    compactAbove(grid, x, y);
    return true;
  }
  grid[y][x] = b;
  grid[y][nx] = a;
  return true;
}

// Blocks above the vacated cell (rows 0..y in column x) fall down so the gap
// at row y is filled, preserving order. Rows below y are untouched.
function compactAbove(grid, x, y) {
  const seq = [];
  for (let ry = 0; ry <= y; ry++) {
    const v = grid[ry][x];
    if (v !== null) seq.push(v);
  }
  for (let ry = 0; ry <= y; ry++) grid[ry][x] = null;
  let cnt = seq.length;
  for (let ry = y; cnt > 0; ry--) {
    grid[ry][x] = seq[cnt - 1];
    cnt--;
  }
}

// Find every cell belonging to a horizontal contiguous run of >=3 same-color
// blocks in a single row. Vertical matches are NOT included.
// Returns an array of {x, y}.
export function findMatches(grid) {
  const cells = [];
  const seen = new Set();
  for (let y = 0; y < grid.length; y++) {
    let x = 0;
    while (x < grid[y].length) {
      const c = grid[y][x];
      if (c === null) { x++; continue; }
      let x2 = x;
      while (x2 + 1 < grid[y].length && grid[y][x2 + 1] === c) x2++;
      if (x2 - x + 1 >= 3) {
        for (let i = x; i <= x2; i++) {
          const key = y * 1000 + i;
          if (!seen.has(key)) { seen.add(key); cells.push({ x: i, y }); }
        }
      }
      x = x2 + 1;
    }
  }
  // Vertical runs: contiguous same-color stack (>=3) in a single column.
  const cols = grid.length > 0 ? grid[0].length : 0;
  for (let x = 0; x < cols; x++) {
    let y = 0;
    while (y < grid.length) {
      const c = grid[y][x];
      if (c === null) { y++; continue; }
      let y2 = y;
      while (y2 + 1 < grid.length && grid[y2 + 1][x] === c) y2++;
      if (y2 - y + 1 >= 3) {
        for (let i = y; i <= y2; i++) {
          const key = i * 1000 + x;
          if (!seen.has(key)) { seen.add(key); cells.push({ x, y: i }); }
        }
      }
      y = y2 + 1;
    }
  }
  return cells;
}

// Set the given cells to null. Returns the number of cells actually cleared.
export function clearCells(grid, cells) {
  let n = 0;
  for (const { x, y } of cells) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length && grid[y][x] !== null) {
      grid[y][x] = null;
      n++;
    }
  }
  return n;
}

// Gravity: for each column, compact blocks downward to the bottom, preserving
// relative column order. Returns true if any block moved.
export function gravity(grid) {
  let moved = false;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  for (let x = 0; x < cols; x++) {
    // Collect blocks from bottom to top.
    const stack = [];
    for (let y = rows - 1; y >= 0; y--) {
      if (grid[y][x] !== null) stack.push(grid[y][x]);
    }
    // Rewrite the column from the bottom up.
    for (let y = rows - 1; y >= 0; y--) {
      const idx = rows - 1 - y;
      const val = idx < stack.length ? stack[idx] : null;
      if (grid[y][x] !== val) moved = true;
      grid[y][x] = val;
    }
  }
  return moved;
}

// Resolve the whole cascade: repeatedly find matches, clear them, apply
// gravity, until no matches remain.
// Returns { chains, totalCleared } where chains = number of cascade
// iterations that produced a match, totalCleared = total blocks cleared.
export function resolveAll(grid) {
  let chains = 0;
  let totalCleared = 0;
  for (;;) {
    const matches = findMatches(grid);
    if (matches.length === 0) break;
    totalCleared += clearCells(grid, matches);
    chains++;
    gravity(grid);
  }
  return { chains, totalCleared };
}

// Insert a new row of blocks. The board is column-compacted: in each column
// the blocks form a contiguous pile from the BOTTOM up, and the column height
// is the count of occupied cells in that column. For each column x, the new
// block of color colors[x] lands ON TOP of that column's existing pile, at
// row index (rows-1 - height). Blocks are NOT shifted downward; the pile
// simply grows. If any column is already full (height == rows) it cannot
// accept a block: return false and place nothing (the game treats this as a
// top-out). Returns true only if all blocks were successfully placed.
export function insertTopRow(grid, colors) {
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  // Measure each column's height (count of occupied cells).
  const heights = new Array(cols).fill(0);
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (grid[y][x] !== null) heights[x]++;
    }
  }
  // If any column is full, it cannot accept a new block -> top-out.
  for (let x = 0; x < cols; x++) {
    if (heights[x] >= rows) return false;
  }
  // Place each block on top of its column's pile.
  for (let x = 0; x < cols; x++) {
    const row = (rows - 1) - heights[x];
    grid[row][x] = (x < colors.length ? colors[x] : null);
  }
  return true;
}

// True if any cell in the top row (row 0) is occupied (top-out / game over).
export function isTopOut(grid) {
  if (grid.length === 0) return false;
  return grid[0].some(c => c !== null);
}

// Deterministic PRNG (mulberry32). Same seed => identical sequence.
// Returns a function () => float in [0, 1).
export function createRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
