---
title: Asset pipeline — replacement-friendly architecture
purpose: Make placeholder assets trivial to swap for final versions. Drop-in replacement, no code changes.
created: 2026-04-17
depends_on: Phase 1 of 08-master-plan.md
---

# Asset pipeline

## The problem

We'll ship with placeholder assets (AI-generated leader portraits, CC0 music, silhouette civ glyphs). Later, we'll commission or curate final assets. If final-asset-swap requires hunting through code for file paths, the upgrade is a refactor. That's bad. Swap should be: drop new file → save → see it in the game.

## Design goals

1. **Drop-in replacement.** New portrait → put file in the right directory with the right name → it appears in-game on next load.
2. **No code changes** for asset swaps (except when the asset CATEGORY changes, like "we now have cutscene animations").
3. **Artist-friendly.** A collaborator who's not a programmer can see the directory structure, understand the naming, replace files.
4. **Validation catches mistakes.** Missing assets, wrong dimensions, oversized files → surfaced at build time or via a script.
5. **Progressive enhancement.** Game still runs if final asset is missing (falls back to placeholder or a basic shape).
6. **Versioned audit trail.** Know which assets are placeholder / commissioned / final; track attribution where needed.

## Architecture

### Directory layout

```
packages/web/public/assets/         ← served statically by Vite
├── images/
│   ├── leaders/                    ← 9 portraits
│   │   ├── augustus.webp
│   │   ├── cleopatra.webp
│   │   ├── pericles.webp
│   │   ├── cyrus.webp
│   │   ├── gandhi.webp
│   │   ├── qin-shi-huang.webp
│   │   ├── alexander.webp
│   │   ├── hatshepsut.webp
│   │   └── genghis-khan.webp
│   ├── civs/                       ← civ glyphs/banners
│   │   ├── rome.svg
│   │   ├── egypt.svg
│   │   └── ...
│   ├── icons/
│   │   ├── yields/                 ← 🌾🔨💰🔬🎭⛪🤝 equivalents
│   │   │   ├── food.svg
│   │   │   ├── production.svg
│   │   │   ├── gold.svg
│   │   │   ├── science.svg
│   │   │   ├── culture.svg
│   │   │   ├── faith.svg
│   │   │   └── influence.svg
│   │   ├── actions/                ← per unit/game action
│   │   │   ├── found-city.svg
│   │   │   ├── fortify.svg
│   │   │   ├── attack.svg
│   │   │   ├── build-improvement.svg
│   │   │   └── ...
│   │   ├── categories/             ← panel / system icons
│   │   │   ├── tech.svg
│   │   │   ├── civics.svg
│   │   │   ├── religion.svg
│   │   │   ├── government.svg
│   │   │   ├── diplomacy.svg
│   │   │   ├── commanders.svg
│   │   │   ├── governors.svg
│   │   │   ├── trade.svg
│   │   │   ├── achievements.svg
│   │   │   └── ...
│   │   └── states/                 ← locked/unlocked/selected/etc.
│   │       ├── locked.svg
│   │       ├── researching.svg
│   │       └── ...
│   └── backgrounds/
│       ├── setup-screen.webp       ← splash art for setup
│       ├── age-antiquity.webp      ← era transition art
│       ├── age-exploration.webp
│       ├── age-modern.webp
│       ├── victory.webp
│       └── crisis/
│           ├── plague.webp
│           ├── barbarian-invasion.webp
│           ├── natural-disaster.webp
│           ├── golden-age.webp
│           └── trade-opportunity.webp
└── audio/
    ├── music/
    │   ├── antiquity.ogg
    │   ├── exploration.ogg
    │   ├── modern.ogg
    │   ├── combat.ogg
    │   └── victory.ogg
    └── sfx/
        ├── ui/
        │   ├── click.ogg
        │   ├── hover.ogg
        │   ├── open-panel.ogg
        │   ├── close-panel.ogg
        │   └── error.ogg
        ├── unit/
        │   ├── move.ogg
        │   ├── attack.ogg
        │   ├── death.ogg
        │   └── fortify.ogg
        ├── city/
        │   ├── founded.ogg
        │   ├── grown.ogg
        │   ├── built.ogg
        │   └── captured.ogg
        └── moment/
            ├── age-transition.ogg
            ├── tech-complete.ogg
            ├── civic-complete.ogg
            ├── wonder-complete.ogg
            ├── crisis-warning.ogg
            └── victory-fanfare.ogg
```

