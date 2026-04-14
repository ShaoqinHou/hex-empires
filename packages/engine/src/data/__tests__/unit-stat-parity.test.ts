import { describe, it, expect } from 'vitest';
import {
  ALL_ANTIQUITY_UNITS,
  ALL_EXPLORATION_UNITS,
  ALL_MODERN_UNITS,
} from '../units';

// C5 of gap-analysis-v3: align unit numeric stats with Civ VII rulebook §7.
// Each assertion below verifies a single corrected stat field. IDs, names,
// categories, abilities, requiredTech, and upgradesTo are intentionally NOT
// covered here — this test guards only the numeric parity fix.

function antiquity(id: string) {
  const u = ALL_ANTIQUITY_UNITS.find(x => x.id === id);
  if (!u) throw new Error(`Antiquity unit ${id} not found`);
  return u;
}
function exploration(id: string) {
  const u = ALL_EXPLORATION_UNITS.find(x => x.id === id);
  if (!u) throw new Error(`Exploration unit ${id} not found`);
  return u;
}
function modern(id: string) {
  const u = ALL_MODERN_UNITS.find(x => x.id === id);
  if (!u) throw new Error(`Modern unit ${id} not found`);
  return u;
}

describe('Unit stat parity with Civ VII rulebook §7 (C5)', () => {
  // Antiquity
  it('Warrior cost matches rulebook (30)', () => {
    expect(antiquity('warrior').cost).toBe(30);
  });

  it('Slinger cost matches rulebook (30)', () => {
    expect(antiquity('slinger').cost).toBe(30);
  });
  it('Slinger range matches rulebook (2)', () => {
    expect(antiquity('slinger').range).toBe(2);
  });

  it('Archer cost matches rulebook (50)', () => {
    expect(antiquity('archer').cost).toBe(50);
  });
  it('Archer rangedCombat matches rulebook (20)', () => {
    expect(antiquity('archer').rangedCombat).toBe(20);
  });

  it('Scout movement matches rulebook (2)', () => {
    expect(antiquity('scout').movement).toBe(2);
  });

  it('Spearman cost matches rulebook (60)', () => {
    expect(antiquity('spearman').cost).toBe(60);
  });

  it('Chariot cost matches rulebook (60)', () => {
    expect(antiquity('chariot').cost).toBe(60);
  });

  it('Settler cost matches rulebook (50)', () => {
    expect(antiquity('settler').cost).toBe(50);
  });
  it('Settler movement matches rulebook (3)', () => {
    expect(antiquity('settler').movement).toBe(3);
  });

  it('Galley cost matches rulebook (60)', () => {
    expect(antiquity('galley').cost).toBe(60);
  });

  // Exploration
  it('Crossbowman combat matches rulebook (25)', () => {
    expect(exploration('crossbowman').combat).toBe(25);
  });
  it('Crossbowman rangedCombat matches rulebook (35)', () => {
    expect(exploration('crossbowman').rangedCombat).toBe(35);
  });

  it('Pikeman combat matches rulebook (45)', () => {
    expect(exploration('pikeman').combat).toBe(45);
  });

  it('Knight combat matches rulebook (45)', () => {
    expect(exploration('knight').combat).toBe(45);
  });
  it('Knight movement matches rulebook (3)', () => {
    expect(exploration('knight').movement).toBe(3);
  });

  // Modern
  it('Infantry combat matches rulebook (55)', () => {
    expect(modern('infantry').combat).toBe(55);
  });

  it('Tank combat matches rulebook (65)', () => {
    expect(modern('tank').combat).toBe(65);
  });
  it('Tank movement matches rulebook (4)', () => {
    expect(modern('tank').movement).toBe(4);
  });

  it('Fighter rangedCombat matches rulebook (40)', () => {
    expect(modern('fighter').rangedCombat).toBe(40);
  });
  it('Fighter range matches rulebook (10)', () => {
    expect(modern('fighter').range).toBe(10);
  });
  it('Fighter movement matches rulebook (10)', () => {
    expect(modern('fighter').movement).toBe(10);
  });

  it('Biplane combat matches rulebook (55)', () => {
    expect(modern('biplane').combat).toBe(55);
  });
  it('Biplane rangedCombat matches rulebook (35)', () => {
    expect(modern('biplane').rangedCombat).toBe(35);
  });
  it('Biplane range matches rulebook (8)', () => {
    expect(modern('biplane').range).toBe(8);
  });
  it('Biplane movement matches rulebook (8)', () => {
    expect(modern('biplane').movement).toBe(8);
  });
});
