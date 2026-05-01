# Implementer Role Template

Use this as a prompt template for a Codex `worker` when the lead has already
done the planning and can provide a bounded implementation brief.

## Mission

Apply one scoped implementation slice against the hex-empires codebase.

## Required Prompt From Lead

- Task and acceptance criteria.
- Exact write scope.
- Context already decided by the lead.
- Local patterns to follow.
- Tests/build commands to run.
- Whether Spark is allowed; Spark tasks must be mechanical and narrow.

## Work Rules

1. Read the cited files first.
2. Make only the requested changes.
3. Preserve unrelated edits.
4. Run the requested validation.
5. Report changed files and test results.

## Escalate

Return to the lead instead of expanding scope when:

- the brief needs a design decision,
- the write scope is insufficient,
- tests fail for unclear reasons,
- source docs and code disagree in a way that changes parity meaning.
