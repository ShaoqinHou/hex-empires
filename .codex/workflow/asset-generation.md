# GPT Image 2 Asset Workflow

This is the live asset workflow for hex-empires. It covers visual game assets:
terrain tiles, unit sprites, buildings, UI artwork, icons when they are not
pure code-vector controls, leader/background art, and animation frame sources.

## Source Rule

New final visual assets must come from OpenAI GPT Image 2 through the official
`gpt-image-2` API model. User-facing shorthand like "ChatGPT Images 2.0" should
be recorded in workflow notes as `gpt-image-2` so assets are traceable.

Do not use stock art, web image search, copied commercial game art, or hand-made
one-off raster assets as final source material. Existing placeholders can remain
until replaced, but replacement assets must use this workflow.

Official references:

- https://developers.openai.com/api/docs/models/gpt-image-2
- https://developers.openai.com/api/docs/guides/image-generation
- https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide

## Lead Responsibilities

The lead owns asset direction, prompt design, final approval, and integration.
Spark is not the asset planner. A Spark worker can only do mechanical follow-up,
such as filling a manifest row or renaming generated files after the lead has
approved the asset set and supplied exact paths.

Before generation:

1. Read this file and `.codex/skills/generate-asset/SKILL.md`.
2. Decide the asset class: unit, building, terrain, UI artwork, icon, leader, or
   background.
3. Create or update an asset brief with the fields in "Manifest Fields".
4. Confirm the asset will not copy a specific commercial game asset.
5. Choose the validation gate: still pilot, mask check, sprite-sheet check, or
   UI/browser visual check.

## Visual Standard

Use Civilization VII parity for gameplay meaning, but use a consistent classic
isometric RTS readability target for sprite art. Age of Empires II is a useful
reference for camera angle, sprite readability, scale discipline, shadow shape,
and team-color treatment. Do not ask GPT Image 2 to reproduce a named Age of
Empires II unit, building, texture, icon, or exact art asset.

Global style invariants:

- Painted isometric strategy-game asset, not photorealistic.
- Three-quarter overhead camera, about 45 degrees horizontal rotation and
  30-35 degrees downward pitch for units and buildings.
- Clean silhouette at small size, readable at 64 px display height.
- Neutral daylight, soft contact shadow, no dramatic scene lighting.
- Transparent background for sprites and UI cutouts when supported by the model
  or post-processing step.
- No text, watermark, logo, signature, UI chrome, or decorative border inside
  the asset unless the asset itself is UI artwork.
- Feet or building base anchored to a consistent bottom-center registration
  point.

## View Angles

Use these defaults unless a renderer-specific reason overrides them:

| Asset type | Still pilot | Production directions | Notes |
|---|---:|---:|---|
| Terrain tile | 1 isometric top face | 1 plus variants | Keep hex footprint consistent |
| Resource/improvement | 1 isometric prop | 1 plus variants | Must sit inside terrain footprint |
| Building/district | 1 isometric view | 1 plus damage/age variants if needed | Larger than units; fixed footprint |
| Unit still | 8 directions | 8 directions | S, SW, W, NW, N, NE, E, SE |
| Unit animation | 8 directions | 8 directions per action | Built from the approved still set |
| UI icon | 1 front-readable view | 1 plus hover/disabled if needed | Prefer code-vector icons for controls |
| Leader/background | 1 composition | Per screen need | Must not be used as sprite source |

The first pilot for a new unit class should be an idle villager still set: eight
single-frame directions, one neutral base image per direction, and one aligned
team color mask per direction.

## Team Color Masks

Team color must be a separate mask, not baked into the base sprite. The base
sprite uses neutral cloth/banner regions. The mask is a same-size grayscale image
where white marks player-color regions and black marks everything else.

Required mask checks:

- Same canvas size and registration as the base sprite.
- White mask only on tunics, banners, shields, cloth trim, or other intended
  colorable regions.
- No mask on skin, weapons, shadows, terrain, or outlines.
- Tinted composite remains readable for dark and bright player colors.

## Manifest Fields

Every final or candidate asset set needs a traceable manifest entry. The
manifest can start as Markdown while the asset registry is still evolving, but it
must contain these fields:

| Field | Required content |
|---|---|
| `asset_id` | Stable ID matching registry naming |
| `asset_class` | unit, building, terrain, UI, icon, leader, background |
| `target_paths` | Intended files under `packages/web/public/assets` |
| `source_model` | `gpt-image-2` or snapshot such as `gpt-image-2-2026-04-21` |
| `prompt_version` | Versioned prompt name or hash |
| `input_refs` | Prior approved image IDs/files used for consistency |
| `style_version` | Project style bible version |
| `view_angles` | Direction list or single-view reason |
| `canvas_size` | Source and normalized output dimensions |
| `team_mask_paths` | Required for player-colorable sprites |
| `postprocess` | Crop, alpha cleanup, scale, palette, mask extraction |
| `validation` | Visual review, validator command, browser check if applicable |
| `approval` | Lead decision, date, reviewer |

## Still Pilot Prompt Template

Use a structured prompt and restate invariants on every iteration.

```text
Create a production game sprite sheet for hex-empires.

Subject:
- Antiquity civilian villager idle still, carrying simple hand tools.
- Eight directions: S, SW, W, NW, N, NE, E, SE.

Camera and style:
- Classic isometric RTS readability, painted sprite art.
- Three-quarter overhead camera, 30-35 degree downward pitch.
- Consistent scale across all directions, feet anchored bottom-center.
- Transparent background, soft contact shadow.

Team color plan:
- Neutral tunic and small shoulder cloth reserved for player color.
- Do not bake a player color into the base sprite.

Output constraints:
- One frame per direction.
- No text, labels, border, logo, watermark, or scenery.
- Clean silhouette readable at 64 px display height.
```

After the base sheet is approved, generate or edit an aligned mask sheet:

```text
Create a same-size grayscale team color mask for the approved villager sprite
sheet. White only on the tunic and shoulder cloth that should receive player
color. Black everywhere else, including skin, tools, shadows, outlines, and
background. Preserve exact sprite positions and canvas size.
```

## Animation Plan

Do not begin animation until the still pilot, team mask, and registration rules
pass review. Animation is image-frame work, not video generation.

Default frame targets:

| Action | Frames per direction | Notes |
|---|---:|---|
| Idle | 4-6 | Subtle breathing/tool shift |
| Walk | 8 | Loopable gait, stable feet registration |
| Work/build | 8-12 | Tool motion can extend within canvas |
| Attack | 6-10 | Only for combat units |
| Death/defeat | 8-12 | Usually no direction switch mid-animation |

Animation frames must keep the same direction order, canvas size, anchor point,
team mask layout, and style version as the approved still asset.

## Validation Gates

An asset workflow is not complete until the lead can show:

- Manifest entry exists and names `gpt-image-2`.
- Prompt and any input reference IDs/files are recorded.
- Still image passes visual scale, angle, silhouette, transparency, and no-text
  review.
- Team mask exists for any player-colorable sprite and aligns pixel-for-pixel.
- Asset files are registered through `packages/web/src/assets/registry.ts` when
  integration begins.
- `npm run assets:validate --workspace=packages/web` passes or known missing
  placeholders are explicitly accepted.
- UI/canvas assets get browser or Playwright visual verification under
  `.codex/workflow/e2e-standards.md`.
