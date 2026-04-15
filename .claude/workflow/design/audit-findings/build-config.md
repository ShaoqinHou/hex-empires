# Build & Config Audit

Generated: 2026-04-15
Auditor: Sonnet 4.6 (read-only pass)
Scope: `package.json` (root + packages), `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `.claude/hooks/*.sh`

Classification key: **A** = conformant / no action needed · **B** = minor gap / fix when convenient · **C** = real risk / fix soon

---

## 1. TypeScript Strict Mode

### Root `tsconfig.json`

```json
"strict": true,
"skipLibCheck": true,
```

- `strict: true` enables `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`. **Conformant.**
- `noUncheckedIndexedAccess` is **NOT** set. This is the one strict-adjacent flag that `strict: true` does not enable. With `ReadonlyArray` heavy usage in GameState, array subscripts (`arr[i]`) return `T` not `T | undefined`, which can mask out-of-bounds access.
- `skipLibCheck: true` is a **loophole** — it bypasses type-checking of `.d.ts` files in `node_modules`. The codebase uses this in root tsconfig AND both package tsconfigs. The risk is that type errors in third-party `.d.ts` are silently suppressed, and more importantly, generated `.d.ts` files in `packages/engine/dist/` are also skipped when consumed by `packages/web`. This undercuts the engine/web type contract.
- Both package tsconfigs are verbatim copies of the root with one addition each (`jsx` for web, `outDir`/`rootDir`/`paths` for both). There is **no `extends`** — all three tsconfigs are parallel copies. A change to a shared option (e.g. `target`) must be made in three places.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| TS-1 | B | `noUncheckedIndexedAccess` not enabled. Array subscript access returns `T`, not `T \| undefined`. |
| TS-2 | B | `skipLibCheck: true` in all three tsconfigs — silences `.d.ts` errors including engine→web contract. |
| TS-3 | B | No `extends` chain — root/engine/web tsconfigs are parallel copies; three-place changes needed for shared options. |

### Engine `tsconfig.json`

```json
"exclude": ["node_modules", "dist", "src/**/__tests__"]
```

Test files are excluded from compilation. This means test files are **only compiled by Vitest**, not by `tsc`. If a test file has a type error that `tsc` would catch, it will go undetected until the test runner runs. This is common practice but worth noting.

Additionally: `"baseUrl": "."` with `"paths": { "@engine/*": ["src/*"] }` correctly sets up the engine alias in the tsconfig. However, `@engine/*` (wildcard) resolves to a path, whereas the vitest.config uses `@engine` (no wildcard) as a direct alias:

```ts
// vitest.config.ts
alias: { '@engine': path.resolve(__dirname, 'src') }

// tsconfig
"@engine/*": ["src/*"]
```

These are different alias shapes. `import { foo } from '@engine/hex/HexCoord'` works in both. `import { foo } from '@engine'` (the barrel) works in vitest but is NOT covered by the tsconfig path (which requires `@engine/*`, not `@engine` alone). In practice the codebase uses `@engine/...` sub-paths, so this gap is dormant but could trip up if anyone imports the barrel directly via `@engine`.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| TS-4 | B | `@engine/*` in tsconfig vs `@engine` (no wildcard) in vitest.config — alias shapes differ; barrel import `from '@engine'` is covered in vitest but not tsconfig. |
| TS-5 | C | `__tests__` directories excluded from `tsc` — type errors in test files not caught by build; only caught at runtime by Vitest. |

### Web `tsconfig.json`

`"paths": { "@web/*": ["src/*"] }` — correct. No `@hex/engine` path entry, but web resolves the engine via workspace `"@hex/engine": "*"` in `package.json`. At build time Vite intercepts this via its alias; `tsc -b` uses the workspace package resolution (reading `packages/engine/package.json` `"main": "./src/index.ts"`). This works but relies on Vite's alias override at runtime and workspace symlinks at compile time — slightly implicit.

The web tsconfig also has no `composite: true` / `references` back to engine, which means `tsc -b` in `packages/web` alone does NOT rebuild engine first (it relies on already-built engine types). The root tsconfig has `references` entries for both packages, so `tsc -b` from the root works correctly.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| TS-6 | B | Web tsconfig has no `references` to engine — `tsc -b` inside `packages/web` alone may use stale engine types. Only works correctly from root. |

---

## 2. Import Aliases

CLAUDE.md declares three aliases:
- `@engine/*` → `packages/engine/src/*`
- `@web/*` → `packages/web/src/*`
- `@hex/engine` → `packages/engine/src/index.ts` (barrel)

### Consistency matrix

| Alias | Root tsconfig | Engine tsconfig | Web tsconfig | Vite config | Engine vitest | Web vitest (none) |
|-------|--------------|----------------|-------------|------------|--------------|------------------|
| `@engine/*` | — | `src/*` ✓ | — | — | `src` (no wildcard) ⚠ | — |
| `@web/*` | — | — | `src/*` ✓ | `src` (no wildcard) ⚠ | — | — |
| `@hex/engine` | — | — | — | `../engine/src` ✓ | — | — |

**Vite/vitest alias shape mismatch:** Vite and vitest use `'@web': path.resolve(...)` (exact match, no wildcard), while tsconfig uses `@web/*` (wildcard with subpath). In Vite's resolver, `'@web'` as an exact-string alias matches any import that **starts with** `@web` — it does a prefix replacement. So `import x from '@web/foo'` becomes `import x from '<src>/foo'`. Vite's `resolve.alias` with a string value does prefix replacement, not exact match. This actually works correctly for the subpath case. However, tsconfig's `@web/*` requires at least one path segment after `@web/`, so `import from '@web'` (barrel import of web) would be a tsconfig error. The alias shapes are functionally consistent for all real usage.

**Web package has no vitest config.** The web `test` script is `vitest run` — Vitest will run with its default configuration, picking up Vite config for alias resolution. This works because Vitest reads `vite.config.ts` automatically when no `vitest.config.ts` exists. However, there is no explicit `test.include` glob, so Vitest uses its default (`**/__tests__/**`, `**/*.{test,spec}.{ts,tsx}`). This is functional but unintentional — the engine vitest config explicitly sets `include: ['src/**/__tests__/**/*.test.ts']` for clarity. The web package has no such explicit include.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| AL-1 | A | Alias shapes work correctly for all real subpath imports — no functional bug. |
| AL-2 | B | Web package has no `vitest.config.ts` — Vitest implicitly reads `vite.config.ts`. No explicit `test.include`. |
| AL-3 | B | `@hex/engine` alias only defined in Vite config, not in web tsconfig or a shared tsconfig base. Resolved via npm workspace at `tsc` time and via Vite alias at bundle time — implicit dual resolution. |

---

## 3. Package Scripts vs CLAUDE.md Documentation

CLAUDE.md documents these commands:

```bash
npm run dev:all          # Start web (port 5174)
npm run dev:web          # Web only
npm test                 # Full suite
npm run test:engine      # Engine tests only
npm run test:web         # Web tests only
npm run build            # Build engine + web
```

Root `package.json` scripts:

```json
"dev:web": "npm run dev --workspace=packages/web",
"dev:all": "npm run dev:web",
"build": "npm run build --workspace=packages/engine && npm run build --workspace=packages/web",
"test": "npm run test --workspace=packages/engine && npm run test --workspace=packages/web",
"test:engine": "npm run test --workspace=packages/engine",
"test:web": "npm run test --workspace=packages/web"
```

All scripts are present and match documentation. **No dead scripts.** The CLAUDE.md also documents `bash .claude/hooks/run-tests.sh` commands — these are consistent with script names.

One potential gap: `dev:all` is documented as "Start web (port 5174)" but the comment says it does the same as `dev:web`. If the project ever needs an engine watch (e.g. for type-checking in parallel), `dev:all` would need updating. Currently it's a correct alias.

Web `package.json` has a `test:e2e` script (`playwright test`) that is **not documented in CLAUDE.md** and not wired into the root `test` or `test:web` scripts. E2E tests are therefore opt-in only.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| SC-1 | A | All documented scripts exist and are correctly implemented. |
| SC-2 | B | `test:e2e` exists in web `package.json` but is undocumented in CLAUDE.md and not part of the root `npm test` pipeline. E2E never runs in CI/pre-commit. |
| SC-3 | B | `dev:all` is a trivial alias for `dev:web` — misleading name implies more (e.g. engine watch). Low priority. |

---

## 4. Dependency Versions and Pinning

### Engine `devDependencies`

```json
"typescript": "~5.8.0",    // tilde — patch range (5.8.x)
"vitest": "^3.1.0"          // caret — minor range (3.x.x)
```

### Web `dependencies`

```json
"react": "^19.1.0",
"react-dom": "^19.1.0"
```

### Web `devDependencies`

```json
"@playwright/test": "^1.59.1",
"@tailwindcss/vite": "^4.1.0",
"@testing-library/jest-dom": "^6.6.0",
"@testing-library/react": "^16.3.0",
"@types/react": "^19.1.0",
"@types/react-dom": "^19.1.0",
"@vitejs/plugin-react": "^4.4.0",
"jsdom": "^26.0.0",
"tailwindcss": "^4.1.0",
"typescript": "~5.8.0",
"vite": "^6.3.0",
"vitest": "^3.1.0"
```

**Observations:**

- `typescript` uses tilde (`~5.8.0`) — patch-range. This is a reasonable choice for a compiler; minor TypeScript releases occasionally tighten type checking. Consistent across engine and web. **Conformant.**
- All other deps use caret (`^`) — minor-range. For a game project without CI, this is a real drift risk: Tailwind v4 in particular has a history of breaking on minor releases.
- `react` and `react-dom` are at `^19.1.0` (dependencies, not devDependencies). Since web is `private: true`, this is acceptable — no one consumes the package. But it does mean `npm install` can silently pull React 19.x.x minor updates that could change behavior.
- **No `engines` field** in any `package.json`. No Node version pinning. Anyone with Node 18 or Node 22 will silently get different npm workspace behavior.
- `vitest` version is `^3.1.0` in both packages. Vitest 3.x is a recent major. **Consistent** between packages. Good.
- `@playwright/test: "^1.59.1"` — Playwright is installed but **no `npx playwright install`** is documented or scripted. On a fresh checkout, E2E tests would fail silently because browser binaries are not installed. This is a common oversight.
- No `lockfile` mention in `.gitignore` — `package-lock.json` is presumably committed (not excluded). Lock file provides reproducibility that range specifiers cannot.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| DEP-1 | B | No `engines` field in any `package.json` — Node version unspecified, silent compatibility drift. |
| DEP-2 | B | All runtime and tool deps (except `typescript`) use `^` caret ranges — minor-version drift possible between installs. No lock file discipline is enforced by scripts. |
| DEP-3 | B | Playwright browser binaries not installed by any script or documented step — `test:e2e` fails on fresh checkout without manual `npx playwright install`. |
| DEP-4 | A | `typescript` pinned to patch range (`~5.8.0`) — correct for a compiler. Consistent across packages. |
| DEP-5 | A | `vitest` version consistent (`^3.1.0`) across engine and web. |

---

## 5. Vite Build Configuration

```ts
// packages/web/vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
      },
    },
  },
  chunkSizeWarningLimit: 700,
},
```

**Observations:**

- Only one manual chunk defined (`react-vendor`). The engine data registries are noted in a comment as "large (data registries)" but are not split. A single engine chunk could re-trigger the 600 kB warning when new civilizations/buildings are added.
- `chunkSizeWarningLimit: 700` — bumped from default 500 to suppress warning. This is a pragmatic choice but masks future bloat.
- **No `build.target`** — defaults to Vite's default (`'modules'`, which targets browsers that support ES modules). CLAUDE.md / tech-conventions say `target: ES2022` in tsconfig, but Vite's build target is separate. No browserslist configured. The target is implicitly "modern browsers only", which is appropriate for a game, but unstated.
- **No `build.sourcemap`** — source maps disabled in production builds. Debugging production issues will require local reproduction.
- **No `base` path** — the CLAUDE.md root notes that subpath apps need `MSYS_NO_PATHCONV=1 npx vite build --base /hex-empires/`, but the CLAUDE.md inside hex-empires does not document this. If hex-empires is ever deployed to a subpath (consistent with other monoWeb apps), the `base` would need to be specified. Currently it serves at root or is undefined.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| VITE-1 | B | No `build.target` set — ES2022 is implied by tsconfig but Vite uses its own default (`'modules'`). Should be explicit: `build: { target: 'es2022' }`. |
| VITE-2 | B | `chunkSizeWarningLimit: 700` suppresses rather than fixes bundle bloat. Engine data chunk has no split strategy. |
| VITE-3 | B | No `build.sourcemap` — production debugging relies on local repro. |
| VITE-4 | B | No `base` path documented or set — deployment subpath unknown; monoWeb sibling pattern suggests `/hex-empires/` but this is absent from `vite.config.ts` and hex-empires `CLAUDE.md`. |

---

## 6. Playwright Configuration

```ts
// packages/web/playwright.config.ts
testDir: './e2e',
timeout: 30000,
use: { baseURL: 'http://localhost:5174', headless: true },
webServer: {
  command: 'npm run dev:web',
  url: 'http://localhost:5174',
  reuseExistingServer: true,
  cwd: '../..',
},
```

**Observations:**

- `testDir: './e2e'` — references `packages/web/e2e/`. This directory is confirmed by `.gitignore` entries (`packages/web/e2e/screenshot-*.png`, `packages/web/e2e/visual-snapshot*.png`).
- `webServer.cwd: '../..'` — runs `npm run dev:web` from the repo root. Correct for an npm workspace.
- `webServer.command: 'npm run dev:web'` — `dev:web` is a root-level script that calls `npm run dev --workspace=packages/web`. Correct.
- `reuseExistingServer: true` — good for local development; bad for CI where a stale server could mask failures.
- No `reporter` configured — defaults to Playwright's `list` reporter. No HTML report, no JUnit output.
- No `retries` set (default 0). A flaky E2E in a game (timing-sensitive canvas renders) will fail the run with no retry.
- `timeout: 30000` (30s per test) — reasonable for a game.
- No `projects` array — only the default desktop Chromium is tested. No cross-browser coverage.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| PW-1 | B | `reuseExistingServer: true` — correct for local dev, but CI should use `false` to avoid stale-server bugs. |
| PW-2 | B | No `retries` — game canvas timing makes E2E flaky; at least 1 retry recommended. |
| PW-3 | B | No `reporter` — no persistent HTML/JUnit artifact for test runs. |
| PW-4 | B | No multi-browser `projects` — only Chromium tested. Low priority for a game. |

---

## 7. Hook Scripts

### `.claude/hooks/check-edited-file.sh` (PostToolUse)

Checks 4 import boundary classes on every file edit. **Well-implemented.** Uses `jq` with a Node.js fallback. Works on Windows MINGW64. Writes to issues.md with lock-file exclusion.

One gap: the cross-system check (Check 2) uses a hardcoded system-name regex:

```bash
"from.*['\"]\./(turn|movement|combat|production|research|growth|diplomacy|resource|age|crisis|victory|effect|visibility|promotion|improvement|buildingPlacement|district|civic|specialist|trade|governor|fortify|ai)System"
```

This list is not automatically updated when new systems are added. If a new system (e.g. `commanderSystem`, `governmentSystem`) is added to the pipeline, cross-import violations involving those systems will not be detected.

### `.claude/hooks/run-tests.sh`

Correct. Test output piped to `2>&1` (stderr captured). Lock file for issues.md is implemented but uses `sleep 0.5` as fallback — this can fail under high concurrency. Minor.

### `.claude/hooks/stop-nudge-verify.sh` (Stop hook)

Blocks the Stop action if unstaged source changes exist and no recent verify marker (< 1800s). Correct. Uses `date -r` for file mtime — this is Linux/macOS syntax and may behave unexpectedly on Windows MINGW64 where `date -r` is not always available. On MINGW64, `date -r file` works via the GNU coreutils that ship with Git for Windows, so this is likely fine but untested.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| HOOK-1 | B | `check-edited-file.sh` system name list is hardcoded — new systems (commander, government, religion) not protected against cross-import. Must be manually updated when systems are added. |
| HOOK-2 | B | `stop-nudge-verify.sh` uses `date -r` for file mtime — works on MINGW64 via GNU coreutils but not documented; may fail in non-Git-for-Windows shells. |
| HOOK-3 | A | All hooks use `node -e` fallback for JSON parsing when `jq` is absent — correct for Windows environment. |

---

## 8. `.gitignore`

Covers: `node_modules/`, `dist/`, `.env`, `.env.local`, `packages/web/dist/`, `packages/engine/dist/`, IDE dirs, OS artifacts, workflow artifacts, Playwright screenshots.

Gaps:
- **`.claude/worktrees/` is gitignored** — correct for parallel-agent worktrees (ephemeral). But there is no `.claude/worktrees/.gitkeep` to ensure the parent directory is committed. A fresh clone will be missing the directory, which could fail scripts that assume it exists.
- `packages/web/e2e/visual-snapshot*.png` is gitignored, but there is no corresponding Playwright snapshot baseline path in gitignore (e.g. `packages/web/e2e/__snapshots__/`). If Playwright visual snapshots are added, the baseline PNGs should be committed, not gitignored.
- No `.npmrc` in repo — no `save-exact=true` to enforce pinned installs. Optional but consistent with the pinning intent.

**Findings:**
| # | Class | Finding |
|---|-------|---------|
| GIT-1 | B | `.claude/worktrees/` gitignored with no `.gitkeep` — missing directory on fresh clone may break worktree scripts. |
| GIT-2 | B | Playwright visual snapshot baselines not addressed in `.gitignore` — if visual regression is added, baseline PNGs must be committed, not ignored. |
| GIT-3 | B | No `.npmrc` with `save-exact=true` — range specifiers in `package.json` not locked by policy, only by `package-lock.json`. |

---

## 9. Summary Table

| # | Class | Area | Finding | File |
|---|-------|------|---------|------|
| TS-1 | B | TypeScript | `noUncheckedIndexedAccess` not set — array subscripts return `T` not `T\|undefined` | all tsconfigs |
| TS-2 | B | TypeScript | `skipLibCheck: true` in all configs — engine→web `.d.ts` contract unchecked | all tsconfigs |
| TS-3 | B | TypeScript | No `extends` chain — 3 parallel tsconfigs, 3-place changes for shared options | all tsconfigs |
| TS-4 | B | TypeScript | `@engine/*` tsconfig vs `@engine` vitest alias shape mismatch — barrel import gap | engine tsconfig + vitest.config |
| TS-5 | C | TypeScript | `__tests__` excluded from `tsc` — type errors in test files only caught at runtime | engine tsconfig |
| AL-1 | A | Aliases | All subpath aliases work correctly for real usage patterns | — |
| AL-2 | B | Aliases | Web has no `vitest.config.ts` — no explicit `test.include`, relies on Vitest defaults | packages/web |
| AL-3 | B | Aliases | `@hex/engine` alias only in Vite config — resolved via workspace at tsc time, implicit | packages/web |
| SC-1 | A | Scripts | All CLAUDE.md-documented scripts present and correct | root package.json |
| SC-2 | B | Scripts | `test:e2e` undocumented, not in root `npm test` pipeline | packages/web/package.json |
| SC-3 | B | Scripts | `dev:all` is misleading alias for `dev:web` | root package.json |
| DEP-1 | B | Deps | No `engines` field — Node version unspecified | all package.json |
| DEP-2 | B | Deps | All non-compiler deps use `^` caret ranges — minor-version drift | all package.json |
| DEP-3 | B | Deps | Playwright browser binaries not installed by any script — `test:e2e` fails fresh clone | packages/web/package.json |
| DEP-4 | A | Deps | `typescript` tilde-pinned (`~5.8.0`) — correct and consistent | engine + web package.json |
| DEP-5 | A | Deps | `vitest` version consistent across packages | engine + web package.json |
| VITE-1 | B | Vite | No explicit `build.target` — ES2022 implied by tsconfig but Vite uses its own default | vite.config.ts |
| VITE-2 | B | Vite | `chunkSizeWarningLimit` raised to suppress rather than fix bloat | vite.config.ts |
| VITE-3 | B | Vite | No `build.sourcemap` — production debugging painful | vite.config.ts |
| VITE-4 | B | Vite | No `base` path — deployment subpath undocumented | vite.config.ts |
| PW-1 | B | Playwright | `reuseExistingServer: true` can mask CI failures | playwright.config.ts |
| PW-2 | B | Playwright | No `retries` — canvas timing makes E2E flaky | playwright.config.ts |
| PW-3 | B | Playwright | No persistent reporter configured | playwright.config.ts |
| PW-4 | B | Playwright | Single browser (Chromium) only | playwright.config.ts |
| HOOK-1 | B | Hooks | System name list in `check-edited-file.sh` hardcoded — new systems unprotected | check-edited-file.sh |
| HOOK-2 | B | Hooks | `date -r` mtime call in stop-nudge hook — MINGW64 reliance undocumented | stop-nudge-verify.sh |
| HOOK-3 | A | Hooks | `jq`/`node` fallback correctly implemented for Windows | check-edited-file.sh |
| GIT-1 | B | Git | `.claude/worktrees/` gitignored with no `.gitkeep` | .gitignore |
| GIT-2 | B | Git | Visual snapshot baseline strategy unaddressed in `.gitignore` | .gitignore |
| GIT-3 | B | Git | No `.npmrc` `save-exact` policy | repo root |

**C-class findings: 1** (TS-5 — test files excluded from tsc, type errors only caught at runtime)
**B-class findings: 23**
**A-class findings: 5**

No critical-class findings in the build/config surface. No dead scripts. No unused dependencies detected. The one C-class issue (TS-5) is low-blast-radius since Vitest catches runtime type mismatches, but it removes a compile-time safety net for test helpers that are shared across test files.
