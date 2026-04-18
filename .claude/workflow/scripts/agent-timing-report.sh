#!/bin/bash
# Summarize agent-timing.jsonl — either session-level or per-agent time-series.
#
# Usage:
#   bash .claude/workflow/scripts/agent-timing-report.sh           # session summary
#   bash .claude/workflow/scripts/agent-timing-report.sh <id>      # time-series for one agent
#   bash .claude/workflow/scripts/agent-timing-report.sh --hangs   # only hang-suspect completions
#
# Reads .claude/workflow/scratch/agent-timing.jsonl (JSONL) and formats it.

set -uo pipefail

LOG_FILE=".claude/workflow/scratch/agent-timing.jsonl"
if [ ! -f "$LOG_FILE" ]; then
  echo "No timing log at $LOG_FILE" >&2
  exit 0
fi

ARG="${1:-}"

if [ "$ARG" = "--hangs" ]; then
  echo "== Hang-suspect completions =="
  node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
    for (const ln of lines) {
      try {
        const r = JSON.parse(ln);
        if (r.kind === 'complete' && (r.class === 'HANG_SUSPECT' || r.class === 'SLOW')) {
          console.log(\`[\${r.class}] \${r.phase} \${r.subagent} id=\${r.agent_id?.slice(0,8)} dur=\${(r.duration_ms/60000).toFixed(1)}min tokens=\${r.total_tokens} tpm=\${r.tokens_per_min}\`);
          if (r.notes) console.log(\`  notes: \${r.notes}\`);
        }
      } catch {}
    }
  "
  exit 0
fi

if [ -n "$ARG" ]; then
  # Per-agent time-series
  echo "== Time-series for agent $ARG =="
  node -e "
    const fs = require('fs');
    const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
    const rows = lines
      .map(ln => { try { return JSON.parse(ln); } catch { return null; } })
      .filter(r => r && (r.agent_id && r.agent_id.startsWith('$ARG')));
    if (!rows.length) { console.log('no rows matched'); process.exit(0); }
    console.log('elapsed    bytes    delta   stall  note');
    for (const r of rows) {
      if (r.kind === 'sample') {
        const stall = r.stall_count >= 2 ? ' HANG!' : '';
        console.log(\`\${String(r.elapsed_s).padStart(5)}s  \${String(r.bytes).padStart(7)}  \${String(r.delta).padStart(6)}  \${String(r.stall_count).padStart(4)}\${stall}\`);
      } else if (r.kind === 'complete') {
        console.log(\`--- COMPLETE --- duration=\${(r.duration_ms/60000).toFixed(1)}min tokens=\${r.total_tokens} tpm=\${r.tokens_per_min} class=\${r.class}\`);
        if (r.notes) console.log(\`  notes: \${r.notes}\`);
      } else if (r.kind === 'sampler_exit') {
        console.log(\`--- SAMPLER EXIT --- reason=\${r.reason} samples=\${r.samples}\`);
      }
    }
  "
  exit 0
fi

# Default: session summary of completions
echo "== Session summary (completions only) =="
node -e "
  const fs = require('fs');
  const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
  const rows = lines.map(ln => { try { return JSON.parse(ln); } catch { return null; } })
    .filter(r => r && r.kind === 'complete');
  if (!rows.length) { console.log('no completions yet'); process.exit(0); }
  console.log('phase'.padEnd(26), 'subagent'.padEnd(12), 'id'.padEnd(10), 'dur'.padEnd(7), 'tokens'.padEnd(8), 'tpm'.padEnd(7), 'class');
  for (const r of rows) {
    console.log(
      (r.phase||'').padEnd(26),
      (r.subagent||'').padEnd(12),
      (r.agent_id||'').slice(0,8).padEnd(10),
      ((r.duration_ms/60000).toFixed(1)+'min').padEnd(7),
      String(r.total_tokens||'').padEnd(8),
      String(r.tokens_per_min||'').padEnd(7),
      r.class||''
    );
  }
"
