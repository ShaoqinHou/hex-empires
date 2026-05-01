# GPT Image 2 Asset Workflow

Status: paused. Keep this workflow as the retained design record, but do not
generate or integrate new asset files until the lead explicitly re-enables it.

This workflow covers visual game assets:
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

Sprite-production references:

- Blender orthographic projection keeps object scale independent of distance:
  https://docs.blender.org/manual/en/latest/editors/3dview/navigate/projections.html
- Clint Bellanger's isometric tile workflow uses an orthographic camera, a 2:1
  game-isometric projection, and 45-degree turntable steps for 8 directions:
  https://clintbellanger.net/articles/isometric_tiles/
- AoE2 modding workflows split sheets by angle/frame, adjust anchors, and fix
  angle sequence before export:
  https://forums.ageofempires.com/t/tutorial-workflow-for-converting-other-games-unit-sprite-into-aoe2/244845
- openage's SLP notes document frame hotspots, shadow/alpha data, and
  player-color draw commands in the Genie-engine sprite format:
  https://raw.githubusercontent.com/SFTtech/openage/master/doc/media/slp-files.md

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

## Camera Settings

Use these settings for unit and prop sprites unless a later style version
explicitly changes them:

- Projection: orthographic.
- Game view type: 2.5D isometric RTS sprite, with the board viewed from above
  and at an angle.
- Camera elevation: target 45 degrees above the ground plane. Acceptable range
  is 40-50 degrees for units; reject outputs that read like eye-level portraits
  or side-view character art.
- Camera yaw: fixed at 45 degrees relative to map axes for the sheet camera.
  Direction changes come from rotating the subject, not rotating the camera.
- Visual grid target: 2:1 game-isometric readability for the map plane. This is
  not strict engineering isometric; equal-axis 35.264-degree isometric is useful
  as a reference, but the game style should read closer to classic RTS terrain
  sprites.
- Orthographic scale: fixed across the whole asset class. A mounted unit should
  use the same apparent height and ground footprint across every direction.
- Ground anchor: the center between the mount's ground-contact feet, or the
  center between a walking unit's feet, is the bottom-center anchor for every
  direction.
- Lighting: fixed key direction and shadow shape for every direction. Do not let
  the model relight each view.

Prompt camera language:

```text
Fixed orthographic game camera, 45-degree elevation above the ground plane,
classic isometric RTS board view. The viewer sees the top planes of shoulders,
helmet, saddle, horse back, and packs. This must not look like an eye-level
portrait or side-scroller sprite. Rotate only the subject for each direction;
the camera, lighting, crop scale, and ground anchor stay fixed.
```

## Direction Standard

Asset generation must use a fixed orthographic camera and rotate the subject.
Do not describe the 8 directions as 8 separate camera views. That creates
inconsistent pose, scale, and equipment.

Direction standard:

- Camera: fixed for all unit directions.
- Turntable: subject yaw changes in 45-degree increments around its vertical
  axis; camera, focal length, scale, lighting, and crop do not change.

For prompts, use these direction names and pose descriptions exactly:

| Direction | Yaw from S/front | Screen motion | Required pose read |
|---|---:|---|---|
| S/front | 0 deg | Toward lower screen | Straight front view. Horse/rider face the viewer, chest centered, both sides nearly symmetrical, only a tiny 0-5 deg bias allowed for depth. |
| SW/front-left | 45 deg | Toward lower-left | Three-quarter front-left. Nose points lower-left, front and side both visible, rear trails upper-right. |
| W/profile-left | 90 deg | Toward screen-left | Clean left profile. Body is mostly side-on, nose points left, front/back overlap is minimal. |
| NW/rear-left | 135 deg | Toward upper-left | Three-quarter rear-left. Back/rump visible, head points upper-left, viewer sees rider's back and one flank. |
| N/back | 180 deg | Toward upper screen | Straight back view. Rider's back and horse tail centered, both sides nearly symmetrical, head mostly hidden. |
| NE/rear-right | 225 deg | Toward upper-right | Three-quarter rear-right. Mirror logic of NW unless the unit has intentional asymmetry. |
| E/profile-right | 270 deg | Toward screen-right | Clean right profile. Mirror logic of W unless the unit has intentional asymmetry. |
| SE/front-right | 315 deg | Toward lower-right | Three-quarter front-right. Mirror logic of SW unless the unit has intentional asymmetry. |

