---
name: verify
description: End-to-end browser verification for the game canvas and UI via chrome-devtools MCP. TRIGGER WHEN you've finished a UI or canvas change and want to confirm it renders without errors, OR the user says "verify" / "check in the browser" / "run verify", OR a Stop hook nudges about verification being stale. Writes a marker file so the stop hook knows verify was run. DO NOT TRIGGER for pure engine changes with no UI effect.
user_invocable: true
---

# /verify — E2E Browser Verification

## Prerequisites
- Web dev server running on port 5174
- Chrome connected via chrome-devtools MCP

## Verification Layers

### 1. Visual (Canvas renders)
- Navigate to http://localhost:5174
- Take snapshot — hex grid visible, terrain colors distinct
- UI elements present (TopBar, BottomBar if implemented)

### 2. Behavioral (Interactions work)
- Click on hex tile → verify selection highlight or state change
- Click on unit → verify action panel appears
- Click end turn → verify turn counter increments
- Open panel (tech tree, city) → verify correct data displayed
- Close panel → verify it dismisses

### 3. Game Logic (State correct)
- Verify turn counter matches expected value
- Move unit → verify it appears at correct hex position
- Found city → verify city appears, settler disappears
- Research tech → verify progress updates

### 4. Error States
- Check console for errors: `list_console_messages`
- Verify invalid actions are rejected (move to impassable, attack ally)
- No JavaScript errors during normal gameplay

### 5. Write Marker
On pass:
```bash
echo "PASS $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .codex/workflow/verify-marker.txt
```

## Failure Protocol
1. Screenshot: `take_screenshot`
2. Report what failed
3. Do NOT write verify-marker
