import { describe, it, expect } from 'vitest';
import { ALL_GOVERNORS } from '../governors';
import {
  ALL_ANTIQUITY_GOVERNORS,
  TARRUN,
  AKAMU,
} from '../governors/antiquity-governors';
import {
  ALL_EXPLORATION_GOVERNORS,
  ELVIRA_VENTRICA,
  KJELD_STORMBREAK,
} from '../governors/exploration-governors';
import {
  ALL_MODERN_GOVERNORS,
  IPPOLITA_VEGA,
} from '../governors/modern-governors';
import type { GovernorDef, GovernorAbility } from '../../types/Governor';

/**
 * The new governors added in the roster expansion.
 */
const NEW_GOVERNORS: ReadonlyArray<GovernorDef> = [
  TARRUN,
  AKAMU,
  ELVIRA_VENTRICA,
  KJELD_STORMBREAK,
  IPPOLITA_VEGA,
];

/**
 * Valid effect-type literals per the GovernorAbility.effect discriminant.
 * These are the EffectDef-adjacent variants the ability system understands.
 */
const VALID_ABILITY_EFFECT_TYPES = new Set<string>([
  'yield_bonus',
  'production_bonus',
  'combat_bonus',
  'growth_bonus',
  'happiness_bonus',
  'special',
]);

const VALID_YIELD_TYPES = new Set<string>([
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
  'influence',
]);

const VALID_TITLES = new Set<string>([
  'administrator',
  'magistrate',
  'prefect',
  'consul',
  'viceroy',
]);

const VALID_SPECIALIZATIONS = new Set<string>([
  'economic',
  'military',
  'scientific',
  'cultural',
  'religious',
  'diplomatic',
]);

/** Governors that existed before this expansion. */
const PRE_EXPANSION_GOVERNORS: ReadonlyArray<GovernorDef> = ALL_GOVERNORS.filter(
  (g) => !NEW_GOVERNORS.includes(g),
);

function abilitiesOf(def: GovernorDef): ReadonlyArray<GovernorAbility> {
  return [...def.baseAbilities, ...def.unlockableAbilities];
}

describe('governors expansion catalog', () => {
  it('adds exactly five new governors', () => {
    expect(NEW_GOVERNORS).toHaveLength(5);
  });

  it('grows the ALL_GOVERNORS total by the new count', () => {
    // Pre-expansion baseline was 18 (6 per age).
    expect(PRE_EXPANSION_GOVERNORS).toHaveLength(18);
    expect(ALL_GOVERNORS.length).toBe(
      PRE_EXPANSION_GOVERNORS.length + NEW_GOVERNORS.length,
    );
  });

  it('gives every new governor a unique id', () => {
    const ids = NEW_GOVERNORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('new governor ids do not collide with pre-existing governor ids', () => {
    const existing = new Set(PRE_EXPANSION_GOVERNORS.map((g) => g.id));
    for (const g of NEW_GOVERNORS) {
      expect(existing.has(g.id)).toBe(false);
    }
  });

  it('ALL_GOVERNORS has no duplicate ids overall', () => {
    const ids = ALL_GOVERNORS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('distributes new governors across all three ages via title tiers', () => {
    const byTitle = new Map<string, number>();
    for (const g of NEW_GOVERNORS) {
      byTitle.set(g.title, (byTitle.get(g.title) ?? 0) + 1);
    }
    expect(byTitle.get('administrator')).toBe(2); // antiquity
    expect(byTitle.get('prefect')).toBe(2); // exploration
    expect(byTitle.get('viceroy')).toBe(1); // modern
  });

  it('wires each new governor into the correct age array', () => {
    expect(ALL_ANTIQUITY_GOVERNORS).toContain(TARRUN);
    expect(ALL_ANTIQUITY_GOVERNORS).toContain(AKAMU);
    expect(ALL_EXPLORATION_GOVERNORS).toContain(ELVIRA_VENTRICA);
    expect(ALL_EXPLORATION_GOVERNORS).toContain(KJELD_STORMBREAK);
    expect(ALL_MODERN_GOVERNORS).toContain(IPPOLITA_VEGA);
  });

  it('every new governor has at least three abilities total', () => {
    for (const g of NEW_GOVERNORS) {
      expect(abilitiesOf(g).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every new governor has a recognized title and specialization', () => {
    for (const g of NEW_GOVERNORS) {
      expect(VALID_TITLES.has(g.title)).toBe(true);
      expect(VALID_SPECIALIZATIONS.has(g.specialization)).toBe(true);
    }
  });

  it('every ability on new governors has a valid effect-type literal', () => {
    for (const g of NEW_GOVERNORS) {
      for (const a of abilitiesOf(g)) {
        expect(VALID_ABILITY_EFFECT_TYPES.has(a.effect.type)).toBe(true);
      }
    }
  });

  it('ability yieldType, when present, is a valid yield literal', () => {
    for (const g of NEW_GOVERNORS) {
      for (const a of abilitiesOf(g)) {
        if (a.effect.yieldType !== undefined) {
          expect(VALID_YIELD_TYPES.has(a.effect.yieldType)).toBe(true);
        }
      }
    }
  });

  it('every ability id is unique within its governor and non-empty', () => {
    for (const g of NEW_GOVERNORS) {
      const ids = abilitiesOf(g).map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });

  it('every ability has a non-empty name and description', () => {
    for (const g of NEW_GOVERNORS) {
      for (const a of abilitiesOf(g)) {
        expect(a.name.length).toBeGreaterThan(0);
        expect(a.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('requiredLevel on every ability is a positive integer not exceeding maxLevel', () => {
    for (const g of NEW_GOVERNORS) {
      for (const a of abilitiesOf(g)) {
        expect(Number.isInteger(a.requiredLevel)).toBe(true);
        expect(a.requiredLevel).toBeGreaterThanOrEqual(1);
        expect(a.requiredLevel).toBeLessThanOrEqual(g.maxLevel);
      }
    }
  });

  it('fills thematic gaps: logistics, naval, and age-transition helper roles are represented', () => {
    // Logistics-themed: Tarrun (antiquity economic) + Ippolita Vega (modern economic).
    expect(TARRUN.specialization).toBe('economic');
    expect(IPPOLITA_VEGA.specialization).toBe('economic');
    // Naval-themed military: Akamu (antiquity) + Kjeld Stormbreak (exploration).
    expect(AKAMU.specialization).toBe('military');
    expect(KJELD_STORMBREAK.specialization).toBe('military');
    // Age-transition helper: Elvira Ventrica (exploration cultural chronicler).
    expect(ELVIRA_VENTRICA.specialization).toBe('cultural');
  });
});
