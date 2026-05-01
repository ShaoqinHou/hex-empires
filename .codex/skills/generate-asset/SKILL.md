---
name: generate-asset
description: Create traceable GPT Image 2 visual asset briefs, prompt templates, manifests, team-color mask plans, and validation steps for hex-empires. Use when Codex is asked to add, replace, plan, generate, or integrate game visual assets such as terrain tiles, unit/building sprites, UI artwork, icons, leader art, backgrounds, or animation frame sources.
---

# Generate Asset

Status: paused for this project. Do not generate or integrate asset files from
this skill until the lead explicitly re-enables the asset workflow. While
paused, this file is reference material only.

Use `.codex/workflow/asset-generation.md` as the authority. Keep this skill as
the short procedure for applying that workflow.

## Procedure

1. Read `.codex/workflow/asset-generation.md`.
2. Classify the asset: unit, building, terrain, UI artwork, icon, leader, or
   background.
3. Create or update a manifest entry before generation. Include `asset_id`,
   target paths, `source_model: gpt-image-2`, prompt version, input references,
   style version, view angles, canvas size, team mask paths, postprocess steps,
   validation, and approval status.
4. Select the generation mode before prompting: `8-authored-sheet`,
   `5-source-plus-code-mirror`, `5-source-plus-ai-opposites`,
   `direction-by-direction-reference`, or `3d-guide-plus-gpt-final`.
5. Write a structured GPT Image 2 prompt with subject, camera/style, scale,
   team-color plan, and output constraints.
6. For units, use the `unit-turntable-v1` direction standard: fixed
   orthographic camera at about 45-degree elevation above the ground plane,
   subject yaw rotated in 45-degree steps, explicit S/front, SW/front-left,
   W/profile-left, NW/rear-left, N/back, NE/rear-right, E/profile-right, and
   SE/front-right pose descriptions.
7. Treat code-mirroring as unsafe for handed weapons, shields, scabbards,
   banners, readable emblems, asymmetric armor, or civilization-specific gear.
   Use direction-by-direction reference generation for those units.
8. For units, start with a still pilot before animation. The default pilot is
   one idle unit with recorded generation mode and aligned team color masks.
9. Reject outputs with text, watermark, wrong camera angle, camera movement
   between directions, S/N not reading as straight front/back, W/E not reading
   as profiles, camera elevation too low, inconsistent scale, missing
   transparency, bad anchor point, unsafe mirroring, or baked-in team color.
10. Run or record the relevant validation gate. Use
   `npm run assets:validate --workspace=packages/web` when files are integrated,
   and browser/Playwright checks for UI or canvas-visible assets.

## Delegation

Do not delegate visual direction, prompt design, source choice, or approval to
Spark. Spark can fill a manifest row or perform exact file moves only after the
lead has approved the asset set and supplied exact paths and validation commands.
