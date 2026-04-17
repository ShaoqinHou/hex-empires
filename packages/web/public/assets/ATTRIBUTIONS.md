# Asset Attributions

All assets are tracked per-entry in `packages/web/src/assets/registry.ts`.
The `source` field on each entry carries the lifecycle status:

| Source      | Meaning                                              |
|-------------|------------------------------------------------------|
| placeholder | Hand-drawn SVG or generated stub; no external credit |
| ai-generated| AI-generated (Midjourney / Flux / etc.) — internal  |
| cc0         | CC0 public domain — no attribution required         |
| cc-by-3.0   | Creative Commons BY 3.0 — attribution required      |
| commissioned| Contracted artist/composer — full attribution below |
| final       | Final approved asset                                 |

---

## CC BY 3.0 sources

*No CC BY 3.0 assets currently in use. This section will be populated when
Game-icons.net icons are added.*

When adding a Game-icons.net icon, add an entry here:

```
- <Icon name> by <Author> — https://game-icons.net/... — CC BY 3.0
```

And set `source: 'cc0'` in registry.ts if the specific icon is CC0, or
`source: 'cc-by-3.0'` + `attribution: 'Author — game-icons.net — CC BY 3.0'`
if it carries the BY requirement.

---

## CC0 sources

*No CC0 external assets currently in use.*

Kenney.nl assets (when added):
```
- Kenney Assets — https://kenney.nl — CC0 1.0 Universal Public Domain Dedication
```

---

## Commissioned assets

*No commissioned assets yet. This section will be populated when the
commissioning budget opens.*

---

## AI-generated assets

*No AI-generated assets currently committed to the repo.*

AI-generated leader portraits (when added):
- Tool: Midjourney / Flux / SDXL
- Prompt direction: historical leader, painterly, warm earth tones
- Usage: internal placeholder only, will be replaced with commissioned art

---

## Audio

*No audio assets currently committed. Placeholder 1-second silence OGG
files are generated programmatically.*

CC0 music sources (when added):
- Free Music Archive (https://freemusicarchive.org) — CC0 tracks
- OpenGameArt (https://opengameart.org) — CC0 audio
