# Tech Conventions

Only content UNIQUE to this doc — everything else is covered by other rule docs.

## TypeScript
- Strict mode, no `any` — use `unknown` + type narrowing
- Named exports only (no default exports)
- ESM only — `import`/`export`, no `require()`
- Use discriminated unions for actions and effects (not class hierarchies)

## Path Aliases
- `@engine/*` → `packages/engine/src/*`
- `@web/*` → `packages/web/src/*`
- `@hex/engine` → `packages/engine/src/index.ts` (barrel)

## Git Conventions
- Branch naming: `feat/{system}-{description}`, `fix/{system}-{description}`
- Commit messages: imperative mood, reference system: `feat(combat): add ranged attack resolution`

## Port
- Web: 5174 (avoid conflict with nexus on 5173)
