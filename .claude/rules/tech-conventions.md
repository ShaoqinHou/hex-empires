# Tech Conventions

## TypeScript
- Strict mode, no `any` — use `unknown` + type narrowing
- Named exports only (no default exports)
- ESM only — `import`/`export`, no `require()`
- Use `readonly` for all state properties: `ReadonlyMap`, `ReadonlyArray`, `readonly` fields
- Use `as const` for literal arrays and objects in data files
- Use discriminated unions for actions and effects (not class hierarchies)

## Engine (packages/engine)
- ZERO browser dependencies — no DOM, no Canvas, no React
- Pure functions for systems — same input always produces same output
- Seeded RNG for all randomness — games must be deterministic/replayable
- Immutable state — never mutate, always return new objects
- Path alias: `@engine/*` -> `packages/engine/src/*`

## React (packages/web)
- React 19, functional components only
- Vite + Tailwind CSS v4
- Path alias: `@web/*` -> `packages/web/src/*`
- Canvas rendering via `requestAnimationFrame` — not React re-renders
- UI panels via React state/context — not canvas
- No `useEffect` for game state — use `GameProvider` dispatch pattern

## Canvas
- HTML5 Canvas 2D API (vanilla, no framework)
- Camera transforms via `ctx.translate()` + `ctx.scale()`
- Screen-to-hex coordinate conversion for input handling
- Animations are visual interpolations — state is already updated

## Tailwind v4
- CSS custom property tokens for all colors
- Never hardcode colors — use token references
- Design for a dark game UI aesthetic

## Testing
- Vitest for both packages
- Engine tests: pure function testing, no mocks needed
- Web tests: React Testing Library, JSDOM

## Shell Environment
- Windows MINGW64 — use forward slashes
- Use `python` not `python3`
- Use `node -e` for JSON parsing

## Ports
- Web: 5174 (avoid conflict with nexus on 5173)

## Git Conventions
- Branch naming: `feat/{system}-{description}`, `fix/{system}-{description}`
- Commit messages: imperative mood, reference system: `feat(combat): add ranged attack resolution`
