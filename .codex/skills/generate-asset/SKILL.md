---
name: generate-asset
description: Create traceable GPT Image 2 visual asset briefs, prompt templates, manifests, team-color mask plans, and validation steps for hex-empires. Use when Codex is asked to add, replace, plan, generate, or integrate game visual assets such as terrain tiles, unit/building sprites, UI artwork, icons, leader art, backgrounds, or animation frame sources.
---

# Generate Asset

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
4. Write a structured GPT Image 2 prompt with subject, camera/style, scale,
   team-color plan, and output constraints.
5. For units, start with a still pilot before animation. The default pilot is
   one idle villager with 8 directions and aligned team color masks.
6. Reject outputs with text, watermark, wrong camera angle, inconsistent scale,
   missing transparency, bad anchor point, or baked-in team color.
7. Run or record the relevant validation gate. Use
   `npm run assets:validate --workspace=packages/web` when files are integrated,
   and browser/Playwright checks for UI or canvas-visible assets.

## Delegation

Do not delegate visual direction, prompt design, source choice, or approval to
Spark. Spark can fill a manifest row or perform exact file moves only after the
lead has approved the asset set and supplied exact paths and validation commands.
