---
name: Mock state needs state.config
description: When a panel refactor moves from ALL_X imports to state.config.X, every test that mocks useGameState must add config: createGameConfig() to the fixture state
type: feedback
---

When panels are refactored from `import { ALL_ANTIQUITY_TECHS } from '@hex/engine'` to
`state.config.technologies.values()`, all test files that mock `useGameState` must be
updated to include `config: createGameConfig()` in their `makeState()` fixture function.

**Why:** The old pattern imported data at module level and didn't touch state.config.
The new pattern reads from state.config at render time. Any mock state without config
will throw `Cannot read properties of undefined (reading 'technologies')`.

**How to apply:** When refactoring a panel to use state.config, grep for all test files
that mock the panel's useGameState and add `import { createGameConfig } from '@hex/engine'`
+ `config: createGameConfig()` to the makeState fixture. In Phase 4.1 this affected
TechTreePanel.click.test.tsx, CivicTreePanel.click.test.tsx, AND
PanelShell.migration.test.tsx (a shared migration test file).
