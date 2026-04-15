/**
 * Vikings civilization validation tests.
 * Verifies that the VIKINGS CivilizationDef is well-formed: correct age,
 * non-empty strings, valid effect types, and presence in ALL_ANTIQUITY_CIVS.
 */
import { describe, it, expect } from 'vitest';
import { VIKINGS, ALL_ANTIQUITY_CIVS } from '../civilizations';

describe('VIKINGS civilization def', () => {
  it('has id "vikings"', () => {
    expect(VIKINGS.id).toBe('vikings');
  });

  it('has age "antiquity"', () => {
    expect(VIKINGS.age).toBe('antiquity');
  });

  it('has a non-empty description', () => {
    expect(VIKINGS.description).toBeTruthy();
  });

  it('has startingBias "coastal"', () => {
    expect(VIKINGS.startingBias).toBe('coastal');
  });

  it('uniqueAbility has a name and description', () => {
    expect(VIKINGS.uniqueAbility.name).toBeTruthy();
    expect(VIKINGS.uniqueAbility.description).toBeTruthy();
  });

  it('uniqueAbility includes MODIFY_COMBAT targeting naval with value 2', () => {
    const combatEffect = VIKINGS.uniqueAbility.effects.find(
      (e) => e.type === 'MODIFY_COMBAT',
    );
    expect(combatEffect).toBeDefined();
    expect(combatEffect).toMatchObject({ type: 'MODIFY_COMBAT', target: 'naval', value: 2 });
  });

  it('uniqueAbility includes MODIFY_YIELD targeting tile food with value 1', () => {
    const yieldEffect = VIKINGS.uniqueAbility.effects.find(
      (e) => e.type === 'MODIFY_YIELD',
    );
    expect(yieldEffect).toBeDefined();
    expect(yieldEffect).toMatchObject({ type: 'MODIFY_YIELD', target: 'tile', yield: 'food', value: 1 });
  });

  it('uniqueUnit is null', () => {
    expect(VIKINGS.uniqueUnit).toBeNull();
  });

  it('uniqueBuilding is null', () => {
    expect(VIKINGS.uniqueBuilding).toBeNull();
  });

  it('legacyBonus is MODIFY_MOVEMENT targeting naval with value 1', () => {
    expect(VIKINGS.legacyBonus.effect).toEqual({
      type: 'MODIFY_MOVEMENT',
      target: 'naval',
      value: 1,
    });
  });

  it('legacyBonus has a name and description', () => {
    expect(VIKINGS.legacyBonus.name).toBeTruthy();
    expect(VIKINGS.legacyBonus.description).toBeTruthy();
  });

  it('color is a non-empty string', () => {
    expect(VIKINGS.color).toBeTruthy();
  });

  it('is included in ALL_ANTIQUITY_CIVS', () => {
    const ids = ALL_ANTIQUITY_CIVS.map((c) => c.id);
    expect(ids).toContain('vikings');
  });

  it('id is unique within ALL_ANTIQUITY_CIVS', () => {
    const ids = ALL_ANTIQUITY_CIVS.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
