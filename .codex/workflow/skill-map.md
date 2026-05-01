# Skill Map

The repo keeps task procedures under `.codex/skills/`. Codex does not invoke
them as slash commands automatically, so the lead reads the matching skill file
when the task matches.

| Task | Procedure | Spark eligible |
|---|---|---|
| Add a new panel | `.codex/skills/add-panel/SKILL.md` | Only for exact template fill-in |
| Add a HUD overlay | `.codex/skills/add-hud-element/SKILL.md` | Rare; usually needs lead/UI review |
| Add data content | `.codex/skills/add-content/SKILL.md` | Yes if all values and IDs are supplied |
| Generate or replace visual asset | Paused: `.codex/skills/generate-asset/SKILL.md` and `.codex/workflow/asset-generation.md` stay as reference only until re-enabled | No |
| Write tests | `.codex/skills/test/SKILL.md` plus `.codex/rules/testing.md` | Yes for small tests |
| Browser verify UI | `.codex/skills/verify/SKILL.md` and `.codex/workflow/e2e-standards.md` | No, unless exact checklist |
| Commit review | `.codex/skills/commit-review/SKILL.md` | No |
| Consistency audit | `.codex/skills/consistency-audit/SKILL.md` | Explorer yes; Spark no |
| Spawn worktree | `.codex/skills/spawn-worktree/SKILL.md` | No |

## Rule Files to Read by Area

| Area | Rules |
|---|---|
| Engine systems | `.codex/rules/architecture.md`, `engine-patterns.md`, `import-boundaries.md`, `testing.md` |
| Data/content | `.codex/rules/data-driven.md`, `testing.md` |
| Panels | `.codex/rules/panels.md`, `tech-conventions.md` |
| HUD/overlays | `.codex/rules/ui-overlays.md`, `panels.md`, `tech-conventions.md` |
| Continuous work | `.codex/rules/loop-and-continuous-mode.md`, translated through `agent-routing.md` |
