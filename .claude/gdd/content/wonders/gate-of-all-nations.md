# Gate of All Nations - Civ VII

**Slug:** gate-of-all-nations
**Category:** wonder
**Age:** ageless
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

## Sources

- https://civ7.wiki.fextralife.com/Gate_of_All_Nations_-_Antiquity_Wonder - Fextralife

## Identity

- Historical period: Achaemenid Persia, c. 486-465 BCE. The Gate of All Nations (Xerxes Gate) at Persepolis was the ceremonial entrance greeting foreign delegations to the Persian royal capital.
- Flavor: Imperial Persian gateway symbolizing dominion over all peoples. Firaxis associates with Persia in Antiquity.

## Stats / numeric attributes

- Cost: 275 Production
- Effect: +2 War Support on all wars [source-conflict: see Notes]
- Prerequisite: Discipline + Satrapies civics
- Placement: Adjacent to a District
- Obsoletes: No (Ageless)

## Unique effects (structured)

effects:
  - type: MODIFY_COMBAT
    target: all
    stat: war-support
    value: +2
    condition: at-war

## Notes / uncertainty

[source-conflict] Fextralife lists +2 War Support; patch notes (August 2025) reference the wonder giving +4. The +4 may be post-adjacency total or the corrected post-patch value. Using +2 as base wonder effect; recommend verification.

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._
