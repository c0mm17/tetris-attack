#!/usr/bin/env bash
# 8-hour iterative fidelity loop for Tetris Attack.
# Every 15 minutes: run unit spec, smoke static checks, and deep randomized
# checks; append timestamped results to iteration-log.txt.
set -u
cd /home/coder/workspace/tetris-attack || exit 1
LOG="${TETRIS_ITER_LOG:-iteration-log.txt}"
CYCLE_MINUTES="${TETRIS_CYCLE_MINUTES:-15}"
echo "=== iteration loop start $(date '+%F %T') (8h window, cycle=${CYCLE_MINUTES}m) ===" >> "$LOG"
START=$(date +%s)
END=$((START + 8 * 3600))
iter=0
while [ "$(date +%s)" -lt "$END" ]; do
  iter=$((iter + 1))
  TS=$(date '+%F %T')
  echo "--- iteration ${iter} @ ${TS} ---" >> "$LOG"
  node --test tests/spec.js >> "$LOG" 2>&1
  SPEC=$?
  node --test tests/smoke.js >> "$LOG" 2>&1
  SMOKE=$?
  node --test tests/deepcheck.js >> "$LOG" 2>&1
  DEEP=$?
  if [ "$SPEC" -eq 0 ] && [ "$SMOKE" -eq 0 ] && [ "$DEEP" -eq 0 ]; then
    echo "RESULT: GREEN (spec=${SPEC} smoke=${SMOKE} deep=${DEEP})" >> "$LOG"
  else
    echo "RESULT: RED (spec=${SPEC} smoke=${SMOKE} deep=${DEEP})" >> "$LOG"
  fi
  sleep "$((CYCLE_MINUTES * 60))"
done
echo "=== 8-hour iteration window complete $(date '+%F %T') ===" >> "$LOG"
exit 0
