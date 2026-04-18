#!/bin/bash
# Summarize agent-timing.jsonl.
#
#   agent-timing-report.sh                      # completion summary
#   agent-timing-report.sh <id>                 # per-agent time-series
#   agent-timing-report.sh --hangs              # hang-suspect completions only
#   agent-timing-report.sh --timeline           # wall-clock Gantt + overlap stats
#   agent-timing-report.sh --now                # what's running right now

set -uo pipefail

LOG_FILE=".claude/workflow/scratch/agent-timing.jsonl"
[ ! -f "$LOG_FILE" ] && { echo "no log at $LOG_FILE" >&2; exit 0; }

ARG="${1:-}"

case "$ARG" in
  --hangs)
    echo "== Hang-suspect completions =="
    node -e "
      const fs = require('fs');
      const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
      for (const ln of lines) { try {
        const r = JSON.parse(ln);
        if (r.kind === 'complete' && (r.class === 'HANG_SUSPECT' || r.class === 'SLOW')) {
          console.log(\`[\${r.class}] \${r.phase} \${r.subagent} id=\${(r.agent_id||'').slice(0,8)} dur=\${(r.duration_ms/60000).toFixed(1)}min tokens=\${r.total_tokens} tpm=\${r.tokens_per_min}\`);
          if (r.notes) console.log('  notes:', r.notes);
        }
      } catch {} }
    "
    ;;

  --timeline)
    echo "== Wall-clock timeline =="
    node -e "
      const fs = require('fs');
      const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
      const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const spawns = events.filter(e => e.kind === 'spawn');
      const completes = events.filter(e => e.kind === 'complete');

      // Pair spawns with completes by agent_id
      const agents = [];
      for (const c of completes) {
        const s = spawns.find(x => x.agent_id === c.agent_id);
        const start = s ? s.ts_epoch : (c.ts_epoch - Math.round(c.duration_ms / 1000));
        const end = c.ts_epoch;
        agents.push({
          id: (c.agent_id || '').slice(0,8),
          phase: c.phase,
          subagent: c.subagent,
          start, end,
          duration_s: Math.round(c.duration_ms / 1000),
          tokens: c.total_tokens,
          tpm: c.tokens_per_min,
          class: c.class,
          had_spawn_row: !!s
        });
      }
      if (!agents.length) { console.log('no completions yet'); process.exit(0); }

      agents.sort((a,b) => a.start - b.start);
      const t0 = agents[0].start;
      const tN = Math.max(...agents.map(a => a.end));
      const wall = tN - t0;

      // Render bars — 60 char wide canvas
      const WIDTH = 60;
      console.log('');
      console.log(\`session wall-clock: \${(wall/60).toFixed(1)}min  (from \${new Date(t0*1000).toISOString().slice(11,16)}Z to \${new Date(tN*1000).toISOString().slice(11,16)}Z)\`);
      console.log('');
      console.log('  start    end    dur     phase                     [bar]');
      for (const a of agents) {
        const offL = Math.floor(((a.start - t0) / wall) * WIDTH);
        const barW = Math.max(1, Math.floor(((a.end - a.start) / wall) * WIDTH));
        const spaces = ' '.repeat(offL);
        const bar = (a.class === 'HANG_SUSPECT' ? '!' : a.class === 'SLOW' ? '~' : '#').repeat(barW);
        const startMM = Math.floor((a.start - t0) / 60);
        const endMM = Math.floor((a.end - t0) / 60);
        console.log(\`  \${String(startMM).padStart(3)}min  \${String(endMM).padStart(3)}min  \${String(Math.round(a.duration_s/60*10)/10).padStart(4)}m  \${(a.phase||'').padEnd(24).slice(0,24)}  \${spaces}\${bar}\`);
      }

      // Parallelism stats
      let serial = 0;
      for (const a of agents) serial += (a.end - a.start);
      const parallelGain = serial - wall;

      // Idle gaps in the timeline (wall seconds when NO agent was running)
      const timeline = [];
      for (const a of agents) { timeline.push([a.start, +1]); timeline.push([a.end, -1]); }
      timeline.sort((x,y) => x[0] - y[0] || y[1] - x[1]);
      let running = 0, idle = 0, lastIdleStart = null;
      let last = t0;
      const idleWindows = [];
      for (const [t, d] of timeline) {
        if (running === 0 && t > last) {
          const gap = t - last;
          idle += gap;
          if (gap >= 60) idleWindows.push({ from: last - t0, to: t - t0, gap });
        }
        running += d;
        if (running === 0) last = t;
      }

      console.log('');
      console.log('legend:  # HEALTHY   ~ SLOW   ! HANG_SUSPECT');
      console.log('');
      console.log(\`serial subagent-time : \${(serial/60).toFixed(1)}min  (sum of all subagent durations)\`);
      console.log(\`wall-clock          : \${(wall/60).toFixed(1)}min\`);
      console.log(\`parallel gain       : \${(parallelGain/60).toFixed(1)}min  (serial - wall = time saved by overlap)\`);
      console.log(\`parent-idle total   : \${(idle/60).toFixed(1)}min  (wall time no subagent was running)\`);
      if (idleWindows.length) {
        console.log('idle windows >= 60s :');
        for (const w of idleWindows) {
          console.log(\`  \${String(Math.floor(w.from/60)).padStart(3)}min → \${String(Math.floor(w.to/60)).padStart(3)}min  (\${(w.gap/60).toFixed(1)}min parent-only)\`);
        }
      }
      const missingSpawns = agents.filter(a => !a.had_spawn_row).length;
      if (missingSpawns) console.log(\`note: \${missingSpawns} agent(s) had no spawn row — start times reconstructed from (complete_ts - duration), may be approximate.\`);
    "
    ;;

  --now)
    echo "== Running right now =="
    node -e "
      const fs = require('fs');
      const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
      const events = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const completedIds = new Set(events.filter(e => e.kind === 'complete').map(e => e.agent_id));
      const now = Math.floor(Date.now() / 1000);
      const running = events.filter(e => e.kind === 'spawn' && !completedIds.has(e.agent_id));
      if (!running.length) { console.log('no agents currently running'); process.exit(0); }
      for (const r of running) {
        const elapsed = now - r.ts_epoch;
        console.log(\`  \${r.phase} / \${r.subagent} / \${(r.agent_id||'').slice(0,8)} — elapsed \${Math.floor(elapsed/60)}min \${elapsed%60}s\`);
      }
    "
    ;;

  "")
    echo "== Completion summary =="
    node -e "
      const fs = require('fs');
      const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
      const rows = lines.map(l => { try { return JSON.parse(l); } catch { return null; } })
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
    ;;

  *)
    # Per-agent time-series
    echo "== Time-series for $ARG =="
    node -e "
      const fs = require('fs');
      const lines = fs.readFileSync('$LOG_FILE', 'utf8').trim().split('\n').filter(Boolean);
      const rows = lines.map(l => { try { return JSON.parse(l); } catch { return null; } })
        .filter(r => r && (r.agent_id && r.agent_id.startsWith('$ARG')));
      if (!rows.length) { console.log('no rows matched'); process.exit(0); }
      console.log('event          elapsed  bytes    delta   stall  note');
      let spawnTs = null;
      for (const r of rows) {
        if (r.kind === 'spawn') { spawnTs = r.ts_epoch; console.log('SPAWN          0s       —        —       —'); }
        else if (r.kind === 'sample') {
          const stall = r.stall_count >= 2 ? ' HANG!' : '';
          console.log(\`sample         \${String(r.elapsed_s).padStart(4)}s    \${String(r.bytes).padStart(7)}  \${String(r.delta).padStart(6)}  \${String(r.stall_count).padStart(4)}\${stall}\`);
        } else if (r.kind === 'complete') {
          const el = spawnTs ? r.ts_epoch - spawnTs : Math.round(r.duration_ms/1000);
          console.log(\`COMPLETE       \${String(el).padStart(4)}s    dur=\${(r.duration_ms/60000).toFixed(1)}min tokens=\${r.total_tokens} tpm=\${r.tokens_per_min} class=\${r.class}\`);
          if (r.notes) console.log('  notes:', r.notes);
        } else if (r.kind === 'sampler_exit') {
          console.log(\`SAMPLER_EXIT            reason=\${r.reason} samples=\${r.samples}\`);
        } else if (r.kind === 'sampler_path_error') {
          console.log(\`SAMPLER_PATH_ERROR      path=\${r.resolved_path}\`);
        }
      }
    "
    ;;
esac
