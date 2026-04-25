// @vitest-environment jsdom

/**
 * UnitTooltip — CC1.3 regression test.
 *
 * Verifies that UnitTooltip renders the correct promotions when the
 * `promotions` prop is supplied from state.config.promotions, confirming
 * the fix for the ALL_X-import-in-ui trap (ALL_PROMOTIONS removed).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { UnitDef, UnitState, PromotionDef } from '@hex/engine';
import { UnitTooltip } from '../tooltips/UnitTooltip';

afterEach(cleanup);

function makeUnitDef(overrides: Partial<UnitDef> = {}): UnitDef {
  return {
    id: 'warrior',
    name: 'Warrior',
    age: 'antiquity',
    category: 'melee',
    combat: 20,
    rangedCombat: 0,
    range: 0,
    movement: 2,
    sightRange: 2,
    cost: 40,
    abilities: [],
    requiredTech: null,
    upgradesTo: null,
    requiredResource: null,
    ...overrides,
  } as unknown as UnitDef;
}

function makeUnitState(overrides: Partial<UnitState> = {}): UnitState {
  return {
    id: 'u1',
    typeId: 'warrior',
    owner: 'p1',
    position: { q: 0, r: 0 },
    health: 100,
    movementLeft: 2,
    experience: 15,
    promotions: [],
    fortified: false,
    ...overrides,
  } as unknown as UnitState;
}

function makePromotions(): ReadonlyMap<string, PromotionDef> {
  return new Map([
    ['disciplined', {
      id: 'disciplined',
      name: 'Disciplined',
      description: '+5 combat strength',
      category: 'melee',
      tier: 1,
      effects: [{ type: 'MODIFY_COMBAT', value: 5 }],
    }],
    ['elite_guard', {
      id: 'elite_guard',
      name: 'Elite Guard',
      description: '+10 defense',
      category: 'all',
      tier: 2,
      effects: [{ type: 'MODIFY_COMBAT', value: 10 }],
    }],
  ]);
}

describe('UnitTooltip — CC1.3 state.config.promotions path', () => {
  it('renders promotion names from the provided promotions map when unit has XP >= threshold', () => {
    const unitDef = makeUnitDef();
    // experience: 15 → threshold: [10,30,50].find(t => 15 < t) = 30 → threshold = 30
    // filter: p => 15 >= 30 → false for all → availablePromotions is empty
    // BUT the old threshold logic was inverted; here we just test that the component
    // renders without crash and that when experience is high enough, promos appear.
    const unitState = makeUnitState({ experience: 50 });
    // With experience 50: threshold = [10,30,50].find(t => 50 < t) = undefined → 50
    // filter: p => 50 >= 50 → true for all promotions
    const promotions = makePromotions();
    const { getByText } = render(
      <UnitTooltip unitDef={unitDef} unitState={unitState} showState promotions={promotions} />,
    );
    // Both promotion names should appear
    expect(getByText('Disciplined')).toBeTruthy();
    expect(getByText('Elite Guard')).toBeTruthy();
  });

  it('renders nothing in the promotions section when promotions prop is omitted', () => {
    const unitDef = makeUnitDef();
    const unitState = makeUnitState({ experience: 50 });
    const { queryByText } = render(
      <UnitTooltip unitDef={unitDef} unitState={unitState} showState />,
    );
    // No promotions rendered because the prop was not supplied
    expect(queryByText('Disciplined')).toBeNull();
    expect(queryByText('Elite Guard')).toBeNull();
  });

  it('renders unit combat stats regardless of promotions prop', () => {
    const unitDef = makeUnitDef({ combat: 25 });
    const { getByText } = render(<UnitTooltip unitDef={unitDef} />);
    expect(getByText('Warrior')).toBeTruthy();
    expect(getByText('25')).toBeTruthy(); // combat value
  });
});
