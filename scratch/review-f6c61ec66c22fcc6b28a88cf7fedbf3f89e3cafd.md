---
schema: review-report/v1
commit: f6c61ec66c22fcc6b28a88cf7fedbf3f89e3cafd
iteration: 1
reviewer: sonnet
timestamp: 2026-04-18T00:00:00Z
verdict: PASS
summary: { BLOCK: 0, WARN: 2, NOTE: 1 }
---

## Summary

This commit adds three Node.js workflow scripts (`validate-assets.mjs`, `asset-status.mjs`, `bulk-mark-source.mjs`) and registers them as `npm run` commands. All files are in `packages/web/scripts/` — outside engine source, UI panels, canvas, and test directories — so most rules do not apply. No engine purity, immutability, system independence, or UI pattern violations are present. Two warn-level correctness issues exist in the scripts themselves, plus one note on structural drift.

## Findings

### F-f8ad0fd7
- severity: warn
- file: packages/web/scripts/validate-assets.mjs
- line: 354
- rule: standards.md § "S-CONCRETE-ASSERTIONS" / validator logic correctness
- offender: `checkEntry(catName, key, { path, source: 'placeholder' })`
- message: Every entry is passed `source: 'placeholder'` regardless of its actual value in `registry.ts`, meaning the attribution check at lines 149-151 (`if (entry.source === 'commissioned' || entry.source === 'final') && !entry.attribution`) can never fire — commissioned/final assets without attribution will silently pass validation.
- suggested-fix: Read the actual `source` field from the static REGISTRY mirror (the mirror already tracks it in `asset-status.mjs`'s version) instead of hardcoding `'placeholder'`; or add `source` to the REGISTRY entries in `validate-assets.mjs` and pass it through to `checkEntry`.
- state: open

### F-219a1f56
- severity: warn
- file: packages/web/scripts/validate-assets.mjs
- line: 237
- rule: architecture.md § "Registry Pattern" (single source of truth)
- offender: `const REGISTRY = { leaders: { fallback: ..., entries: { augustus: '/assets/...' } } }` (full 12-category static mirror)
- message: `validate-assets.mjs` embeds a complete static mirror of `registry.ts` with a different shape than the one in `asset-status.mjs` (this one has `fallback:` keys and string paths; `asset-status.mjs` has `{ path, source }` objects without `fallback`). Two independent mirrors with divergent structures will silently drift from each other and from `registry.ts` when new assets are added.
- suggested-fix: Consolidate to a single shared manifest file (e.g. `scripts/registry-mirror.mjs`) that both scripts import, reducing the 3-copy desync surface to 1.
- state: open

### F-9ff7a357
- severity: note
- file: packages/web/scripts/asset-status.mjs
- line: 27
- rule: standards.md § "S-REGISTRY-PATTERN" (registry as single source of truth)
- offender: `augustus: { path: '/assets/images/leaders/augustus.webp', source: 'placeholder' }`
- message: `asset-status.mjs` hardcodes `source: 'placeholder'` for every entry in its own static mirror; after `bulk-mark-source.mjs` updates `registry.ts` to `'commissioned'` or `'ai-generated'`, the status table will still report all entries as `placeholder`, defeating its purpose.
- suggested-fix: Share the registry mirror with `validate-assets.mjs` (see F-219a1f56) and read `source` from it, so `bulk-mark-source` changes are reflected immediately in status output.
- state: open

## Cross-file findings

The three static mirrors (`validate-assets.mjs` REGISTRY, `asset-status.mjs` REGISTRY, and `registry.ts`) form a 3-way manual-sync hazard. `bulk-mark-source.mjs` updates only `registry.ts`; the two script mirrors never update automatically. If a new leader or civ is added to `registry.ts`, neither script will validate or report it until the mirrors are also hand-edited. This is structurally the same drift pattern the project's trap registry calls `registry-doc-desync`.
