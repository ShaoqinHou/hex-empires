# Civ VII Source and Version Gate

This project keeps a local GDD, but Civ VII has continued receiving patches.
For any parity claim, check whether the local target is intentionally frozen or
stale.

## Current Local Target

`.codex/gdd/commitment.md` currently names Firaxis patch `1.3.0`
(`2025-11-04`) as the target snapshot.

## Current Official Drift Check

Observed during Codex workflow conversion on `2026-05-01`:

- Official 2K/Firaxis game update notes list Update `1.3.2`.
- Official support notes include an April 16, 2026 patch for `1.3.2`.
- Official game update notes also mention a Mac hotfix on April 21, 2026 and a
  larger upcoming Test of Time update.

Treat this as a workflow warning, not an automatic spec change. The owner must
decide whether to re-target from `1.3.0` to a newer patch. Until then:

- Do not silently update mechanics to a newer patch.
- Do flag audits and GDD rows that rely on patch-sensitive constants.
- When browsing, prefer official 2K/Firaxis pages first, then Fandom Civ7 pages,
  then cross-reference sources.

## Audit Gate

Before using an audit to plan work:

1. Read the audit's `Version target`.
2. If it predates the current official notes, mark the audit as source-stale in
   your notes.
3. Check the current code path anyway; implementation may have moved since the
   audit.
4. Only update the audit/tracker after confirming the claim from source or from
   current code.