### File naming convention (strict)

| Asset type | Format | Extension | Naming rule |
|---|---|---|---|
| Leader portraits | WebP | `.webp` | `<leader-id>.webp` (from engine `LeaderId`) |
| Civ glyphs | SVG | `.svg` | `<civ-id>.svg` (from engine `CivilizationId`) |
| Icons | SVG | `.svg` | `<kebab-case-logical-name>.svg` |
| Backgrounds | WebP | `.webp` | `<kebab-case-logical-name>.webp` |
| Music | OGG Vorbis | `.ogg` | `<kebab-case-logical-name>.ogg` |
| SFX | OGG Vorbis | `.ogg` | `<kebab-case-logical-name>.ogg` |

**Why these formats:**
- **WebP** for photography/portraits: best compression/quality ratio, supported by all modern browsers
- **SVG** for icons/glyphs: scales to any size, tiny file
- **OGG Vorbis** for audio: open standard, broad browser support, better than MP3 at low bitrates

### Dimension expectations

| Asset | Min | Target | Max | Note |
|---|---|---|---|---|
| Leader portrait | 512×768 | 768×1024 | 1024×1536 | 3:4 aspect, plenty of headroom |
| Civ glyph | 128×128 | 256×256 | 512×512 | Square, SVG scalable (exporter constraint) |
| Icon (yields/actions/categories) | 24×24 | 48×48 | 96×96 | Square, SVG scalable |
| Icon (states) | 16×16 | 24×24 | 48×48 | Small, SVG scalable |
| Background (setup/age/victory) | 1920×1080 | 2560×1440 | 3840×2160 | 16:9 minimum |
| Background (crisis) | 1280×720 | 1920×1080 | 2560×1440 | 16:9 |
| Music | 1-2 min loopable | 2-3 min loopable | 5 min | stereo, 128-192kbps |
| SFX | 50ms | 200-1000ms | 3s | mono, 96-128kbps |

Validator enforces min/max; target is guidance.

---

## Asset registry (code)

**Location:** `packages/web/src/assets/registry.ts`

Single source of truth mapping logical names → file paths + metadata.

