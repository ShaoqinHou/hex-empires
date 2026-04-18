#!/bin/bash
# Append agent-timing rows. Supports spawn and complete events so the
# reporter can compute overlap / parallelism / parent-idle gaps.
#
# Usage:
#   # at spawn-time (call this IMMEDIATELY when Agent tool returns):
#   bash .claude/workflow/scripts/log-agent-timing.sh \
#     --event spawn --phase "4.5-drama-impl" --agent-id "a8c25df4" --subagent implementer
#
#   # at completion (from task-notification <usage> block):
#   bash .claude/workflow/scripts/log-agent-timing.sh \
#     --event complete --phase "4.5-drama-impl" --agent-id "a8c25df4" \
#     --subagent implementer --duration-ms 953469 --tokens 144871 --status completed \
#     [--notes "one-liner"]
#
# Default event is "complete" (back-compat). Every subagent's lifecycle is:
#   one spawn row + one complete row. Reporter pairs them by agent-id.

set -euo pipefail

EVENT="complete"
PHASE=""
AGENT_ID=""
SUBAGENT=""
DURATION_MS=0
TOKENS=0
STATUS="completed"
NOTES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --event)        EVENT="$2"; shift 2 ;;
    --phase)        PHASE="$2"; shift 2 ;;
    --agent-id)     AGENT_ID="$2"; shift 2 ;;
    --subagent)     SUBAGENT="$2"; shift 2 ;;
    --duration-ms)  DURATION_MS="$2"; shift 2 ;;
    --tokens)       TOKENS="$2"; shift 2 ;;
    --status)       STATUS="$2"; shift 2 ;;
    --notes)        NOTES="$2"; shift 2 ;;
    *) echo "Unknown flag: $1" >&2; exit 1 ;;
  esac
done

LOG_DIR=".claude/workflow/scratch"
LOG_FILE="$LOG_DIR/agent-timing.jsonl"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TS_EPOCH=$(date +%s)

if [ "$EVENT" = "spawn" ]; then
  export TS="$TIMESTAMP" EP="$TS_EPOCH" PH="$PHASE" AID="$AGENT_ID" SA="$SUBAGENT"
  node -e "
    const e = process.env;
    process.stdout.write(JSON.stringify({
      kind: 'spawn',
      timestamp: e.TS,
      ts_epoch: parseInt(e.EP, 10),
      phase: e.PH,
      agent_id: e.AID,
      subagent: e.SA
    }) + '\n');
  " >> "$LOG_FILE"
  echo "[agent-timing] SPAWN $PHASE / $SUBAGENT / ${AGENT_ID:0:8} @ $TIMESTAMP" >&2
  exit 0
fi

# --- complete event ---
if [ "$DURATION_MS" -gt 0 ]; then
  TOKENS_PER_MIN=$(( TOKENS * 60000 / DURATION_MS ))
else
  TOKENS_PER_MIN=0
fi

if [ "$TOKENS_PER_MIN" -lt 1000 ] && [ "$DURATION_MS" -gt 60000 ]; then
  CLASS="HANG_SUSPECT"
elif [ "$TOKENS_PER_MIN" -lt 5000 ] && [ "$DURATION_MS" -gt 300000 ]; then
  CLASS="SLOW"
else
  CLASS="HEALTHY"
fi

DURATION_MIN=$(awk "BEGIN { printf \"%.1f\", $DURATION_MS / 60000 }")

export TS="$TIMESTAMP" EP="$TS_EPOCH" PH="$PHASE" AID="$AGENT_ID" SA="$SUBAGENT" \
       DMS="$DURATION_MS" DMIN="$DURATION_MIN" TKN="$TOKENS" TPM="$TOKENS_PER_MIN" \
       ST="$STATUS" CL="$CLASS" NOTES="$NOTES"

node -e "
  const e = process.env;
  process.stdout.write(JSON.stringify({
    kind: 'complete',
    timestamp: e.TS,
    ts_epoch: parseInt(e.EP, 10),
    phase: e.PH,
    agent_id: e.AID,
    subagent: e.SA,
    duration_ms: parseInt(e.DMS, 10),
    duration_min: parseFloat(e.DMIN),
    total_tokens: parseInt(e.TKN, 10),
    tokens_per_min: parseInt(e.TPM, 10),
    status: e.ST,
    class: e.CL,
    notes: e.NOTES || null
  }) + '\n');
" >> "$LOG_FILE"

echo "[agent-timing] COMPLETE $PHASE / $SUBAGENT / ${AGENT_ID:0:8} — ${DURATION_MIN}min / $TOKENS tokens / $TOKENS_PER_MIN tpm / $CLASS" >&2
