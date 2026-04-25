/**
 * discoverySystem tests (EE5.2)
 *
 * Tests:
 *   1. Moving onto a discovery tile applies the correct reward.
 *   2. Discovery is cleared (discoveryId = null) after EXPLORE_DISCOVERY.
 *   3. Re-exploring a cleared tile does not double-grant.
 */

import { describe, it, expect } from 'vitest';
import { discoverySystem } from '../discoverySystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import type { DiscoveryDef } from '../../types/NarrativeEvent';

// ── Test fixture builders ──

function makeDiscoveryTile(q: number, r: number, discoveryId: string) {
  return { q, r, discoveryId };
}

function stateWithDiscovery(
  discoveryDef: DiscoveryDef,
  tileQ = 1,
  tileR = 0,
) {
  const base = createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', gold: 100, science: 0, culture: 0 })],
    ]),
    units: new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: tileQ, r: tileR } })],
    ]),
  });

  // Inject discovery into config
  const discoveries = new Map(base.config.discoveries ?? []);
  discoveries.set(discoveryDef.id, discoveryDef);

  // Inject discoveryId onto the tile
  const tiles = new Map(base.map.tiles);
  const tileKey = coordToKey({ q: tileQ, r: tileR });
  const tile = tiles.get(tileKey);
  if (tile) {
    tiles.set(tileKey, { ...tile, discoveryId: discoveryDef.id });
  }

  return {
    ...base,
    config: { ...base.config, discoveries },
    map: { ...base.map, tiles },
  };
}

// ── Tests ──

describe('discoverySystem — EXPLORE_DISCOVERY', () => {
  it('gold reward: applies gold to current player', () => {
    const def: DiscoveryDef = {
      id: 'test_cache',
      narrativeEventId: 'ancient_ruins',
      label: 'Hidden Cache',
      reward: { type: 'gold', amount: 50 },
    };

    const state = stateWithDiscovery(def);
    const next = discoverySystem(state, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });

    const player = next.players.get('p1')!;
    expect(player.gold).toBe(150); // 100 base + 50 reward
  });

  it('science reward: applies science to current player', () => {
    const def: DiscoveryDef = {
      id: 'test_tablet',
      narrativeEventId: 'desert_shrine',
      label: 'Ancient Tablet',
      reward: { type: 'science', amount: 30 },
    };

    const state = stateWithDiscovery(def);
    const next = discoverySystem(state, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });

    const player = next.players.get('p1')!;
    expect(player.science).toBe(30);
  });

  it('culture reward: applies culture to current player', () => {
    const def: DiscoveryDef = {
      id: 'test_temple',
      narrativeEventId: 'standing_stones',
      label: 'Ruined Temple',
      reward: { type: 'culture', amount: 40 },
    };

    const state = stateWithDiscovery(def);
    const next = discoverySystem(state, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });

    const player = next.players.get('p1')!;
    expect(player.culture).toBe(40);
  });

  it('discovery tile is cleared after exploration (discoveryId set to null)', () => {
    const def: DiscoveryDef = {
      id: 'test_clear',
      narrativeEventId: 'ancient_ruins',
      label: 'Test Site',
      reward: { type: 'gold', amount: 10 },
    };

    const state = stateWithDiscovery(def);
    const next = discoverySystem(state, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });

    const tileKey = coordToKey({ q: 1, r: 0 });
    const tile = next.map.tiles.get(tileKey);
    expect(tile?.discoveryId).toBeFalsy();
  });

  it('re-exploring a cleared tile does not grant reward again', () => {
    const def: DiscoveryDef = {
      id: 'test_once',
      narrativeEventId: 'ancient_ruins',
      label: 'One-Shot Site',
      reward: { type: 'gold', amount: 50 },
    };

    const state = stateWithDiscovery(def);

    // First exploration
    const afterFirst = discoverySystem(state, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });
    expect(afterFirst.players.get('p1')!.gold).toBe(150);

    // Second exploration of same tile (discoveryId is now null)
    const afterSecond = discoverySystem(afterFirst, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });

    // State should be unchanged — no double-grant
    expect(afterSecond.players.get('p1')!.gold).toBe(150);
  });

  it('no-op when discovery def has no reward field', () => {
    const def: DiscoveryDef = {
      id: 'test_no_reward',
      narrativeEventId: 'desert_shrine',
      label: 'Narrative Only Site',
      // No reward field
    };

    const state = stateWithDiscovery(def);
    const next = discoverySystem(state, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });

    // Returns state unchanged when discovery has no reward
    expect(next.players.get('p1')!.gold).toBe(100); // no change
  });

  it('no-op for non-EXPLORE_DISCOVERY actions', () => {
    const state = createTestState();
    const next = discoverySystem(state, { type: 'END_TURN' });
    expect(next).toBe(state); // same reference — no change
  });

  it('no-op when unit is owned by a different player', () => {
    const def: DiscoveryDef = {
      id: 'test_wrong_owner',
      narrativeEventId: 'ancient_ruins',
      label: 'Enemy Territory',
      reward: { type: 'gold', amount: 50 },
    };

    const base = stateWithDiscovery(def);
    // Change unit owner to p2
    const units = new Map(base.units);
    const u1 = units.get('u1')!;
    units.set('u1', { ...u1, owner: 'p2' });
    const state = { ...base, units };

    const next = discoverySystem(state, {
      type: 'EXPLORE_DISCOVERY',
      unitId: 'u1',
      tileQ: 1,
      tileR: 0,
    });

    // No reward applied
    expect(next.players.get('p1')!.gold).toBe(100);
  });
});

describe('ALL_DISCOVERIES catalog (EE5.2)', () => {
  it('has at least 8 discoveries', async () => {
    const { ALL_DISCOVERIES } = await import('../../data/discoveries/index');
    expect(ALL_DISCOVERIES.length).toBeGreaterThanOrEqual(8);
  });

  it('all discoveries have required fields', async () => {
    const { ALL_DISCOVERIES } = await import('../../data/discoveries/index');
    for (const d of ALL_DISCOVERIES) {
      expect(typeof d.id).toBe('string');
      expect(d.id.length).toBeGreaterThan(0);
      expect(typeof d.label).toBe('string');
      expect(d.label.length).toBeGreaterThan(0);
      expect(typeof d.narrativeEventId).toBe('string');
    }
  });

  it('reward-bearing discoveries have valid reward types', async () => {
    const { ALL_DISCOVERIES } = await import('../../data/discoveries/index');
    const VALID_TYPES = new Set(['gold', 'science', 'culture', 'unit']);
    for (const d of ALL_DISCOVERIES) {
      if (d.reward) {
        expect(VALID_TYPES.has(d.reward.type)).toBe(true);
        if (d.reward.type !== 'unit') {
          expect(typeof d.reward.amount).toBe('number');
          expect(d.reward.amount!).toBeGreaterThan(0);
        } else {
          expect(typeof d.reward.unitId).toBe('string');
        }
      }
    }
  });
});
