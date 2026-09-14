# Tetris Attack (ASCII)

A browser-playable homage to **Tetris Attack** (a.k.a. Panel de Pon): a 6x12
field of colored panels rendered as simple colored squares, where you swap two
side-by-side cells to line up 3+ same-color blocks in a row or column.

## Play it

Once deployed on GitHub Pages, play at:

    https://c0mm17.github.io/tetris-attack/

Or locally:

    python3 -m http.server 8090 --directory .   # then open http://localhost:8090/index.html

> Note: opening `index.html` directly via `file://` won't run — Chromium blocks
> ESM imports on the file scheme. Serve over http(s).

## Controls

| Key | Action |
|-----|--------|
| Arrow keys | Move the two-cell cursor |
| Z / X | Swap the two cells under the cursor (colour &harr; colour or colour &harr; space) |
| P | Pause / resume |
| R | Restart |
| Sound button | Toggle Happy Hardcore music (starts on your first key press) |

## Rules (faithful to Tetris Attack)

- **Pair cursor, horizontal swap** — the cursor surrounds two side-by-side
  cells; pressing swap exchanges their contents (colour&harr;colour or
  colour&harr;space). Any cell that becomes empty causes the affected columns
  to compact fully — floating blocks fall immediately (settling onto the pile
  or the bottom of the column).
- **Matches clear horizontally OR vertically**: any contiguous run of 3+
  same-color blocks in a single row OR a single column clears.
- After a clear, blocks above fall down; the fall can create **new matches**,
  which clear again — each step is a **chain/combo**, multiplying the score.
- The play field is made of **simple colored squares**. New rows slide in at
  the **bottom** and the whole field scrolls UP smoothly as they enter — every
  existing cell rises with the incoming row rather than jumping one row. The
  incoming row only becomes active (matching + selectable) once fully in the
  play area, and the cursor cannot move onto it before then (it is moved off
  the entering row automatically if it was sitting there). Rows speed up as
  your score climbs (~4 s down to ~1.2 s). If a column's pile reaches the top
  row, it's **game over** (top-out).

## Structure

- `index.html` — the playable page (simple-shape board, HUD, controls, game loop).
- `game-core.js` — pure logic module (ESM): board, swap, match detection,
  cascade/gravity, row insertion, top-out, seeded RNG.
- `tests/` — Node test suites (`node --test tests/spec.js tests/smoke.js tests/deepcheck.js`):
  - `spec.js` — Tetris Attack fidelity unit tests.
  - `smoke.js` — page wiring / static checks.
  - `deepcheck.js` — randomized invariants across seeds.
- `scripts/iterate.sh` — 8-hour automated iteration loop (15-min cycles) that
  re-runs the suites and appends results to `iteration-log.txt`.

## Audio

Music is synthesized live with the Web Audio API as a **relaxing retro
chiptune** at 96 BPM: a soft sine kick on the beat, a gentle sine bass on the
eighths, and a triangle-wave music-box melody, plus game SFX (swap blip,
ascending clear stabs, combo rises with chain level, descending game-over
tail). No audio files; everything is generated in the browser.