```typescript
// packages/web/src/assets/registry.ts
import type { LeaderId, CivilizationId, YieldType } from '@hex/engine';

export type AssetSource = 'placeholder' | 'commissioned' | 'final' | 'cc0' | 'ai-generated';

export interface AssetRef {
  readonly path: string;           // URL path (/assets/...)
  readonly source: AssetSource;    // lifecycle marker
  readonly attribution?: string;   // artist/composer credit
  readonly dimensions?: readonly [number, number]; // for images
  readonly duration?: number;      // for audio, seconds
}

export interface AssetCategoryRef {
  readonly entries: ReadonlyMap<string, AssetRef>;
  readonly fallback: AssetRef;  // used when a specific entry is missing
}

// Leader portraits — keyed by LeaderId
export const LEADER_PORTRAITS: AssetCategoryRef = {
  entries: new Map([
    ['augustus',       { path: '/assets/images/leaders/augustus.webp',       source: 'ai-generated', dimensions: [768, 1024] }],
    ['cleopatra',      { path: '/assets/images/leaders/cleopatra.webp',      source: 'ai-generated', dimensions: [768, 1024] }],
    ['pericles',       { path: '/assets/images/leaders/pericles.webp',       source: 'ai-generated', dimensions: [768, 1024] }],
    ['cyrus',          { path: '/assets/images/leaders/cyrus.webp',          source: 'ai-generated', dimensions: [768, 1024] }],
    ['gandhi',         { path: '/assets/images/leaders/gandhi.webp',         source: 'ai-generated', dimensions: [768, 1024] }],
    ['qin-shi-huang',  { path: '/assets/images/leaders/qin-shi-huang.webp',  source: 'ai-generated', dimensions: [768, 1024] }],
    ['alexander',      { path: '/assets/images/leaders/alexander.webp',      source: 'ai-generated', dimensions: [768, 1024] }],
    ['hatshepsut',     { path: '/assets/images/leaders/hatshepsut.webp',     source: 'ai-generated', dimensions: [768, 1024] }],
    ['genghis-khan',   { path: '/assets/images/leaders/genghis-khan.webp',   source: 'ai-generated', dimensions: [768, 1024] }],
  ]),
  fallback: { path: '/assets/images/leaders/_fallback-silhouette.webp', source: 'placeholder' },
};

// Yield icons — keyed by YieldType
export const YIELD_ICONS: AssetCategoryRef = {
  entries: new Map([
    ['food',       { path: '/assets/images/icons/yields/food.svg',       source: 'placeholder' }],
    ['production', { path: '/assets/images/icons/yields/production.svg', source: 'placeholder' }],
    ['gold',       { path: '/assets/images/icons/yields/gold.svg',       source: 'placeholder' }],
    ['science',    { path: '/assets/images/icons/yields/science.svg',    source: 'placeholder' }],
    ['culture',    { path: '/assets/images/icons/yields/culture.svg',    source: 'placeholder' }],
    ['faith',      { path: '/assets/images/icons/yields/faith.svg',      source: 'placeholder' }],
    ['influence',  { path: '/assets/images/icons/yields/influence.svg',  source: 'placeholder' }],
  ]),
  fallback: { path: '/assets/images/icons/yields/_fallback-circle.svg', source: 'placeholder' },
};

// ... analogous blocks for CIV_GLYPHS, CATEGORY_ICONS, ACTION_ICONS, STATE_ICONS,
//     BACKGROUNDS, MUSIC_TRACKS, SFX_UI, SFX_UNIT, SFX_CITY, SFX_MOMENT
```

### Loader (code)

**Location:** `packages/web/src/assets/loader.ts`

```typescript
export function resolveAsset(category: AssetCategoryRef, key: string): AssetRef {
  return category.entries.get(key) ?? category.fallback;
}

export function getLeaderPortrait(leaderId: LeaderId): string {
  return resolveAsset(LEADER_PORTRAITS, leaderId).path;
}

export function getYieldIcon(yieldType: YieldType): string {
  return resolveAsset(YIELD_ICONS, yieldType).path;
}

// ... analogous getters per category
```

### Usage in components

```tsx
import { getLeaderPortrait } from '@web/assets/loader';

<img src={getLeaderPortrait(leader.id)} alt={leader.name} />
```

**Never** `<img src="/assets/images/leaders/augustus.webp" />` — always through the loader. If someone needs a hardcoded path, it's a sign the registry is missing something.

---

## Replacement guide

### Scenario 1 — Replace one placeholder leader portrait

**You want to swap AI-generated Augustus for a commissioned portrait.**

1. Receive the new file from the artist (any format: PNG, JPG, PSD, etc.)
2. Convert to WebP if needed:
   ```bash
   cwebp -q 85 augustus-final.png -o packages/web/public/assets/images/leaders/augustus.webp
   ```
3. Verify dimensions (target: 768×1024, min: 512×768, max: 1024×1536):
   ```bash
   identify packages/web/public/assets/images/leaders/augustus.webp
   ```
4. Update `packages/web/src/assets/registry.ts` — change the `source` field:
   ```typescript
   ['augustus', { path: '...', source: 'commissioned', attribution: 'Artist Name', dimensions: [768, 1024] }],
   ```
5. Run the validator:
   ```bash
   npm run assets:validate
   ```
6. Hot-reload the dev server. The portrait appears in Setup + Diplomacy.

Time: ~3 minutes. Zero code changes beyond the one metadata field.

### Scenario 2 — Replace one placeholder icon

