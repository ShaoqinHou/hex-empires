#!/bin/bash
# PostToolUse hook for Edit/Write — checks import boundaries

# Claude Code delivers hook payloads via stdin, not as CLI args.
# Previous version used $1 which was always empty → entire hook was a no-op.
TOOL_INPUT=$(cat 2>/dev/null || echo "")

FILE_PATH=""
if command -v jq &>/dev/null; then
  FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(node -e "try{console.log(JSON.parse(process.argv[1]).file_path||'')}catch{console.log('')}" "$TOOL_INPUT" 2>/dev/null)
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

VIOLATIONS=""

# Check 1: Engine files importing from web (DOM, React, Canvas)
if [[ "$FILE_PATH" =~ packages/engine/ ]]; then
  if [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"].*(react|@web/|packages/web)" ; then
        VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: engine/ imports from web/ or React"
      fi
      if echo "$line" | grep -qE "(document\.|window\.|canvas|requestAnimationFrame)" ; then
        VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: engine/ uses browser/DOM API"
      fi
    done < "$FILE_PATH"
  fi
fi

# Check 2: Cross-system imports
if [[ "$FILE_PATH" =~ systems/ ]] && [[ ! "$FILE_PATH" =~ __tests__ ]]; then
  SYSTEM=$(basename "$FILE_PATH" .ts)
  if [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"]\./(turn|movement|combat|production|research|growth|diplomacy|resource|age|crisis|victory|effect|visibility|promotion|improvement|buildingPlacement|district|civic|specialist|trade|governor|fortify|ai|religion|government|urbanBuilding|commanderPromotion|resourceAssignment|wonderPlacement)System" ; then
        IMPORTED=$(echo "$line" | sed -n "s|.*from.*['\"]\.\/\([^'\"]*\).*|\1|p")
        if [ -n "$IMPORTED" ] && [ "$IMPORTED" != "$SYSTEM" ]; then
          VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: ${SYSTEM} imports from ${IMPORTED}"
        fi
      fi
    done < "$FILE_PATH"
  fi
fi

# Check 3: Data files importing from systems
if [[ "$FILE_PATH" =~ /data/ ]] && [[ ! "$FILE_PATH" =~ index\.ts ]] && [[ ! "$FILE_PATH" =~ __tests__ ]]; then
  if [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"].*(systems/|GameEngine|effects/Effect)" ; then
        VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: data file imports from systems/engine"
      fi
    done < "$FILE_PATH"
  fi
fi

# Check 4: Canvas importing from UI or vice versa
if [[ "$FILE_PATH" =~ canvas/ ]]; then
  if [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"].*/ui/" ; then
        VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: canvas/ imports from ui/"
      fi
    done < "$FILE_PATH"
  fi
fi
if [[ "$FILE_PATH" =~ ui/ ]]; then
  if [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"].*/canvas/" ; then
        VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: ui/ imports from canvas/"
      fi
    done < "$FILE_PATH"
  fi
fi

if [ -n "$VIOLATIONS" ]; then
  WORKFLOW_DIR=".claude/workflow"
  ISSUES_FILE="$WORKFLOW_DIR/issues.md"
  mkdir -p "$WORKFLOW_DIR"

  LOCKDIR="$WORKFLOW_DIR/.issues.lockdir"
  if mkdir "$LOCKDIR" 2>/dev/null; then
    echo "- [$(date -u +%Y-%m-%dT%H:%M:%SZ)] [import-boundary] ${VIOLATIONS}" >> "$ISSUES_FILE"
    rmdir "$LOCKDIR"
  else
    sleep 0.5
    echo "- [$(date -u +%Y-%m-%dT%H:%M:%SZ)] [import-boundary] ${VIOLATIONS}" >> "$ISSUES_FILE"
  fi

  cat <<EOF
{"additionalContext": "WARNING: Import boundary violation detected.\n${VIOLATIONS}\n\nRules:\n- engine/ CANNOT import from web/, React, or DOM APIs\n- systems/ CANNOT import from each other\n- data/ CANNOT import from systems/ or engine core\n- canvas/ and ui/ CANNOT import from each other\nSee .claude/rules/import-boundaries.md"}
EOF
fi

exit 0
