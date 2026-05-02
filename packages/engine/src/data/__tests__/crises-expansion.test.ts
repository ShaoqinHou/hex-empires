import { describe, it, expect } from 'vitest';
import {
  ALL_CRISES,
  EXPANSION_CRISES,
  SUCCESSION_CRISIS,
  RELIGIOUS_REFORMATION,
  ECONOMIC_DEPRESSION,
  CIVIL_UNREST,
  DIPLOMATIC_INCIDENT,
  TECHNOLOGICAL_REVOLUTION,
} from '../crises';
import type { CrisisEventDef } from '../crises';

const VALID_EFFECT_TYPES = new Set<string>([
  'MODIFY_YIELD',
  'MODIFY_COMBAT',
  'GRANT_UNIT',
  'UNLOCK_BUILDING',
  'DISCOUNT_PRODUCTION',
  'MODIFY_MOVEMENT',
  'FREE_TECH',
  'CULTURE_BOMB',
]);

const VALID_YIELDS = new Set<string>([
  'food',
  'production',
  'gold',
  'science',
  'culture',
  'faith',
  'influence',
  'happiness',
]);

describe('crises expansion catalog', () => {
  it('exports exactly six expansion crisis entries', () => {
    expect(EXPANSION_CRISES).toHaveLength(6);
  });

  it('gives every expansion crisis a unique id', () => {
    const ids = EXPANSION_CRISES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('expansion ids do not collide with pre-existing ALL_CRISES ids', () => {
    const originalIds = new Set(
      ALL_CRISES.filter((c) => !EXPANSION_CRISES.includes(c)).map((c) => c.id),
    );
    for (const crisis of EXPANSION_CRISES) {
      expect(originalIds.has(crisis.id)).toBe(false);
    }
  });

  it('merges all expansion crises into ALL_CRISES', () => {
    for (const crisis of EXPANSION_CRISES) {
      expect(ALL_CRISES).toContain(crisis);
    }
  });

  it('ALL_CRISES length grew to at least 12 (6 original + 6 expansion)', () => {
    expect(ALL_CRISES.length).toBeGreaterThanOrEqual(12);
  });

  it('each expansion crisis has at least two choices', () => {
    for (const crisis of EXPANSION_CRISES) {
      expect(crisis.choices.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('each expansion crisis has at most three choices', () => {
    for (const crisis of EXPANSION_CRISES) {
      expect(crisis.choices.length).toBeLessThanOrEqual(3);
    }
  });

  it('each choice has a unique id within its crisis', () => {
    for (const crisis of EXPANSION_CRISES) {
      const choiceIds = crisis.choices.map((ch) => ch.id);
      expect(new Set(choiceIds).size).toBe(choiceIds.length);
    }
  });

  it('each choice has non-empty text and at least one effect', () => {
    for (const crisis of EXPANSION_CRISES) {
      for (const choice of crisis.choices) {
        expect(choice.text.length).toBeGreaterThan(0);
        expect(choice.effects.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every effect uses a valid EffectDef type name', () => {
    for (const crisis of EXPANSION_CRISES) {
      for (const choice of crisis.choices) {
        for (const effect of choice.effects) {
          expect(VALID_EFFECT_TYPES.has(effect.type)).toBe(true);
        }
      }
    }
  });

  it('MODIFY_YIELD effects reference valid yield names and have numeric values', () => {
    for (const crisis of EXPANSION_CRISES) {
      for (const choice of crisis.choices) {
        for (const effect of choice.effects) {
          if (effect.type === 'MODIFY_YIELD') {
            expect(effect.yield).toBeDefined();
            expect(VALID_YIELDS.has(effect.yield as string)).toBe(true);
            expect(typeof effect.value).toBe('number');
            expect(Number.isFinite(effect.value)).toBe(true);
          }
        }
      }
    }
  });

  it('named imports resolve to the same objects found in EXPANSION_CRISES', () => {
    const byId = new Map<string, CrisisEventDef>(EXPANSION_CRISES.map((c) => [c.id, c]));
    expect(byId.get('succession_crisis')).toBe(SUCCESSION_CRISIS);
    expect(byId.get('religious_reformation')).toBe(RELIGIOUS_REFORMATION);
    expect(byId.get('economic_depression')).toBe(ECONOMIC_DEPRESSION);
    expect(byId.get('civil_unrest')).toBe(CIVIL_UNREST);
    expect(byId.get('diplomatic_incident')).toBe(DIPLOMATIC_INCIDENT);
    expect(byId.get('technological_revolution')).toBe(TECHNOLOGICAL_REVOLUTION);
  });

  it('each expansion crisis has a non-empty name and description', () => {
    for (const crisis of EXPANSION_CRISES) {
      expect(crisis.name.length).toBeGreaterThan(0);
      expect(crisis.description.length).toBeGreaterThan(10);
    }
  });

  it('each expansion crisis declares a known trigger condition', () => {
    const validTriggers = new Set<string>([
      'turn_reached',
      'tech_researched',
      'war_declared',
      'city_founded',
    ]);
    for (const crisis of EXPANSION_CRISES) {
      expect(validTriggers.has(crisis.triggerCondition)).toBe(true);
    }
  });

  it('exploration crises include a revolution type for age-seeded selection (F-03)', () => {
    const explorationRevolutions = ALL_CRISES
      .filter((crisis) => crisis.age === 'exploration' && crisis.crisisType === 'revolution')
      .map((crisis) => crisis.id);
    expect(explorationRevolutions.length).toBeGreaterThan(0);
  });

  it('adds the exploration revolution crisis entry to ALL_CRISES', () => {
    expect(ALL_CRISES.find((crisis) => crisis.id === 'exploration_revolution')).toBeDefined();
  });
});