Same flow, but with SVG source file. If the SVG is hand-drawn: just drop it in place. If it's exported from Illustrator/Figma: run `svgo` first to strip metadata.

```bash
svgo packages/web/public/assets/images/icons/yields/food.svg
```

### Scenario 3 — Replace the entire icon set at once

When you commission a full icon set from one artist:

1. Receive ZIP of SVGs named per the registry's canonical names (share the `registry.ts` file with the artist as spec)
2. Unzip directly into `packages/web/public/assets/images/icons/`
3. `svgo -rf packages/web/public/assets/images/icons/`
4. Bulk-update registry `source` fields:
   ```bash
   npm run assets:bulk-mark-source --category=icons --source=commissioned --attribution="Artist Name"
   ```
5. `npm run assets:validate`

Time: ~10 minutes for a 30-icon batch.

### Scenario 4 — Swap music track

**You want to replace a CC0 placeholder with a commissioned era theme.**

1. Receive OGG file from composer (or MP3 → convert with `ffmpeg -i input.mp3 -c:a libvorbis -qscale:a 5 output.ogg`)
2. Verify loopable (the last sample should seamlessly match the first; if not, the composer needs to fix)
3. Drop into `packages/web/public/assets/audio/music/antiquity.ogg` (overwrite)
4. Update registry `source` to `'commissioned'`, add `attribution`
5. `npm run assets:validate`

MusicManager hot-reloads automatically.

### Scenario 5 — Add a new asset (not replacement)

E.g. commissioning a Byzantine civ banner we didn't have before:

1. Add the new file: `packages/web/public/assets/images/civs/byzantium.svg`
2. Add registry entry in `CIV_GLYPHS.entries`
3. Add the new civ to the engine's civ data (separate concern)
4. `npm run assets:validate`

### Scenario 6 — Asset is missing / broken

