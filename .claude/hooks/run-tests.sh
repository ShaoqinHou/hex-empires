#!/bin/bash
# Run tests and write PASS/FAIL marker
# Usage:
#   bash .claude/hooks/run-tests.sh                    # Full suite
#   bash .claude/hooks/run-tests.sh --module engine    # Engine tests only
#   bash .claude/hooks/run-tests.sh --module web       # Web tests only

WORKFLOW_DIR=".claude/workflow"
MARKER="$WORKFLOW_DIR/test-result.txt"
mkdir -p "$WORKFLOW_DIR"

MODULE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --module)
      MODULE="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [ -n "$MODULE" ]; then
  echo "Running tests for: $MODULE"
  npm run test --workspace="packages/$MODULE" 2>&1
  EXIT_CODE=$?
else
  echo "Running full test suite..."
  npm test 2>&1
  EXIT_CODE=$?
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ $EXIT_CODE -eq 0 ]; then
  echo "PASS $TIMESTAMP" > "$MARKER"
  echo "Tests PASSED"
else
  echo "FAIL $TIMESTAMP" > "$MARKER"
  echo "Tests FAILED (exit code: $EXIT_CODE)"

  ISSUES_FILE="$WORKFLOW_DIR/issues.md"
  ENTRY="- [$TIMESTAMP] [test_failure] Tests failed (exit code: $EXIT_CODE)"

  LOCKDIR="$WORKFLOW_DIR/.issues.lockdir"
  if mkdir "$LOCKDIR" 2>/dev/null; then
    echo "$ENTRY" >> "$ISSUES_FILE"
    rmdir "$LOCKDIR"
  else
    sleep 0.5
    echo "$ENTRY" >> "$ISSUES_FILE"
  fi
fi

exit $EXIT_CODE