## Generation Strategy

Choose the generation mode before prompting and record it in the manifest.

| Mode | When to use | Risk |
|---|---|---|
| `8-authored-sheet` | Fast concept pass or symmetric/low-detail units where exact equipment side does not matter | May drift between cells |
| `5-source-plus-code-mirror` | Animals, terrain props, or units deliberately designed with no left/right handedness | Flips weapon hand, shield side, scabbard, badges, text, and faction details |
| `5-source-plus-ai-opposites` | Mostly symmetric unit where opposite directions should preserve design logic but need AI correction | Requires direct visual review of each opposite |
| `direction-by-direction-reference` | Default for asymmetric units, weapons, shields, banners, civ-specific gear, or production-quality units | Slower but most controllable |
| `3d-guide-plus-gpt-final` | Complex animation planning where a blockout helps maintain pose/camera | Final raster asset must still be generated by GPT Image 2 |

Mirroring policy:

- Do not code-mirror a unit that has a right-hand weapon, left-hand shield,
  scabbard side, readable emblem, writing, asymmetric armor, civ-specific
  equipment, or faction banner.
- If mirroring is used, the manifest must say which directions were mirrored
  and why the unit is left/right neutral.
- For most production units, generate or edit each direction from the same
  approved reference so handedness and equipment logic remain correct.
- A scout holding a spear is not a safe code-mirror candidate unless the spear
  is deliberately centered and no handedness is visible.

Reject a sheet if:

- S/front or N/back reads as a 3/4 profile instead of a centered view.
- W/E profiles are not close to side-on.
- Camera elevation is too low and the sprite reads like a portrait, side-view,
  or trading-card illustration instead of an overhead RTS board sprite.
- Directions are camera moves instead of subject yaw rotations.
- Equipment, pose, mount size, or lighting changes between cells.
- Mirroring changes handedness or equipment side for a unit where that matters.
- The cell order is ambiguous or not recorded in the manifest.

## Asset Direction Counts

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

The first pilot for a new unit class should be an idle villager or scout still
turntable: one neutral base image per direction, one aligned team color mask per
direction, and a manifest that records whether directions were fully authored or
mirrored.

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
| `direction_standard` | `unit-turntable-v1` or later |
| `authored_directions` | `5+mirror` or `8-authored` |
| `generation_mode` | Strategy from "Generation Strategy" |
| `mirroring_policy` | `none`, `code-mirror-approved`, or `ai-opposites-reviewed` |
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
- Fixed-camera turntable using the `unit-turntable-v1` direction standard.
- Directions: S/front, SW/front-left, W/profile-left, NW/rear-left, N/back,
  NE/rear-right, E/profile-right, SE/front-right.

Camera and style:
- Classic isometric RTS readability, painted sprite art.
- Orthographic camera fixed for every direction, 45-degree elevation above the
  ground plane.
- The viewer sees top planes of shoulders, helmet, packs, and feet placement;
  this must not look like an eye-level portrait or side-scroller sprite.
- Rotate the villager around a vertical axis in 45-degree yaw increments; do not
  move the camera between directions.
- Consistent scale across all directions, feet anchored bottom-center.
- Transparent background, soft contact shadow.

Team color plan:
- Neutral tunic and small shoulder cloth reserved for player color.
- Do not bake a player color into the base sprite.

Output constraints:
- One frame per direction.
- S/front and N/back are centered straight views; W/E are clean profiles.
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
