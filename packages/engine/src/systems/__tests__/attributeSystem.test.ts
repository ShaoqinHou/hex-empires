import { describe, it, expect } from 'vitest';
import { attributeSystem } from '../attributeSystem';
import { ageSystem } from '../ageSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { AttributeNodeDef } from '../../types/Attribute';

/** Build a minimal config override with the attribute node catalog injected. */
function stateWithAttributeNodes(nodeOverrides?: ReadonlyMap<string, AttributeNodeDef>) {
  const tier1Node: AttributeNodeDef = {
    id: 'mercantile',
    tree: 'economic',
    tier: 1,
    cost: 1,
    prerequisites: [],
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 1 },
    description: '+1 Gold empire-wide.',
  };
  const tier2Node: AttributeNodeDef = {
    id: 'trade_networks',
    tree: 'economic',
    tier: 2,
    cost: 2,
    prerequisites: ['mercantile'],
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
    description: '+2 Gold empire-wide.',
  };
  const nodes = nodeOverrides ?? new Map([
    ['mercantile', tier1Node],
    ['trade_networks', tier2Node],
  ]);

  const player = createTestPlayer({ id: 'p1', attributePoints: 0, wildcardAttributePoints: 0, attributeTree: {} });
  const state = createTestState({ players: new Map([['p1', player]]) });

  // Inject attributeNodes into config (optional field)
  return {
    ...state,
    config: { ...state.config, attributeNodes: nodes },
  };
}

describe('attributeSystem — EARN_ATTRIBUTE_POINT', () => {
  it('increments attributePoints for non-wildcard earn', () => {
    const state = stateWithAttributeNodes();
    const next = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    expect(next.players.get('p1')!.attributePoints).toBe(1);
    expect(next.players.get('p1')!.wildcardAttributePoints).toBe(0);
  });

  it('increments wildcardAttributePoints for wildcard earn', () => {
    const state = stateWithAttributeNodes();
    const next = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: true });
    expect(next.players.get('p1')!.wildcardAttributePoints).toBe(1);
    expect(next.players.get('p1')!.attributePoints).toBe(0);
  });

  it('accumulates multiple earns correctly', () => {
    const state = stateWithAttributeNodes();
    const s1 = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    const s2 = attributeSystem(s1, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    const s3 = attributeSystem(s2, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: true });
    expect(s3.players.get('p1')!.attributePoints).toBe(2);
    expect(s3.players.get('p1')!.wildcardAttributePoints).toBe(1);
  });

  it('no-ops for unknown player', () => {
    const state = stateWithAttributeNodes();
    const next = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p_unknown', isWildcard: false });
    expect(next).toBe(state); // strict reference equality — no mutation
  });
});

describe('attributeSystem — SPEND_ATTRIBUTE_POINT', () => {
  it('unlocks a tier-1 node successfully and deducts points', () => {
    let state = stateWithAttributeNodes();
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    const p = next.players.get('p1')!;
    expect(p.attributePoints).toBe(0);
    expect(p.attributeTree?.['economic']).toContain('mercantile');
  });

  it('appends node effect to legacyBonuses on spend', () => {
    let state = stateWithAttributeNodes();
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    const p = next.players.get('p1')!;
    expect(p.legacyBonuses.some(b => b.source === 'attribute:mercantile')).toBe(true);
    expect(p.legacyBonuses.some(b => b.effect.type === 'MODIFY_YIELD')).toBe(true);
  });

  it('returns state unchanged when insufficient points', () => {
    const state = stateWithAttributeNodes();
    // player has 0 points, cost is 1
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    expect(next.players.get('p1')!.attributePoints).toBe(0);
    expect(next.players.get('p1')!.attributeTree?.['economic'] ?? []).not.toContain('mercantile');
  });

  it('enforces prerequisites — cannot unlock tier-2 without tier-1', () => {
    let state = stateWithAttributeNodes();
    // Give enough points for tier-2 cost (2) but no tier-1 unlocked
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'trade_networks' });
    expect(next.players.get('p1')!.attributeTree?.['economic'] ?? []).not.toContain('trade_networks');
    expect(next.players.get('p1')!.attributePoints).toBe(2); // unchanged
  });

  it('unlocks tier-2 after tier-1 is unlocked', () => {
    let state = stateWithAttributeNodes();
    // Earn 3 points (1 for tier-1 + 2 for tier-2)
    for (let i = 0; i < 3; i++) {
      state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    }
    state = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    state = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'trade_networks' });
    const p = state.players.get('p1')!;
    expect(p.attributeTree?.['economic']).toContain('mercantile');
    expect(p.attributeTree?.['economic']).toContain('trade_networks');
    expect(p.attributePoints).toBe(0);
  });

  it('prefers non-wildcard points before wildcard when spending', () => {
    let state = stateWithAttributeNodes();
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false }); // 1 normal
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: true });  // 1 wildcard
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    const p = next.players.get('p1')!;
    // Cost=1: should deduct from non-wildcard first
    expect(p.attributePoints).toBe(0);
    expect(p.wildcardAttributePoints).toBe(1); // untouched
  });

  it('uses wildcard points when non-wildcard is exhausted', () => {
    let state = stateWithAttributeNodes();
    // Only wildcard points
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: true }); // 1 wildcard
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    const p = next.players.get('p1')!;
    expect(p.wildcardAttributePoints).toBe(0);
    expect(p.attributeTree?.['economic']).toContain('mercantile');
  });

  it('returns state unchanged when node does not exist in config', () => {
    let state = stateWithAttributeNodes();
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'nonexistent_node' });
    expect(next.players.get('p1')!.attributePoints).toBe(1); // unchanged
  });

  it('does not double-unlock the same node', () => {
    let state = stateWithAttributeNodes();
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: false });
    state = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    // Try to spend again with a wildcard
    state = attributeSystem(state, { type: 'EARN_ATTRIBUTE_POINT', playerId: 'p1', isWildcard: true });
    const next = attributeSystem(state, { type: 'SPEND_ATTRIBUTE_POINT', playerId: 'p1', nodeId: 'mercantile' });
    const p = next.players.get('p1')!;
    // Should still be only 1 entry, wildcard unspent
    expect(p.attributeTree?.['economic']?.filter(n => n === 'mercantile').length).toBe(1);
    expect(p.wildcardAttributePoints).toBe(1);
  });
});

describe('attributeSystem — persistence across TRANSITION_AGE', () => {
  it('attribute points and tree persist after age transition', () => {
    let state = stateWithAttributeNodes();
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      civilizationId: 'rome',
      ageProgress: 50,
      attributePoints: 2,
      wildcardAttributePoints: 1,
      attributeTree: { economic: ['mercantile'] },
    });
    state = {
      ...state,
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    };

    // Add attributeNodes to config (needed if attributeSystem runs after age transition)
    state = { ...state, config: { ...state.config, attributeNodes: state.config.attributeNodes } };

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const p = next.players.get('p1')!;

    // Points persist AND get +1 from transition
    expect(p.attributePoints).toBe(3); // 2 existing + 1 from transition
    expect(p.wildcardAttributePoints).toBe(1); // unchanged
    expect(p.attributeTree?.['economic']).toContain('mercantile'); // tree preserved
  });
});
