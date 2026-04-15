# TDD Workflow (Game Development)

## 6-Phase Development Process

### Phase 1: Design
Write a design doc in `.claude/workflow/design/{feature}.md` with:
- Feature description (which game system, which Civ VII mechanic)
- State changes (what fields in GameState are affected)
- Actions (which GameAction types are involved)
- Data requirements (new content types or effects needed)

### Phase 2: Scaffold
- Engine: create system file in `systems/`, types in `types/`
- Data: create content files in `data/{type}/`
- Web: create UI panel or canvas component
- `__tests__/` directories

### Phase 3: Tests (Red)
Write failing tests at appropriate depth:
- **L1 (Unit):** System pure functions with concrete states
- **L2 (Integration):** Multi-system pipeline (applyAction)
- **L3 (Behavioral):** Browser canvas/UI interactions
- **L4 (Output):** Serialization, save/load

Engine systems are pure functions — they're trivial to unit test. Start here.

### Phase 4: Implement (Green)
- Write minimum code to pass tests
- Systems must be pure: `(state, action) => newState`
- Use seeded RNG, never `Math.random()`
- Run tests frequently: `bash .claude/hooks/run-tests.sh --module engine`

### Phase 5: E2E Verify
Browser verification via `/verify` skill.
- Canvas renders correctly (hex grid, units, terrain)
- Clicks produce correct game actions
- UI panels show correct state
- No console errors

### Phase 6: Review
- Code quality: no `any`, readonly state, named exports
- Import boundaries: engine clean of DOM, no cross-system imports
- Data consistency: all referenced IDs exist in registries
- Test coverage: new systems have unit tests
- **Automated:** the `/commit-review` skill runs a three-agent loop (Reviewer → Fixer → Arbiter) against the HEAD commit. Triggered automatically via the PostToolUse hook after `git commit`, or invoked manually. See `.claude/skills/commit-review/SKILL.md`.

## Bug-Fix Fast Path
1. Write regression test
2. Fix the bug
3. Run tests
4. `/verify` if visual

## Artifact Locations
- Design docs: `.claude/workflow/design/{feature}.md`
- Test results: `.claude/workflow/test-result.txt`
- Verify marker: `.claude/workflow/verify-marker.txt`
- Issues log: `.claude/workflow/issues.md`
- Status: `.claude/workflow/STATUS.md` (snapshot — decays; consult `session-start.sh` output + `git log` for live state)
- Backlog: `.claude/workflow/BACKLOG.md` (SYS-D + CNT-D open items)
- Review scratch (gitignored): `.claude/workflow/scratch/`
- Archive (historical): `.claude/workflow/design/archive/`
- Standards registry (detection recipes): `.claude/workflow/design/standards.md`
