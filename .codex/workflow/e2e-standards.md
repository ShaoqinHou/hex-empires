# E2E Standards

Use this standard for any browser-facing workflow, UI, canvas, or gameplay
change. A workflow is not done just because unit tests pass.

## Required Layers

1. **Build/start** - dependencies installed, dev server starts, app loads.
2. **Console health** - no page errors or unexpected console errors.
3. **Visual health** - screenshot confirms the intended screen is nonblank,
   correctly framed, and not obviously overlapped.
4. **User flow** - exercise the primary interaction that changed.
5. **State assertion** - verify a concrete observable state change, not just
   "element exists."
6. **Regression sweep** - run the relevant Playwright spec or add one when the
   behavior is new.
7. **Deploy build smoke order** - if full Playwright includes build-smoke specs,
   run `npm --workspace=packages/web run build:deploy` immediately before
   Playwright. A normal `npm run build` rewrites `packages/web/dist` with root
   asset paths and invalidates `/hex-empires/` smoke assertions.

## UI/Canvas Verification

For UI or canvas changes:

- Start `npm run dev:web` on port 5174 or the next free port.
- Use Playwright as the required repeatable regression gate. It is the default
  for worker clones and any workflow that multiple agents may run in parallel.
- Use Browser Use or the in-app browser for lead-controlled visual inspection,
  exploratory debugging, and screenshots that should reflect what the user can
  see.
- Capture at least one screenshot for visual changes.
- Check console/page errors.
- Exercise the interaction with real clicks/keys where possible.
- Confirm text does not overlap at the tested viewport.
- For build-smoke coverage, make `build:deploy` the final build command before
  the Playwright run.

## Browser Tool Routing

Playwright specs are authoritative for pass/fail E2E because they are
deterministic, headless, cheap to rerun, and safe for isolated clone workers.
Browser Use is supplemental: it is model-mediated, shares the visible in-app
browser surface, and consumes more context through DOM snapshots and
screenshots. Do not assign Browser Use flows to multiple parallel workers unless
the lead explicitly gives each worker an isolated browser surface and accepts the
extra coordination cost.

Before choosing Browser Use, run the plugin preflight. In this Codex desktop
setup, Browser Use depends on the `node_repl` MCP runtime and requires Node
`>=22.22.0`. If `node_repl` resolves to an older system Node, record the blocker
and fall back to Playwright for the required gate. The bundled Codex runtime may
include a newer Node, but Browser Use is only available after the MCP runtime
itself resolves to a compatible executable.

## Long-Run Gameplay E2E

For tests that advance multiple turns, the turn helper must handle every
current-player blocker through normal game actions before dispatching
`END_TURN`: blocking log events, crisis policy slots, per-crisis
`pendingResolution`, celebration choices, and age transition choices. A timeout
waiting for turn advancement is a workflow failure unless the test is explicitly
asserting that blocker.

## Workflow E2E Verification

For workflow-only changes:

- Run `.codex/scripts/test-workflow-e2e.ps1`.
- Run `python .codex/scripts/aggregate-audits.py --check`.
- Confirm native path hygiene: no retired workflow tree and no active docs that
  describe Codex as a translation layer.
- Confirm generated GDD mapping sections are populated.
- Confirm source-target warnings are explicit and accepted, not silent.
- Confirm asset workflow gates pass when asset-source, skill, or prompt
  standards change.

## When Browser E2E Can Be Skipped

Skip browser E2E only when the change is strictly workflow/docs/scripts and does
not affect app runtime, UI code, browser configuration, or package scripts. The
final report must say browser E2E was not applicable and name the workflow E2E
commands that replaced it.