Game falls back to `_fallback-silhouette.webp` (or the category's fallback asset) automatically. The validator surfaces the miss as a warning at build time but the game keeps running. No crash, no white squares.

---

## Validator script

**Location:** `packages/web/scripts/validate-assets.mjs`

Invoked as `npm run assets:validate`. Checks:

### For every registry entry

- File exists at the declared `path`
- File size is under 5MB (images) or 15MB (music) — warns if larger
- For images: dimensions within min/max for the category (uses `sharp` or `image-size`)
- For audio: duration within min/max, bitrate reasonable (uses `music-metadata`)
- For SVG: passes `svgo` without errors (optional); no embedded raster if declared SVG

### For the registry itself

- Every key in every category is referenced by the engine data (e.g., every `LeaderId` from engine has a portrait entry)
- No duplicate paths across categories
- Fallback path exists for every category
- All `source: 'commissioned' | 'final'` entries have `attribution`

### Output

Exit 0 on all-green, nonzero on errors. Warnings don't fail the build but print.

```
✓ 9/9 leader portraits present
✓ 7/7 yield icons present
⚠ 3/40 action icons use fallback (missing: build-wonder, declare-war, propose-peace)
✗ MUSIC: antiquity.ogg is 18MB (max 15MB)

1 error, 1 warning.
```

### CI integration

Add `npm run assets:validate` to the CI pipeline (the same one that runs tests). A PR that adds a registry entry without the corresponding file fails CI loudly.

---

## Streamlined batch workflows

### `npm run assets:replace <category> <key> <source-file>`

```bash
# Example
npm run assets:replace leaders augustus ~/Downloads/augustus-commissioned.png
```

What it does:
1. Detect source-file format; convert to target format if needed (PNG → WebP, MP3 → OGG)
2. Resize if outside target dimensions (with warning)
3. Copy to the correct path with the correct name
4. Update registry `source` field (prompts for attribution if not provided)
5. Run validator
6. Report: `✓ augustus replaced (commissioned)`. 1 leader portrait is now final.

### `npm run assets:status`

Shows a table of all registry entries and their sources:

```
CATEGORY          TOTAL  PLACEHOLDER  AI-GEN  COMMISSIONED  FINAL  FALLBACK
leaders              9            0       6             2      1        0
civs                12            9       0             3      0        0
icons/yields         7            7       0             0      0        0
icons/actions       40           35       0             5      0        0
...
music                5            5       0             0      0        0
```

Tells you at-a-glance how much of the upgrade you've completed.

### `npm run assets:bulk-mark-source`

For batch commissions (an artist delivers 30 icons at once):
```bash
npm run assets:bulk-mark-source --category=icons/yields --source=commissioned --attribution="Artist Name"
```
Updates all entries in the category to the specified source + attribution.

---

## What to hand an artist / composer

When commissioning work, give the collaborator:

1. **A copy of `registry.ts`** (just the category they're working on) — this is the canonical spec for names + dimensions + formats
2. **The reference link** to this doc (`09-asset-pipeline.md`)
3. **A naming checklist** — e.g., "deliver 9 WebP files named per `LEADER_PORTRAITS.entries` keys, 768×1024 each, on transparent or neutral background"
4. **Style reference** — sample images from the target aesthetic (the P11 "modern Civ VII" look from philosophy doc)

They drop files in `packages/web/public/assets/images/leaders/` → you run the validator → done.

---

## What NOT to do

- **Don't hardcode asset paths in components.** Always through `loader.ts`.
- **Don't put assets in `src/`** — they go in `public/assets/` (Vite serves them without hashing; paths are stable).
- **Don't commit 50MB PSD source files.** Source files belong in a separate art repo or external storage; only the exported/compressed game-ready version goes in the web repo.
- **Don't introduce per-component loading logic.** If a panel needs 10 icons, it calls the loader 10 times; no fetch/caching shortcuts in the panel.
- **Don't skip attribution.** Even AI-generated and CC0 assets deserve a line in the registry (`source: 'cc0'`, `attribution: 'Kenney Assets — CC0'`). Becomes a LICENSES page later.

---

## Implementation in Phase 1

Add as **Phase 1.6 — Asset pipeline** (parallel to Phases 1, 1.5):

### 1.6.1 Registry + loader code (1 day)

Write `registry.ts` + `loader.ts` + getters. Start with placeholder entries for every category; files don't have to exist yet (fallback kicks in).

### 1.6.2 Fallback assets (0.5 day)

Create the fallback `_fallback-*` files: a silhouette portrait, a circle icon, a generic glyph, a silent 1-second OGG. Ships with the game forever.

### 1.6.3 Validator script (1 day)

Node script with `image-size` + `music-metadata` + basic checks. Wire to `npm run assets:validate`. Add to CI.

### 1.6.4 Batch workflow scripts (1 day)

`assets:replace`, `assets:status`, `assets:bulk-mark-source` — all as Node scripts.

### 1.6.5 Seed placeholders (1-2 days, optional but recommended)

Generate AI-gen leader portraits (9 × 30 seconds via Midjourney/Flux), export yield icons via Figma/Illustrator (~7 × 2 minutes), dump in the correct paths, run validator.

### Phase 1.6 deliverable

- Assets directory laid out per spec
- Every category has placeholder / fallback
- Validator passes clean
- One example of each category (leader, civ, icon, bg, music, sfx) actually renders in the game (even as ugly fallback)
- Replacement workflow documented + scripts working

### Effort total: ~1 week of one dev

Ships alongside Phases 1 and 1.5. By end of Week 4, the pipeline is production-ready for whenever final assets arrive.

---

## Decision tie-in with the 8 decisions

This pipeline directly supports decisions 1, 2, and 5:
- **Decision 1 (art)**: placeholder → ai-generated → commissioned lifecycle tracked per-entry
- **Decision 2 (sound)**: CC0 → commissioned lifecycle tracked per-entry
- **Decision 5 (music)**: placeholder tracks swap for commissioned OST with no code changes
- **Decision 3 (Achievements)**: if finished in Phase 6, its icon just drops into `icons/categories/achievements.svg`

When the commissioning budget opens up (decisions 1, 2), the pipeline is ready. No retrofit needed.
