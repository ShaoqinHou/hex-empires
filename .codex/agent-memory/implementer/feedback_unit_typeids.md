---
name: Unit type IDs in game data — verify before using in tests
description: Not all intuitive unit names exist as typeIds; always grep unit data files before assuming a typeId
type: feedback
---

When writing tests that use specific unit types (typeId), always check `packages/engine/src/data/units/*.ts` for valid IDs first.

**Why:** 'builder' doesn't exist in unit data — would be looked up as unknown, defaulting to 'military' category, bypassing civilian capture logic. The real civilian unit for land construction is 'merchant' (also civilian). 'missionary' exists in exploration-units but has category 'civilian', not 'religious'.

**How to apply:**
- Grep `packages/engine/src/data/units/` for `id:` to find valid typeIds
- Key civilian units (antiquity): settler, merchant, caravan
- Key civilian units (exploration): explorer, missionary  
- 'religious' category appears in UnitCategory type but no unit currently uses it
- When brief mentions 'builder', map to 'merchant' (same civilian class)
