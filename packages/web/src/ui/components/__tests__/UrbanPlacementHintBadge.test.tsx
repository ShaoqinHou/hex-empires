// @vitest-environment jsdom

/**
 * UrbanPlacementHintBadge — component tests.
 *
 * Covers the three visual states plus positioning. No engine state is
 * constructed: the component is pure-presentational and consumes a
 * `PlacementScore` shape directly, so tests feed hand-rolled scores.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import {
  UrbanPlacementHintBadge,
  type PlacementScore,
} from '../UrbanPlacementHintBadge';

function makeScore(overrides: Partial<PlacementScore> = {}): PlacementScore {
  return {
    tile: { q: 0, r: 0 },
    buildingId: 'library',
    scoreFood: 0,
    scoreProduction: 0,
    scoreScience: 0,
    scoreCulture: 0,
    scoreGold: 0,
    scoreTotal: 0,
    valid: true,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('UrbanPlacementHintBadge', () => {
  it('renders nothing when visible === false', () => {
    const { container } = render(
      <UrbanPlacementHintBadge
        score={makeScore({ scoreScience: 2, scoreTotal: 2 })}
        screenX={100}
        screenY={200}
        visible={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the "blocked" state when score.valid === false', () => {
    const { getByTestId, queryByTestId } = render(
      <UrbanPlacementHintBadge
        score={makeScore({ valid: false })}
        screenX={50}
        screenY={60}
      />,
    );

    const badge = getByTestId('urban-placement-hint-badge');
    expect(badge.getAttribute('data-state')).toBe('blocked');
    expect(badge.textContent).toContain('✕');
    expect(badge.textContent?.toLowerCase()).toContain('blocked');

    // No yield entries rendered in the blocked state.
    expect(queryByTestId('urban-placement-hint-yield-food')).toBeNull();
    expect(queryByTestId('urban-placement-hint-yield-science')).toBeNull();
  });

  it('renders the "no bonuses" state when valid but scoreTotal === 0', () => {
    const { getByTestId, queryByTestId } = render(
      <UrbanPlacementHintBadge
        score={makeScore({ valid: true, scoreTotal: 0 })}
        screenX={10}
        screenY={20}
      />,
    );

    const badge = getByTestId('urban-placement-hint-badge');
    expect(badge.getAttribute('data-state')).toBe('empty');
    expect(badge.textContent?.toLowerCase()).toContain('no bonuses');
    expect(queryByTestId('urban-placement-hint-yield-food')).toBeNull();
  });

  it('renders a yield breakdown with one entry per non-zero yield when valid', () => {
    const { getByTestId, queryByTestId } = render(
      <UrbanPlacementHintBadge
        score={makeScore({
          valid: true,
          scoreFood: 2,
          scoreProduction: 1,
          scoreScience: 0,
          scoreCulture: 0,
          scoreGold: 3,
          scoreTotal: 6,
        })}
        screenX={0}
        screenY={0}
      />,
    );

    const badge = getByTestId('urban-placement-hint-badge');
    expect(badge.getAttribute('data-state')).toBe('breakdown');

    // Non-zero yields are rendered.
    const food = getByTestId('urban-placement-hint-yield-food');
    const production = getByTestId('urban-placement-hint-yield-production');
    const gold = getByTestId('urban-placement-hint-yield-gold');

    expect(food.textContent).toContain('+2');
    expect(production.textContent).toContain('+1');
    expect(gold.textContent).toContain('+3');

    // Zero yields are filtered out entirely.
    expect(queryByTestId('urban-placement-hint-yield-science')).toBeNull();
    expect(queryByTestId('urban-placement-hint-yield-culture')).toBeNull();
  });

  it('uses screenX / screenY in its inline positioning style', () => {
    const { getByTestId } = render(
      <UrbanPlacementHintBadge
        score={makeScore({
          valid: true,
          scoreScience: 4,
          scoreTotal: 4,
        })}
        screenX={137}
        screenY={241}
      />,
    );

    const badge = getByTestId('urban-placement-hint-badge') as HTMLElement;
    expect(badge.style.position).toBe('absolute');
    expect(badge.style.left).toBe('137px');
    expect(badge.style.top).toBe('241px');
    expect(badge.style.pointerEvents).toBe('none');
    // Offset transform places the badge above the hex.
    expect(badge.style.transform).toContain('translate(-50%');
  });

  it('defaults to visible (renders when `visible` prop is omitted)', () => {
    const { getByTestId } = render(
      <UrbanPlacementHintBadge
        score={makeScore({ valid: true, scoreFood: 1, scoreTotal: 1 })}
        screenX={5}
        screenY={6}
      />,
    );
    expect(getByTestId('urban-placement-hint-badge')).not.toBeNull();
  });
});
