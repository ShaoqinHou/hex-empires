#!/usr/bin/env bash
# verify-retirements.sh — enumerate every retirement claim from audits and grep-check.
# Returns nonzero if ANY retirement target is still present.
#
# Usage: bash .codex/scripts/verify-retirements.sh
#
# Add to CI or run after every implementation wave.

set -u
cd "$(dirname "$0")/../.." || exit 1

# Accumulator
FAILURES=0
PASSES=0

# check "label" "grep pattern" "directory" [expected-count default 0]
check() {
    local label="$1"
    local pattern="$2"
    local dir="${3:-packages/engine/src}"
    local expected="${4:-0}"
    # Count matches (grep-count, tolerant of no matches)
    local actual
    actual=$(grep -rnE "$pattern" "$dir" 2>/dev/null | grep -v "__tests__\|\.test\.\|^\s*\*\|// @deprecated" | wc -l)
    actual=${actual// /}
    if [ "$actual" -le "$expected" ]; then
        echo "✅ PASS: $label — $actual matches (expected ≤$expected)"
        PASSES=$((PASSES + 1))
    else
        echo "❌ FAIL: $label — $actual matches (expected ≤$expected)"
        grep -rnE "$pattern" "$dir" 2>/dev/null | grep -v "__tests__\|\.test\.\|^\s*\*" | head -5 | sed 's/^/     /'
        FAILURES=$((FAILURES + 1))
    fi
}

echo "========================================"
echo "hex-empires retirement verification"
echo "========================================"
echo ""

echo "--- Units ---"
check "BUILDER unit retired (tile-improvements F-01)" "export const BUILDER:" packages/engine/src/data/units
check "build_improvement ability retired" "'build_improvement'" packages/engine/src

echo ""
echo "--- Governments ---"
check "CHIEFDOM retired (govt-policies F-02)" "export const CHIEFDOM|id: ['\"]chiefdom['\"]"
check "DEMOCRACY renamed to ELECTIVE_REPUBLIC" "export const DEMOCRACY|id: ['\"]democracy['\"]"
check "MONARCHY renamed to FEUDAL_MONARCHY" "export const MONARCHY\b|id: ['\"]monarchy['\"]"
check "MERCHANT_REPUBLIC renamed to PLUTOCRACY" "MERCHANT_REPUBLIC|merchant_republic"

echo ""
echo "--- Crises ---"
check "GOLDEN_AGE retired from crises (F-09)" "export const GOLDEN_AGE" packages/engine/src/data/crises
check "TRADE_OPPORTUNITY retired from crises (F-09)" "export const TRADE_OPPORTUNITY" packages/engine/src/data/crises

echo ""
echo "--- Victory ---"
check "Diplomacy victory type retired (VP F-07)" "'diplomacy'" packages/engine/src/systems/victorySystem.ts
check "checkDiplomacy function retired" "function checkDiplomacy|const checkDiplomacy" packages/engine/src

echo ""
echo "--- Improvements ---"
check "ROAD improvement retired (TI F-12)" "export const ROAD\b" packages/engine/src/data/improvements
check "ImprovementDef.cost (Builder charge) retired" "1 Builder charge|2 Builder charges" packages/engine/src/data/improvements

echo ""
echo "--- Actions ---"
check "BUILD_IMPROVEMENT action retired (W2-01)" "type: 'BUILD_IMPROVEMENT'" packages/engine/src/types
check "PLACE_DISTRICT action retired (W4-01)" "type: 'PLACE_DISTRICT'" packages/engine/src/types

echo ""
echo "--- YieldSet ---"
check "YieldSet.housing retired (YA F-01)" "readonly housing:" packages/engine/src/types
check "YieldSet.diplomacy retired (YA F-01)" "readonly diplomacy: number" packages/engine/src/types

echo ""
echo "--- Tech ---"
check "Astrology tech retired (tech-tree F-07)" "export const ASTROLOGY|id: ['\"]astrology['\"]" packages/engine/src/data/technologies
check "+5 ageProgress per tech (tech-tree F-11)" "ageProgress: player\.ageProgress \+ 5" packages/engine/src/systems/researchSystem.ts
check "Tech-loss dark-age (tech-tree F-12)" "lostTech|researchedTechs\.filter.*goldenDark" packages/engine/src/systems/ageSystem.ts

echo ""
echo "--- Leaders ---"
check "LeaderDef.compatibleAges retired (leaders F-10)" "compatibleAges:" packages/engine/src

echo ""
echo "--- Constants ---"
check "TRADE_ROUTE_DURATION constant retired (TR F-02)" "TRADE_ROUTE_DURATION" packages/engine/src

echo ""
echo "========================================"
echo "Summary: $PASSES passed, $FAILURES failed"
echo "========================================"

if [ "$FAILURES" -gt 0 ]; then
    echo ""
    echo "Failures above indicate retirement claims from audits that are NOT"
    echo "actually in the codebase. Fix by removing the flagged symbols."
    exit 1
fi
exit 0
