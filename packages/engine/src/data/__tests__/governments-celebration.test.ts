/**
 * Government celebration bonus validation (DD3.2)
 *
 * Verifies that every GovernmentDef in ALL_GOVERNMENTS has non-empty
 * celebrationBonuses (two options, each with a non-empty id, name, and
 * description) and that the overall dataset provides meaningful bonus
 * coverage across the full government roster.
 */
import { describe, it, expect } from 'vitest';
import { ALL_GOVERNMENTS } from '../governments/governments';

describe('ALL_GOVERNMENTS — celebrationBonuses (DD3.2)', () => {
  it('every government has exactly 2 celebration bonus options', () => {
    for (const g of ALL_GOVERNMENTS) {
      expect(
        g.celebrationBonuses,
        `${g.id} must have celebrationBonuses`,
      ).toBeDefined();
      expect(
        g.celebrationBonuses.length,
        `${g.id} must have exactly 2 celebration bonus options`,
      ).toBe(2);
    }
  });

  it('every celebration bonus option has a non-empty id', () => {
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        expect(
          typeof bonus.id === 'string' && bonus.id.length > 0,
          `${g.id} has a bonus with empty id`,
        ).toBe(true);
      }
    }
  });

  it('every celebration bonus option has a non-empty name', () => {
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        expect(
          typeof bonus.name === 'string' && bonus.name.length > 0,
          `${g.id} bonus "${bonus.id}" has empty name`,
        ).toBe(true);
      }
    }
  });

  it('every celebration bonus option has a non-empty description', () => {
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        expect(
          typeof bonus.description === 'string' && bonus.description.length > 0,
          `${g.id} bonus "${bonus.id}" has empty description`,
        ).toBe(true);
      }
    }
  });

  it('celebration bonus ids are unique across all governments', () => {
    const allBonusIds: string[] = [];
    for (const g of ALL_GOVERNMENTS) {
      for (const bonus of g.celebrationBonuses) {
        allBonusIds.push(bonus.id);
      }
    }
    expect(new Set(allBonusIds).size).toBe(allBonusIds.length);
  });

  it('at least 8 governments have celebration bonuses (all 10 governments)', () => {
    const withBonuses = ALL_GOVERNMENTS.filter(
      (g) => g.celebrationBonuses && g.celebrationBonuses.length >= 2,
    );
    expect(withBonuses.length).toBeGreaterThanOrEqual(8);
  });

  it('each listed government has exact celebration bonus names', () => {
    const expectations = [
      {
        id: 'classical_republic',
        bonuses: ['+20% Culture for 10 turns', '+15% Production toward Wonders for 10 turns'],
      },
      {
        id: 'despotism',
        bonuses: ['+20% Science for 10 turns', '+30% Production toward Infantry Units for 10 turns'],
      },
      {
        id: 'oligarchy',
        bonuses: ['+20% Food for 10 turns', '+30% Production toward Buildings for 10 turns'],
      },
      {
        id: 'theocracy',
        bonuses: ['+20% Culture for 10 turns', '+40% Production toward Civilian and Support Units for 10 turns'],
      },
      {
        id: 'plutocracy',
        bonuses: ['+20% Gold for 10 turns', '+30% Production toward Overbuilding for 10 turns'],
      },
      {
        id: 'feudal_monarchy',
        bonuses: ['+20% Food for 10 turns', '+30% Production toward Cavalry and Naval Units for 10 turns'],
      },
      {
        id: 'revolutionary_republic',
        bonuses: ['+100% Production toward Military Units for 10 turns', '+6 War Support for 10 turns'],
      },
      {
        id: 'revolutionary_authoritarianism',
        bonuses: ['+20% Culture and Science for 10 turns', '+100% Influence toward Sanctions'],
      },
      {
        id: 'constitutional_monarchy',
        bonuses: ['+40% Gold for 10 turns', '+100% Influence toward Diplomatic Endeavors'],
      },
      {
        id: 'authoritarianism',
        bonuses: ['+30% Production toward Military Units for 10 turns', '+3 Combat Strength for all Units'],
      },
      {
        id: 'bureaucratic_monarchy',
        bonuses: ['+20% Gold for 10 turns', '+30% Relationship change from Endeavors and Sanctions for 10 turns'],
      },
      {
        id: 'elective_republic',
        bonuses: ['+20% Culture for 10 turns', '+20% Science for 10 turns'],
      },
      {
        id: 'revolucion',
        bonuses: [
          '+30% Culture for 10 turns, +50% Influence toward Diplomatic Actions for 10 turns',
          '+30% Science for 10 turns, +40% Production toward Military Units for 10 turns',
        ],
      },
    ];

    for (const expectation of expectations) {
      const g = ALL_GOVERNMENTS.find((gov) => gov.id === expectation.id);
      expect(g, `missing government ${expectation.id}`).toBeDefined();
      expect(
        g!.celebrationBonuses.map((bonus) => bonus.name),
        `${expectation.id} celebration names`,
      ).toEqual(expectation.bonuses);
    }
  });
});
