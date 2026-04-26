import { describe, it, expect } from 'vitest';
import {
  PANTHEON_DEFAULT_FAITH_COST,
  RELIGIOUS_PRESSURE_RADIUS,
  MAX_RELIGION_BELIEFS,
} from '../../types/Religion';
import type {
  PantheonId,
  ReligionId,
  BeliefId,
  BeliefCategory,
  PantheonDef,
  BeliefDef,
  ReligionDef,
  CityReligiousState,
  PlayerReligiousState,
  ReligionState,
  ReligionAction,
} from '../../types/Religion';

/**
 * Compile-time shape tests for Religion & Pantheon scaffolding
 * (cycle A). Every new type is constructed at minimum-valid shape; if a
 * required field is added or a discriminant renamed, this file fails
 * to compile — the signal to bump downstream cycles.
 */
describe('Religion types — compile-time shape tests', () => {
  it('branded IDs are string aliases usable as map keys', () => {
    const pid: PantheonId = 'pantheon.god-of-healing';
    const rid: ReligionId = 'religion.p1.buddhism';
    const bid: BeliefId = 'belief.tithe';
    const pmap = new Map<PantheonId, number>([[pid, 1]]);
    const rmap = new Map<ReligionId, number>([[rid, 1]]);
    const bmap = new Map<BeliefId, number>([[bid, 1]]);
    expect(pmap.get(pid)).toBe(1);
    expect(rmap.get(rid)).toBe(1);
    expect(bmap.get(bid)).toBe(1);
  });

  it('BeliefCategory accepts all four slot names', () => {
    const cats: ReadonlyArray<BeliefCategory> = [
      'follower',
      'founder',
      'enhancer',
      'worship',
    ];
    expect(cats).toHaveLength(4);
    expect(new Set(cats).size).toBe(4);
  });

  it('PantheonDef has id, name, description, bonus, faithCost', () => {
    const p: PantheonDef = {
      id: 'pantheon.god-of-healing',
      name: 'God of Healing',
      description: '+2 healing on Rural tiles for friendly units.',
      faithCost: PANTHEON_DEFAULT_FAITH_COST,
      bonus: {
        type: 'MODIFY_YIELD',
        target: 'empire',
        yield: 'faith',
        value: 1,
      },
    };
    expect(p.id).toBe('pantheon.god-of-healing');
    expect(p.faithCost).toBe(25);
    expect(p.bonus.type).toBe('MODIFY_YIELD');
  });

  it('BeliefDef discriminates by category and carries an EffectDef', () => {
    const founder: BeliefDef = {
      id: 'belief.tithe',
      name: 'Tithe',
      description: 'Each follower city yields +1 gold to the founder.',
      category: 'founder',
      bonus: {
        type: 'MODIFY_YIELD',
        target: 'empire',
        yield: 'gold',
        value: 1,
      },
    };
    const follower: BeliefDef = {
      id: 'belief.feed-the-world',
      name: 'Feed the World',
      description: 'Shrines and Temples grant +1 Food.',
      category: 'follower',
      bonus: {
        type: 'MODIFY_YIELD',
        target: 'city',
        yield: 'food',
        value: 1,
      },
    };
    const enhancer: BeliefDef = {
      id: 'belief.just-war',
      name: 'Just War',
      description: '+20% combat strength on follower territory.',
      category: 'enhancer',
      bonus: { type: 'MODIFY_COMBAT', target: 'all', value: 2 },
    };
    const worship: BeliefDef = {
      id: 'belief.cathedral',
      name: 'Cathedral',
      description: 'Unlocks the Cathedral worship building.',
      category: 'worship',
      bonus: {
        type: 'UNLOCK_BUILDING',
        buildingId: 'building.cathedral',
      },
    };
    const beliefs: ReadonlyArray<BeliefDef> = [
      founder,
      follower,
      enhancer,
      worship,
    ];
    const kinds = new Set(beliefs.map((b) => b.category));
    expect(kinds.size).toBe(4);
    expect(beliefs).toHaveLength(MAX_RELIGION_BELIEFS);
  });

  it('ReligionDef captures founding identity and belief ordering', () => {
    const r: ReligionDef = {
      id: 'religion.p1.zoroastrianism',
      name: 'Zoroastrianism',
      founderId: 'civ.persia',
      foundedByPlayer: 'p1',
      foundedTurn: 42,
      holyCityId: 'city-1',
      beliefs: ['belief.tithe', 'belief.feed-the-world'],
    };
    expect(r.id).toBe('religion.p1.zoroastrianism');
    expect(r.foundedTurn).toBe(42);
    expect(r.beliefs).toHaveLength(2);
    expect(r.holyCityId).toBe('city-1');
  });

  it('CityReligiousState holds pressure and follower maps', () => {
    const c: CityReligiousState = {
      cityId: 'city-1',
      dominant: 'religion.p1.zoroastrianism',
      pressure: new Map([
        ['religion.p1.zoroastrianism', 50],
        ['religion.p2.buddhism', 20],
      ]),
      followers: new Map([
        ['religion.p1.zoroastrianism', 4],
        ['religion.p2.buddhism', 1],
      ]),
    };
    expect(c.dominant).toBe('religion.p1.zoroastrianism');
    expect(c.pressure.get('religion.p1.zoroastrianism')).toBe(50);
    expect(c.followers.get('religion.p2.buddhism')).toBe(1);

    // Null dominant is valid (pre-conversion).
    const empty: CityReligiousState = {
      cityId: 'city-2',
      dominant: null,
      pressure: new Map(),
      followers: new Map(),
    };
    expect(empty.dominant).toBeNull();
  });

  it('PlayerReligiousState links a player to pantheon + religion', () => {
    const ps: PlayerReligiousState = {
      playerId: 'p1',
      pantheonId: 'pantheon.god-of-healing',
      religionId: 'religion.p1.zoroastrianism',
      missionaryCharges: 3,
    };
    expect(ps.pantheonId).toBe('pantheon.god-of-healing');
    expect(ps.religionId).toBe('religion.p1.zoroastrianism');
    expect(ps.missionaryCharges).toBe(3);

    const fresh: PlayerReligiousState = {
      playerId: 'p2',
      pantheonId: null,
      religionId: null,
      missionaryCharges: 0,
    };
    expect(fresh.pantheonId).toBeNull();
    expect(fresh.religionId).toBeNull();
  });

  it('ReligionState aggregates all religion data with slot counters', () => {
    const rs: ReligionState = {
      pantheons: new Map([['p1', 'pantheon.god-of-healing']]),
      religions: new Map(),
      players: new Map(),
      cities: new Map(),
      availablePantheonSlots: 10,
      availableReligionSlots: 3,
    };
    expect(rs.pantheons.get('p1')).toBe('pantheon.god-of-healing');
    expect(rs.availablePantheonSlots).toBe(10);
    expect(rs.availableReligionSlots).toBe(3);
  });

  it('ReligionAction covers all six religion-scoped actions', () => {
    const adopt: ReligionAction = {
      type: 'ADOPT_PANTHEON',
      playerId: 'p1',
      pantheonId: 'pantheon.god-of-healing',
    };
    const found: ReligionAction = {
      type: 'FOUND_RELIGION',
      playerId: 'p1',
      cityId: 'city-1',
      religionName: 'Zoroastrianism',
      founderBelief: 'belief.tithe',
      followerBelief: 'belief.feed-the-world',
    };
    const enhance: ReligionAction = {
      type: 'ENHANCE_RELIGION',
      playerId: 'p1',
      cityId: 'city-1',
      religionId: 'religion.p1.zoroastrianism',
      enhancerBelief: 'belief.just-war',
      worshipBelief: 'belief.cathedral',
    };
    const spread: ReligionAction = {
      type: 'SPREAD_RELIGION',
      unitId: 'u-missionary-1',
      targetCityId: 'city-2',
    };
    const promote: ReligionAction = {
      type: 'PROMOTE_RELIGIOUS_UNIT',
      unitId: 'u-apostle-1',
      promotionId: 'apostle.debater',
    };
    const combat: ReligionAction = {
      type: 'INITIATE_THEOLOGICAL_COMBAT',
      attackerId: 'u-apostle-1',
      defenderId: 'u-apostle-2',
    };
    const actions: ReadonlyArray<ReligionAction> = [
      adopt,
      found,
      enhance,
      spread,
      promote,
      combat,
    ];
    const kinds = new Set(actions.map((a) => a.type));
    expect(kinds.size).toBe(6);
  });

  it('exposes rulebook constants for pantheon faith cost, pressure range, and max beliefs', () => {
    expect(PANTHEON_DEFAULT_FAITH_COST).toBe(25);
    expect(RELIGIOUS_PRESSURE_RADIUS).toBe(10);
    expect(MAX_RELIGION_BELIEFS).toBe(4);
  });
});
