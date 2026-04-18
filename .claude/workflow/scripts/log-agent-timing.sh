#!/bin/bash
# Append an agent-return row to the timing log + classify hang risk.
#
# Usage:
#   bash .claude/workflow/scripts/log-agent-timing.sh \
#     --phase "4.5-drama-modal" \
#     --agent-id "ab9cb537b4ee046db" \
#     --subagent designer \
#     --duration-ms 803626 \
#     --tokens 135331 \
#     --status completed \
#     [--notes "inline return fallback"]
#
# Every subagent return should call this once. Output is appended to
# .claude/workflow/scratch/agent-timing.jsonl. Classification:
#   tokens_per_min < 1000 → HANG_SUSPECT (integrator-style idle spin)
#   tokens_per_min < 5000 and duration > 300000ms (5min) → SLOW (retry loop?)
#   otherwise HEALTHY

set -euo pipefail

PHASE=""
AGENT_ID=""
SUBAGENT=""
DURATION_MS=0
TOKENS=0
STATUS="completed"
NOTES=""

while [[ $# -gt 0 ]]; do
  case "$1" in
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
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

LOG_DIR=".claude/workflow/scratch"
LOG_FILE="$LOG_DIR/agent-timing.jsonl"
mkdir -p "$LOG_DIR"

# Pass values via env vars to avoid quoting issues in the node -e body
export TS="$TIMESTAMP" PH="$PHASE" AID="$AGENT_ID" SA="$SUBAGENT" \
       DMS="$DURATION_MS" DMIN="$DURATION_MIN" \
       TKN="$TOKENS" TPM="$TOKENS_PER_MIN" \
       ST="$STATUS" CL="$CLASS" NOTES="$NOTES"

node -e "
  const e = process.env;
  const row = {
    kind: 'complete',
    timestamp: e.TS,
    phase: e.PH,
    agent_id: e.AID,
    subagent: e.SA,
    duration_ms: parseInt(e.DMS, 10),
    duration_min: parseFloat(e.DMIN),
    total_tokens: parseInt(e.TKN, 10),
    tokens_per_min: parseInt(e.TPM, 10),
    status: e.ST,
    class: e.CL,
    notes: e.NOTES || null,
  };
  process.stdout.write(JSON.stringify(row) + '\n');
" >> "$LOG_FILE"

echo "[agent-timing] phase=$PHASE subagent=$SUBAGENT duration=${DURATION_MIN}min tokens=$TOKENS tpm=$TOKENS_PER_MIN class=$CLASS" >&2
