## Issues Log
<!-- Hooks auto-append entries here. Format: -->
<!-- - [YYYY-MM-DDTHH:MM:SSZ] [category] description -->
<!-- Truncated 2026-04-16 after Phase 6 reorganization: 63 context-free "Bash command failed" entries removed; log-bash-failure.sh now captures the first 120 chars of the failed command. -->
- [2026-04-16T06:23:01Z] [command_failure] `cd "C:/Users/housh/Documents/monoWeb/hex-empires" && \   echo "--- pre-commit state ---" && \   echo "scratch contents:" `
- [2026-04-16T07:20:58Z] [command_failure] `ls "C:\Users\housh\Documents\monoWeb\hex-empires\.claude\workflow\scratch\" 2>&1 `
- [2026-04-16T07:26:49Z] [review_skipped] commit 61c1fc7 — Skip-Review: manual WARN cleanup following auto-drive; no new code shape.
- [2026-04-16T07:40:01Z] [command_failure] `ls "C:\Users\housh\Documents\monoWeb\hex-empires\.claude\workflow\scratch\" `
- [2026-04-16T07:47:07Z] [command_failure] `ls -la "C:/Users/housh/Documents/monoWeb/hex-empires/.claude/workflow/scratch/.review.lock/" 2>/dev/null `

[2026-04-19T12:45:00Z] [PRINCIPLE-GAP] F-f33cdd16 on 1e73a328: success-path test nested inside describe('... invalid ...') block — describe name contradicts test intent; no trap covers test describe-block misorganization
[2026-04-19T12:45:00Z] [PRINCIPLE-GAP] F-ad373f07 on 7a9b9e9c: test lacking isolation comment for why a sibling win condition cannot fire — no trap covers missing test-isolation documentation
[2026-04-19T12:45:00Z] [PRINCIPLE-GAP] F-66ca2cdf on 8da4a260: dead no-op statement (fetch variable + void it) rather than a dead constant — dead-constant trap covers unused const/let, not dead imperative statements
