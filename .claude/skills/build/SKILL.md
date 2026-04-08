---
name: build
description: Quick reference for dev commands
user_invocable: true
---

# /build — Development Commands

## Start Dev Server
```bash
npm run dev:all          # Web on port 5174
npm run dev:web          # Web only
```

## URLs
- Web: http://localhost:5174

## Testing
```bash
npm test                                         # Full suite (engine + web)
npm run test:engine                              # Engine tests only
npm run test:web                                 # Web tests only
bash .claude/hooks/run-tests.sh                  # Full + marker
bash .claude/hooks/run-tests.sh --module engine  # Engine + marker
bash .claude/hooks/run-tests.sh --module web     # Web + marker
```

## Build
```bash
npm run build            # Build engine + web
```

## Platform Notes
- Windows MINGW64 — use forward slashes
- Use `python` not `python3`
- Web port: 5174 (avoids conflict with nexus on 5173)
