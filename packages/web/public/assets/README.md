# hex-empires assets — drop-in replacement guide

This directory contains all game assets served statically by Vite.
The structure mirrors the asset registry in `packages/web/src/assets/registry.ts`.

## How to replace a placeholder

### Leader portrait (WebP, 768x1024)

1. Prepare your file: `cwebp -q 85 your-file.png -o augustus.webp`
2. Drop it here: `images/leaders/augustus.webp`
3. Update registry entry `source` field: `'commissioned'`
4. Add `attribution: 'Artist Name'` to the registry entry
5. Run: `npm run assets:validate` from `packages/web/`

### Civ glyph (SVG, 256x256)

1. Optimise the SVG: `npx svgo rome.svg`
2. Drop it here: `images/civs/rome.svg`
3. Update registry entry

### Yield icon (SVG, 48x48)

1. Drop here: `images/icons/yields/gold.svg`
2. Update registry entry

### Background (WebP, 1920x1080 min)

1. Drop here: `images/backgrounds/setup-screen.webp`
2. Update registry entry

### Music track (OGG, loopable)

1. Convert if needed: `ffmpeg -i track.mp3 -c:a libvorbis -qscale:a 5 antiquity.ogg`
2. Drop here: `audio/music/antiquity.ogg`
3. Update registry entry

### SFX (OGG, short)

1. Drop here: `audio/sfx/ui/click.ogg`
2. Update registry entry

## Naming rules

| Category      | Pattern                    | Format |
|---------------|----------------------------|--------|
| Leaders       | `<leader-id>.webp`         | WebP   |
| Civs          | `<civ-id>.svg`             | SVG    |
| Icons (yields)| `<yield-type>.svg`         | SVG    |
| Backgrounds   | `<kebab-case-key>.webp`    | WebP   |
| Music         | `<kebab-case-key>.ogg`     | OGG    |
| SFX           | `<kebab-case-key>.ogg`     | OGG    |

IDs come from the engine data files:
- Leader IDs: `packages/engine/src/data/leaders/`
- Civ IDs: `packages/engine/src/data/civilizations/`
- Yield types: `packages/engine/src/types/Yields.ts`

## Fallback behaviour

If an asset file is missing, the game automatically uses the `_fallback-*`
file for that category. The game never crashes on a missing asset.
A `console.warn` appears in the browser dev tools when the fallback fires.

## Validation

```bash
cd packages/web
npm run assets:validate
```

Exits 0 if all registered assets exist and pass dimension/size checks.
Exits 1 if any errors are found. Run this before committing new assets.

## Attribution

See `ATTRIBUTIONS.md` in this directory for all third-party asset credits.
