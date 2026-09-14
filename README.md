# Tetris Attack (ASCII)

An ASCII-art, browser-playable homage to **Tetris Attack** (a.k.a. Panel de
Pon): a 6x12 field of colored panels where you swap adjacent blocks sideways to
line up 3+ same-color blocks in a row or column.

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
| Arrow keys | Move the cursor |
| Z | Swap cursor block with the LEFT neighbor |
| X | Swap cursor block with the RIGHT neighbor |
| P | Pause / resume |
| R | Restart |
| Sound button | Toggle Happy Hardcore music (starts on your first key press) |

## Rules (faithful to Tetris Attack)

- **Horizontal swaps only** — you swap the block under the cursor with the
  block immediately left or right of it. No vertical swaps.
- **Matches clear horizontally OR vertically**: any contiguous run of 3+
  same-color blocks in a single row OR a single column clears.
- After a clear, blocks above fall down; the fall can create **new matches**,
  which clear again — each step is a **chain/combo**, multiplying the score.
- A new row of panels falls in every ~2.5 s. If a column's pile reaches the top
  row, it's **game over** (top-out).

## Structure

- `index.html` — the playable page (ASCII board, HUD, controls, game loop).
- `game-core.js` — pure logic module (ESM): board, swap, match detection,
  cascade/gravity, row insertion, top-out, seeded RNG.
- `tests/` — Node test suites (`node --test tests/spec.js tests/smoke.js tests/deepcheck.js`):
  - `spec.js` — Tetris Attack fidelity unit tests.
  - `smoke.js` — page wiring / static checks.
  - `deepcheck.js` — randomized invariants across seeds.
- `scripts/iterate.sh` — 8-hour automated iteration loop (15-min cycles) that
  re-runs the suites and appends results to `iteration-log.txt`.

## Audio

Music is synthesized live with the Web Audio API in **Happy Hardcore** style
at 165 BPM: four-on-the-floor kick, offbeat rave bass stab, closed hi-hats,
bright detuned-saw lead riff with hoover pitch-bend stabs, plus game SFX
(swap blip, ascending clear stabs, combo rises with chain level, descending
game-over tail). No audio files; everything is generated in the browser.
