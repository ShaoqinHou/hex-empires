import { describe, it, expect } from 'vitest';
import {
  CELEBRATION_BONUS_DURATION_TURNS,
  BASE_POLICY_SLOTS_PER_AGE,
  DEFAULT_CODEX_SCIENCE_YIELD,
  CANONICAL_CODEX_SLOT_COUNTS,
} from '../../types/Government';
import type {
  GovernmentId,
  PolicyId,
  CodexId,
  PolicyCategory,
  PolicySlotCounts,
  GovernmentCelebrationBonus,
  GovernmentDef,
  PolicyDef,
  CodexUnlockSource,
  CodexDef,
  CodexPlacement,
  ActiveCelebrationBonus,
  GovernmentState,
  CodexInventoryState,
  GovernmentAction,
} from '../../types/Government';

/**
 * Compile-time shape tests for the Government type scaffolding
 * (cycle A). Each test constructs a minimum-valid literal of an
 * exported type, exercises each discriminant/branch where relevant,
 * and asserts property values. If a type shape changes (required
 * field added, discriminant renamed), these tests stop compiling —
 * that is the signal to bump downstream cycles.
 */
describe('Government types — compile-time shape tests', () => {
  it('GovernmentId / PolicyId / CodexId are string aliases usable as map keys', () => {
    const g: GovernmentId = 'classical-republic';
    const p: PolicyId = 'legion-tradition';
    const c: CodexId = 'codex.tech.writing';
    const m = new Map<GovernmentId, number>();
    m.set(g, 1);
    expect(m.get(g)).toBe(1);
    expect(p).toBe('legion-tradition');
    expect(c).toBe('codex.tech.writing');
  });

  it('PolicyCategory accepts the four rulebook categories', () => {
    const cats: ReadonlyArray<PolicyCategory> = [
      'military',
      'economic',
      'diplomatic',
      'wildcard',
    ];
    expect(cats).toHaveLength(4);
    expect(new Set(cats).size).toBe(4);
  });

  it('PolicySlotCounts has a single total wildcard count (W2-03 flat model)', () => {
    const counts: PolicySlotCounts = {
      total: 4,
    };
    expect(counts.total).toBe(4);
  });

  it('GovernmentCelebrationBonus carries id, name, effects', () => {
    const bonus: GovernmentCelebrationBonus = {
      id: 'culture-boom',
      name: 'Culture Boom',
      description: '+20% Culture for 10 turns.',
      effects: [
        {
          type: 'MODIFY_YIELD_PERCENT',
          target: 'empire',
          yield: 'culture',
          percent: 20,
        },
      ],
    };
    expect(bonus.id).toBe('culture-boom');
    expect(bonus.effects).toHaveLength(1);
  });

  it('GovernmentDef is a fixed-shape 2-option celebration bonus record', () => {
    const gov: GovernmentDef = {
      id: 'classical-republic',
      name: 'Classical Republic',
      age: 'antiquity',
      unlockCivic: 'code-of-laws',
      policySlots: {
        total: 2,
      },
      celebrationBonuses: [
        {
          id: 'culture-boom',
          name: 'Culture Boom',
          description: '+20% Culture',
          effects: [
            {
              type: 'MODIFY_YIELD_PERCENT',
              target: 'empire',
              yield: 'culture',
              percent: 20,
            },
          ],
        },
        {
          id: 'wonder-push',
          name: 'Wonder Push',
          description: '+15% Production toward Wonders',
          effects: [
            {
              type: 'MODIFY_PRODUCTION_PERCENT',
              target: { kind: 'itemType', itemType: 'wonder' },
              percent: 15,
            },
          ],
        },
      ],
      legacyBonus: {
        type: 'MODIFY_YIELD',
        target: 'city',
        yield: 'culture',
        value: 1,
      },
      description: 'City-state democracy; rewards Culture and Wonders.',
    };
    expect(gov.celebrationBonuses).toHaveLength(2);
    expect(gov.celebrationBonuses[0].id).toBe('culture-boom');
    expect(gov.celebrationBonuses[1].id).toBe('wonder-push');
    expect(gov.legacyBonus).not.toBeNull();
    // legacyBonus may be null for governments without a passive:
    const stark: GovernmentDef = { ...gov, id: 'despotism', legacyBonus: null };
    expect(stark.legacyBonus).toBeNull();
  });

  it('PolicyDef discriminates by category and supports either-prereq', () => {
    const civicGated: PolicyDef = {
      id: 'legion-tradition',
      name: 'Legion Tradition',
      category: 'military',
      age: 'antiquity',
      prerequisiteCivic: 'military-tradition',
      prerequisiteTech: null,
      effects: [{ type: 'MODIFY_COMBAT', target: 'melee', value: 2 }],
      description: '+2 Combat Strength to Melee units.',
    };
    const techGated: PolicyDef = {
      id: 'survey',
      name: 'Survey',
      category: 'economic',
      age: 'antiquity',
      prerequisiteCivic: null,
      prerequisiteTech: 'mining',
      effects: [
        { type: 'MODIFY_YIELD', target: 'tile', yield: 'production', value: 1 },
      ],
      description: '+1 Production per Mine.',
    };
    const ageless: PolicyDef = {
      ...civicGated,
      id: 'ancestor-worship',
      category: 'wildcard',
      age: 'all',
    };
    expect(civicGated.prerequisiteCivic).toBe('military-tradition');
    expect(techGated.prerequisiteTech).toBe('mining');
    expect(ageless.age).toBe('all');
  });

  it('CodexUnlockSource discriminates tech-mastery vs civic-mastery', () => {
    const fromTech: CodexUnlockSource = {
      type: 'tech-mastery',
      techId: 'writing',
    };
    const fromCivic: CodexUnlockSource = {
      type: 'civic-mastery',
      civicId: 'code-of-laws',
    };
    if (fromTech.type === 'tech-mastery') expect(fromTech.techId).toBe('writing');
    if (fromCivic.type === 'civic-mastery')
      expect(fromCivic.civicId).toBe('code-of-laws');
  });

  it('CodexDef and CodexPlacement compose a slotting record', () => {
    const def: CodexDef = {
      id: 'codex.tech.writing',
      name: 'Codex of Writing',
      unlockSource: { type: 'tech-mastery', techId: 'writing' },
      yields: {
        food: 0,
        production: 0,
        gold: 0,
        science: 1,
        culture: 0,
        faith: 0,
        influence: 0,
        happiness: 0,
      },
      description: 'Grants +1 Science per turn when slotted.',
    };
    const placement: CodexPlacement = {
      codexId: def.id,
      cityId: 'c-rome',
      buildingId: 'building.library',
      slotIndex: 0,
    };
    expect(def.unlockSource.type).toBe('tech-mastery');
    expect(placement.codexId).toBe(def.id);
    expect(placement.slotIndex).toBe(0);
  });

  it('GovernmentState supports null-gov startup and non-empty flat slot arrays (W2-03)', () => {
    const empty: GovernmentState = {
      playerId: 'p1',
      currentGovernmentId: null,
      slottedPolicies: [],
      unlockedPolicies: [],
      unlockedGovernments: [],
      bonusSlotCount: 0,
      activeCelebrationBonus: null,
    };
    expect(empty.currentGovernmentId).toBeNull();
    expect(empty.bonusSlotCount).toBe(0);

    const filled: GovernmentState = {
      playerId: 'p1',
      currentGovernmentId: 'classical-republic',
      slottedPolicies: ['survey', 'ancestor-worship'],
      unlockedPolicies: ['survey', 'ancestor-worship', 'legion-tradition'],
      unlockedGovernments: ['classical-republic', 'despotism'],
      bonusSlotCount: 2,
      activeCelebrationBonus: {
        governmentId: 'classical-republic',
        bonusId: 'culture-boom',
        turnsRemaining: 7,
        effects: [
          { type: 'MODIFY_YIELD_PERCENT', target: 'empire', yield: 'culture', percent: 20 },
        ],
      },
    };
    expect(filled.slottedPolicies[0]).toBe('survey');
    expect(filled.unlockedPolicies).toHaveLength(3);
    expect(filled.bonusSlotCount).toBe(2);
    expect(filled.activeCelebrationBonus?.turnsRemaining).toBe(7);
  });

  it('ActiveCelebrationBonus freezes governmentId at grant time', () => {
    const bonus: ActiveCelebrationBonus = {
      governmentId: 'classical-republic',
      bonusId: 'culture-boom',
      turnsRemaining: 10,
      effects: [],
    };
    expect(bonus.governmentId).toBe('classical-republic');
    expect(bonus.turnsRemaining).toBe(10);
  });

  it('CodexInventoryState tracks owned + placed + unplaced separately', () => {
    const inv: CodexInventoryState = {
      playerId: 'p1',
      ownedCodices: ['codex.tech.writing', 'codex.civic.code-of-laws'],
      placements: [
        {
          codexId: 'codex.tech.writing',
          cityId: 'c-rome',
          buildingId: 'building.library',
          slotIndex: 0,
        },
      ],
      unplacedCodices: ['codex.civic.code-of-laws'],
    };
    expect(inv.ownedCodices).toHaveLength(2);
    expect(inv.placements).toHaveLength(1);
    expect(inv.unplacedCodices).toEqual(['codex.civic.code-of-laws']);
  });

  it('GovernmentAction covers all seven government-scoped actions (W2-03 flat wildcard)', () => {
    const setGov: GovernmentAction = {
      type: 'SET_GOVERNMENT',
      playerId: 'p1',
      governmentId: 'classical-republic',
    };
    const slot: GovernmentAction = {
      type: 'SLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
      policyId: 'survey',
    };
    const unslot: GovernmentAction = {
      type: 'UNSLOT_POLICY',
      playerId: 'p1',
      slotIndex: 0,
    };
    const pick: GovernmentAction = {
      type: 'PICK_CELEBRATION_BONUS',
      playerId: 'p1',
      bonusId: 'culture-boom',
    };
    const place: GovernmentAction = {
      type: 'PLACE_CODEX',
      playerId: 'p1',
      codexId: 'codex.tech.writing',
      cityId: 'c-rome',
      buildingId: 'building.library',
      slotIndex: 0,
    };
    const unplace: GovernmentAction = {
      type: 'UNPLACE_CODEX',
      playerId: 'p1',
      codexId: 'codex.tech.writing',
    };
    const ideology: GovernmentAction = {
      type: 'SELECT_IDEOLOGY',
      playerId: 'p1',
      ideology: 'democracy',
    };

    const actions: ReadonlyArray<GovernmentAction> = [
      setGov,
      slot,
      unslot,
      pick,
      place,
      unplace,
      ideology,
    ];
    const kinds = new Set(actions.map((a) => a.type));
    expect(kinds.size).toBe(7);
  });

  it('exposes rulebook constants for celebration duration, slot floor, and codex yield', () => {
    expect(CELEBRATION_BONUS_DURATION_TURNS).toBe(10);
    expect(BASE_POLICY_SLOTS_PER_AGE).toBe(1);
    expect(DEFAULT_CODEX_SCIENCE_YIELD).toBe(1);
    expect(CANONICAL_CODEX_SLOT_COUNTS.library).toBe(2);
    expect(CANONICAL_CODEX_SLOT_COUNTS.academy).toBe(3);
    expect(CANONICAL_CODEX_SLOT_COUNTS.palace).toBe(4);
  });
});
