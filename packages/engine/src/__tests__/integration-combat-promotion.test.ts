import { describe, it, expect } from 'vitest';
import { GameEngine } from '../GameEngine';
import { createTestState, createTestUnit, createTestPlayer } from '../systems/__tests__/helpers';

/**
 * L2 Integration: combat → promotion cross-system pipeline.
 *
 * Verifies that the full GameEngine pipeline correctly chains:
 *   - combatSystem: grants +5 XP to attacker on a successful attack
 *   - combatSystem: grants +5 XP and records a kill when the defender dies
 *   - promotionSystem: PROMOTE_UNIT accepted after attacker accumulates enough XP
 *
 * These tests exercise the pipeline (applyAction) rather than systems in
 * isolation — the point is the cross-system outcome, not individual system
 * correctness (each has its own L1 test file).
 */
describe('integration-combat-promotion: kill increments XP, enough XP enables promotion', () => {
  const engine = new GameEngine();

  /**
   * Seed a minimal two-player state with an adjacent attacker and a very
   * weak defender (health = 1) so we can guarantee a kill deterministically
   * without relying on RNG outcomes.
   */
  function seedState() {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', name: 'Attacker' })],
      ['p2', createTestPlayer({ id: 'p2', name: 'Defender' })],
    ]);
    // Attacker at (3,3), defender at (4,3) — adjacent in axial coords.
    const units = new Map([
      [
        'a1',
        createTestUnit({
          id: 'a1',
          owner: 'p1',
          typeId: 'warrior',
          position: { q: 3, r: 3 },
          movementLeft: 2,
          health: 100,
          experience: 0,
        }),
      ],
      [
        'd1',
        createTestUnit({
          id: 'd1',
          owner: 'p2',
          typeId: 'warrior',
          position: { q: 4, r: 3 },
          movementLeft: 2,
          health: 1, // guaranteed kill: any hit removes this unit
          experience: 0,
        }),
      ],
    ]);
    return createTestState({ players, units, currentPlayerId: 'p1' });
  }

  it('attacker gains +5 XP after a successful kill', () => {
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'ATTACK_UNIT',
      attackerId: 'a1',
      targetId: 'd1',
    });

    // Defender had 1 HP — must be dead.
    expect(next.units.has('d1')).toBe(false);

    // Attacker survived (100 HP vs 1 HP defender).
    const attacker = next.units.get('a1');
    expect(attacker).toBeDefined();
    // combatSystem grants +5 XP to the attacker on a non-lethal or kill hit.
    expect(attacker!.experience).toBe(5);
  });

  it('player totalKills increments by 1 after killing an enemy unit', () => {
    const state = seedState();

    const next = engine.applyAction(state, {
      type: 'ATTACK_UNIT',
      attackerId: 'a1',
      targetId: 'd1',
    });

    const p1 = next.players.get('p1');
    expect(p1).toBeDefined();
    expect(p1!.totalKills).toBe(1);
  });

  it('attacker with 20 XP can take a tier-1 promotion through the pipeline', () => {
    // Pre-seed attacker with 20 XP (above the tier-1 threshold of 15).
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', name: 'Veteran' })],
    ]);
    const units = new Map([
      [
        'v1',
        createTestUnit({
          id: 'v1',
          owner: 'p1',
          typeId: 'warrior',
          position: { q: 0, r: 0 },
          movementLeft: 2,
          health: 100,
          experience: 20,
          promotions: [],
        }),
      ],
    ]);
    const state = createTestState({ players, units, currentPlayerId: 'p1' });

    const next = engine.applyAction(state, {
      type: 'PROMOTE_UNIT',
      unitId: 'v1',
      promotionId: 'battlecry',
    });

    const promoted = next.units.get('v1');
    expect(promoted).toBeDefined();
    // promotionSystem consumed 15 XP: 20 - 15 = 5 remaining.
    expect(promoted!.experience).toBe(5);
    expect(promoted!.promotions).toContain('battlecry');
    // Log should contain a promotion entry.
    const promoLog = next.log.filter(e => e.type === 'combat');
    expect(promoLog.length).toBe(1);
    expect(promoLog[0].message).toContain('Battlecry');
  });

  it('full sequence: attack grants XP, subsequent PROMOTE_UNIT uses that XP', () => {
    /**
     * This test chains two engine actions to confirm that XP earned from
     * combat is immediately available to the promotion system:
     *   1. Attack a 1-HP enemy (grants +5 XP, still below tier-1 threshold).
     *   2. Start with attacker pre-loaded to 10 XP so that 10 + 5 = 15 XP
     *      exactly meets the tier-1 requirement.
     *   3. PROMOTE_UNIT succeeds (experience becomes 0 after cost of 15).
     */
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', name: 'Fighter' })],
      ['p2', createTestPlayer({ id: 'p2', name: 'Defender' })],
    ]);
    const units = new Map([
      [
        'a1',
        createTestUnit({
          id: 'a1',
          owner: 'p1',
          typeId: 'warrior',
          position: { q: 3, r: 3 },
          movementLeft: 2,
          health: 100,
          experience: 10, // will reach 15 after one kill (+5 XP)
          promotions: [],
        }),
      ],
      [
        'd1',
        createTestUnit({
          id: 'd1',
          owner: 'p2',
          typeId: 'warrior',
          position: { q: 4, r: 3 },
          movementLeft: 2,
          health: 1,
          experience: 0,
        }),
      ],
    ]);
    const initial = createTestState({ players, units, currentPlayerId: 'p1' });

    // Step 1: attack + kill → attacker now at 15 XP.
    const afterCombat = engine.applyAction(initial, {
      type: 'ATTACK_UNIT',
      attackerId: 'a1',
      targetId: 'd1',
    });
    expect(afterCombat.units.has('d1')).toBe(false);
    expect(afterCombat.units.get('a1')!.experience).toBe(15);

    // Step 2: promote using the freshly earned XP.
    const afterPromotion = engine.applyAction(afterCombat, {
      type: 'PROMOTE_UNIT',
      unitId: 'a1',
      promotionId: 'battlecry',
    });

    const final = afterPromotion.units.get('a1');
    expect(final).toBeDefined();
    expect(final!.promotions).toContain('battlecry');
    expect(final!.experience).toBe(0); // 15 - 15 = 0
  });
});
