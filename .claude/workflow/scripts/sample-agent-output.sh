#!/bin/bash
# ⚠️ KNOWN-LIMITED ON CURRENT CLAUDE CODE RUNTIME (2026-04-18)
# The task `output_file` path is a 0-byte placeholder — the subagent
# JSONL transcript is NOT streamed to disk during the run. Tested across
# multiple spawns (impl + designer); file stays 0 bytes throughout and
# after completion. Mid-run hang detection via size-sampling is therefore
# not viable until Claude Code streams transcripts progressively.
#
# Kept in the tree in case a future runtime changes this. For actual
# hang detection today, rely on completion-row classification
# (tokens_per_min < 1000 → HANG_SUSPECT) in log-agent-timing.sh and the
# wall-clock/overlap timeline in agent-timing-report.sh.
#
# Original design below.
# -------------------------------------------------------------------
# Periodically samples a running subagent's output-file byte size, appending
# rows to agent-timing.jsonl. Lets the parent reconstruct a time-series of
# per-step activity: growth = working, stall = hang suspect.
#
# Run with Bash run_in_background immediately after spawning a subagent:
#   bash .claude/workflow/scripts/sample-agent-output.sh \
#     <phase> <agent-id> <subagent-type> <output-file-path>
#
# Sample interval: 60s. Hard cap: 45 minutes.
#
# Each sample line:
#   {"kind":"sample","phase":"...","agent_id":"...","elapsed_s":N,
#    "bytes":N,"delta":N,"stall_count":N,"ts":"..."}
#
# delta=0 for two consecutive samples = stall_count >= 2 = potential hang.
# Review with: bash .claude/workflow/scripts/agent-timing-report.sh <agent-id>

set -uo pipefail

PHASE="${1:-unknown}"
AGENT_ID="${2:-unknown}"
SUBAGENT="${3:-unknown}"
FILE="${4:-}"

if [ -z "$FILE" ]; then
  echo "sample-agent-output: missing output-file path" >&2
  exit 1
fi

# Windows path conversion: Claude Code surfaces paths like
# C:\Users\... on Windows. MINGW Bash needs /c/Users/... for stat
# to resolve the file. Convert transparently.
case "$FILE" in
  [A-Za-z]:\\*|[A-Za-z]:/*)
    DRIVE=$(printf '%s' "$FILE" | cut -c1 | tr '[:upper:]' '[:lower:]')
    REST=$(printf '%s' "$FILE" | cut -c3- | tr '\\' '/')
    FILE="/$DRIVE$REST"
    ;;
esac

# Preflight: probe the file once. If it never appears in the first 10s,
# emit a diagnostic row so the time-series isn't a silent lie.
PROBE_WAITED=0
while [ ! -f "$FILE" ] && [ "$PROBE_WAITED" -lt 10 ]; do
  sleep 1
  PROBE_WAITED=$((PROBE_WAITED + 1))
done
if [ ! -f "$FILE" ]; then
  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  node -e "
    process.stdout.write(JSON.stringify({
      kind: 'sampler_path_error',
      phase: '$PHASE',
      agent_id: '$AGENT_ID',
      resolved_path: '$FILE',
      ts: '$TS',
      note: 'output file not found after 10s — samples will all be zero; path conversion may have failed'
    }) + '\n');
  " >> "$LOG_FILE" 2>/dev/null
  # Continue anyway — the file might appear later (slow spawn)
fi

LOG_DIR=".claude/workflow/scratch"
LOG_FILE="$LOG_DIR/agent-timing.jsonl"
mkdir -p "$LOG_DIR"

INTERVAL=60           # seconds between samples
MAX_SAMPLES=45        # 45 * 60s = 45-min hard cap
SAMPLE=0
PREV_BYTES=0
STALL=0
START_TS=$(date +%s)

while [ "$SAMPLE" -lt "$MAX_SAMPLES" ]; do
  # File may not exist for the first few seconds after spawn — keep going
  if [ -f "$FILE" ]; then
    BYTES=$(stat -c %s "$FILE" 2>/dev/null || echo 0)
  else
    BYTES=0
  fi

  NOW=$(date +%s)
  ELAPSED=$((NOW - START_TS))
  DELTA=$((BYTES - PREV_BYTES))
  if [ "$DELTA" -eq 0 ] && [ "$SAMPLE" -gt 0 ]; then
    STALL=$((STALL + 1))
  else
    STALL=0
  fi
  PREV_BYTES=$BYTES

  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  # Single-line JSON via node so we avoid manual escaping drama
  node -e "
    const row = {
      kind: 'sample',
      phase: '$PHASE',
      agent_id: '$AGENT_ID',
      subagent: '$SUBAGENT',
      elapsed_s: $ELAPSED,
      bytes: $BYTES,
      delta: $DELTA,
      stall_count: $STALL,
      ts: '$TS'
    };
    process.stdout.write(JSON.stringify(row) + '\n');
  " >> "$LOG_FILE" 2>/dev/null

  SAMPLE=$((SAMPLE + 1))
  sleep "$INTERVAL"
done

# Final marker — sampler exited (either cap hit or externally killed)
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
node -e "
  process.stdout.write(JSON.stringify({
    kind: 'sampler_exit',
    phase: '$PHASE',
    agent_id: '$AGENT_ID',
    elapsed_s: $((NOW - START_TS)),
    final_bytes: $PREV_BYTES,
    samples: $SAMPLE,
    reason: '$([ "$SAMPLE" -ge "$MAX_SAMPLES" ] && echo "max-samples-reached" || echo "normal-exit")',
    ts: '$TS'
  }) + '\n');
" >> "$LOG_FILE" 2>/dev/null
