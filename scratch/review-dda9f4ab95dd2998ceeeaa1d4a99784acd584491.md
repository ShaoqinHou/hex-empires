---
schema: review-report/v1
commit: dda9f4ab95dd2998ceeeaa1d4a99784acd584491
iteration: 1
reviewer: sonnet
timestamp: 2026-04-18T00:00:00Z
verdict: PASS
summary: { BLOCK: 0, WARN: 1, NOTE: 0 }
---

## Summary

Single-file commit wiring the gold `ResourcePill` in `TopBar.tsx` to the new asset pipeline via `getYieldIcon('gold')`. No engine files touched; no import-boundary, immutability, seeded-RNG, or panel/HUD violations. One accessibility inconsistency on the rendered `<img>` element warrants a fix before expanding this pattern to other resource pills.

## Findings

### F-a1b2c3d4
- severity: warn
- file: packages/web/src/ui/layout/TopBar.tsx
- line: 199
- rule: tech-conventions.md § "TypeScript" (correct, accessible markup); ui-overlays.md § "Game-Feel Invariants" (keyboard/AT discipline)
- offender: `<img src={iconSrc} alt={label} width={14} height={14} aria-hidden="true" />`
- message: `alt={label}` ("Gold") is a non-empty accessible name, but `aria-hidden="true"` simultaneously hides the element from assistive technology — the two attributes are contradictory; screen readers silently ignore both the image and its alt text, giving AT users no icon indication at all.
- suggested-fix: Use `alt=""` (empty string) to mark the icon as decorative when `aria-hidden="true"` is present, since the label text and `title` tooltip on the parent `<div>` already convey the resource name — or remove `aria-hidden` and keep `alt={label}` so screen readers read it once.
- state: open

## Cross-file findings

None.
