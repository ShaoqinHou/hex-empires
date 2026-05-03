import { describe, it, expect } from 'vitest';
import { productionSystem } from '../productionSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CommanderState } from '../../types/Commander';
import type { CityState, GameState, HexTile } from '../../types/GameState';
import type { UrbanTileV2 } from '../../types/DistrictOverhaul';
import type { TerrainId } from '../../types/Terrain';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
      coordToKey({ q: 2, r: 4 }),
      coordToKey({ q: 2, r: 3 }),
    ],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

function mapWithTerrain(state: GameState, terrain: TerrainId): GameState {
  const tiles = new Map<string, HexTile>();
  for (const [key, tile] of state.map.tiles) {
    tiles.set(key, { ...tile, terrain, feature: null });
  }
  return {
    ...state,
    map: { ...state.map, tiles },
  };
}

function makeCommanderState(overrides: Partial<CommanderState> = {}): CommanderState {
  return {
    unitId: 'cmd1',
    xp: 0,
    commanderLevel: 1,
    unspentPromotionPicks: 0,
    promotions: [],
    tree: null,
    attachedUnits: [],
    packed: false,
    ...overrides,
  };
}

describe('productionSystem', () => {
  describe('SET_PRODUCTION', () => {
    it('sets production queue for a city', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      const updatedCity = next.cities.get('c1')!;
      expect(updatedCity.productionQueue).toEqual([{ type: 'unit', id: 'warrior' }]);
      expect(updatedCity.productionProgress).toBe(0);
    });

    it('attaches tile as lockedTile on a building queue item', () => {
      // Building-placement rework Cycle 4: SET_PRODUCTION with tile stores
      // lockedTile on the queued item so Cycle 1 auto-places on completion.
      const city = createTestCity();
      const state = createTestState({
        cities: new Map([['c1', city]]),
        players: new Map([['p1', createTestPlayer({ researchedTechs: ['pottery'] })]]),
      });
      const tile = { q: 4, r: 3 };
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'granary',
        itemType: 'building',
        tile,
      });
      const updatedCity = next.cities.get('c1')!;
      expect(updatedCity.productionQueue.length).toBe(1);
      expect(updatedCity.productionQueue[0]).toEqual({
        type: 'building',
        id: 'granary',
        lockedTile: tile,
      });
    });

    it('ignores tile for unit queue items (units spawn at city centre)', () => {
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
        tile: { q: 4, r: 3 },
      });
      const updatedCity = next.cities.get('c1')!;
      expect(updatedCity.productionQueue[0]).toEqual({ type: 'unit', id: 'warrior' });
      expect((updatedCity.productionQueue[0] as any).lockedTile).toBeUndefined();
    });

    it('building without tile still works (legacy path)', () => {
      const city = createTestCity();
      const state = createTestState({
        cities: new Map([['c1', city]]),
        players: new Map([['p1', createTestPlayer({ researchedTechs: ['pottery'] })]]),
      });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'granary',
        itemType: 'building',
      });
      const updatedCity = next.cities.get('c1')!;
      expect(updatedCity.productionQueue[0]).toEqual({ type: 'building', id: 'granary' });
    });

    it('rejects a wonder-typed queue item when the wonder is already built', () => {
      const city = createTestCity();
      const state = createTestState({
        builtWonders: ['pyramids'],
        cities: new Map([['c1', city]]),
      });

      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'pyramids',
        itemType: 'wonder',
      });

      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'This wonder has already been built',
        category: 'production',
      });
      expect(next.cities.get('c1')!.productionQueue).toEqual([]);
    });

    it('notifies rivals already building the same wonder when a race starts', () => {
      const startingCity = createTestCity({
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
      });
      const rivalCity = createTestCity({
        id: 'c2',
        name: 'Memphis',
        owner: 'p2',
        position: { q: 6, r: 6 },
        territory: [coordToKey({ q: 6, r: 6 })],
        isCapital: false,
        productionQueue: [{ type: 'wonder', id: 'pyramids' }],
        productionProgress: 100,
      });
      const state = createTestState({
        currentPlayerId: 'p1',
        cities: new Map([['c1', startingCity], ['c2', rivalCity]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', name: 'Player 1', researchedTechs: ['masonry'] })],
          ['p2', createTestPlayer({ id: 'p2', name: 'Player 2', civilizationId: 'egypt', researchedTechs: ['masonry'] })],
        ]),
      });

      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'pyramids',
        itemType: 'wonder',
      });

      expect(next.cities.get('c1')!.productionQueue).toEqual([{ type: 'wonder', id: 'pyramids' }]);
      const notification = next.log.find(e => e.playerId === 'p2' && e.message.includes('competing with Memphis'));
      expect(notification).toMatchObject({
        turn: 1,
        playerId: 'p2',
        message: 'Rome has started work on The Pyramids, competing with Memphis.',
        type: 'production',
        severity: 'warning',
        category: 'production',
        panelTarget: 'city',
      });
    });
  });

  describe('END_TURN production', () => {
    it('accumulates production progress', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: 0,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      // Default city has territory:[] → city-center production yield 2 (verified empirically).
      // productionProgress = 0 + 2 = 2.
      expect(next.cities.get('c1')!.productionProgress).toBe(2);
    });

    it('applies Logistics Recruitment production bonus for land units when commander is on the city center', () => {
      const baseState = mapWithTerrain(createTestState(), 'plains');
      const territory = [...baseState.map.tiles.keys()].slice(0, 30);
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: -500,
        territory,
      });
      const commanderUnit = createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p1',
        position: city.position,
      });

      const withoutPromotion = productionSystem({
        ...baseState,
        cities: new Map([['c1', city]]),
        units: new Map([['cmd1', commanderUnit]]),
        commanders: new Map([['cmd1', makeCommanderState()]]),
      }, { type: 'END_TURN' });
      const withRecruitment = productionSystem({
        ...baseState,
        cities: new Map([['c1', city]]),
        units: new Map([['cmd1', commanderUnit]]),
        commanders: new Map([['cmd1', makeCommanderState({ promotions: ['logistics_recruitment'] })]]),
      }, { type: 'END_TURN' });

      const basePerTurn = withoutPromotion.cities.get('c1')!.productionProgress - city.productionProgress;
      const boostedPerTurn = withRecruitment.cities.get('c1')!.productionProgress - city.productionProgress;
      expect(basePerTurn).toBeGreaterThan(0);
      expect(boostedPerTurn).toBe(Math.floor(basePerTurn * 1.15));
    });

    it('treats V2 urban tiles as stationed districts for Logistics Recruitment', () => {
      const baseState = mapWithTerrain(createTestState(), 'plains');
      const territory = [...baseState.map.tiles.keys()].slice(0, 30);
      const urbanCoord = { q: 4, r: 3 };
      const urbanKey = coordToKey(urbanCoord);
      const urbanTile: UrbanTileV2 = {
        cityId: 'c1',
        coord: urbanCoord,
        buildings: [],
        specialistCount: 0,
        specialistCapPerTile: 1,
        walled: false,
      };
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: -500,
        territory,
        urbanTiles: new Map([[urbanKey, urbanTile]]),
      });
      const commanderUnit = createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p1',
        position: urbanCoord,
      });

      const withoutPromotion = productionSystem({
        ...baseState,
        cities: new Map([['c1', city]]),
        units: new Map([['cmd1', commanderUnit]]),
        commanders: new Map([['cmd1', makeCommanderState()]]),
      }, { type: 'END_TURN' });
      const withRecruitment = productionSystem({
        ...baseState,
        cities: new Map([['c1', city]]),
        units: new Map([['cmd1', commanderUnit]]),
        commanders: new Map([['cmd1', makeCommanderState({ promotions: ['logistics_recruitment'] })]]),
      }, { type: 'END_TURN' });

      expect(withRecruitment.cities.get('c1')!.productionProgress).toBeGreaterThan(
        withoutPromotion.cities.get('c1')!.productionProgress,
      );
    });

    it('does not apply Logistics Recruitment without the promotion or off a district', () => {
      const baseState = mapWithTerrain(createTestState(), 'plains');
      const territory = [...baseState.map.tiles.keys()].slice(0, 30);
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: -500,
        territory,
      });
      const unpromotedCommander = createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p1',
        position: city.position,
      });
      const offDistrictCommander = createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p1',
        position: { q: 0, r: 0 },
      });

      const baseline = productionSystem({
        ...baseState,
        cities: new Map([['c1', city]]),
      }, { type: 'END_TURN' });
      const missingPromotion = productionSystem({
        ...baseState,
        cities: new Map([['c1', city]]),
        units: new Map([['cmd1', unpromotedCommander]]),
        commanders: new Map([['cmd1', makeCommanderState()]]),
      }, { type: 'END_TURN' });
      const offDistrict = productionSystem({
        ...baseState,
        cities: new Map([['c1', city]]),
        units: new Map([['cmd1', offDistrictCommander]]),
        commanders: new Map([['cmd1', makeCommanderState({ promotions: ['logistics_recruitment'] })]]),
      }, { type: 'END_TURN' });

      expect(missingPromotion.cities.get('c1')!.productionProgress).toBe(
        baseline.cities.get('c1')!.productionProgress,
      );
      expect(offDistrict.cities.get('c1')!.productionProgress).toBe(
        baseline.cities.get('c1')!.productionProgress,
      );
    });

    it('does not apply Logistics Recruitment from another city or enemy commander', () => {
      const baseState = mapWithTerrain(createTestState(), 'plains');
      const territory = [...baseState.map.tiles.keys()].slice(0, 30);
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: -500,
        territory,
      });
      const otherCity = createTestCity({
        id: 'c2',
        name: 'Antium',
        position: { q: 8, r: 8 },
        territory: [coordToKey({ q: 8, r: 8 })],
        isCapital: false,
      });

      const baseline = productionSystem({
        ...baseState,
        cities: new Map([['c1', city], ['c2', otherCity]]),
      }, { type: 'END_TURN' });

      const sameOwnerOtherCity = productionSystem({
        ...baseState,
        cities: new Map([['c1', city], ['c2', otherCity]]),
        units: new Map([['cmd1', createTestUnit({
          id: 'cmd1',
          typeId: 'army_commander',
          owner: 'p1',
          position: otherCity.position,
        })]]),
        commanders: new Map([['cmd1', makeCommanderState({ promotions: ['logistics_recruitment'] })]]),
      }, { type: 'END_TURN' });

      const enemyCommanderOnCity = productionSystem({
        ...baseState,
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1' })],
          ['p2', createTestPlayer({ id: 'p2', civilizationId: 'egypt' })],
        ]),
        cities: new Map([['c1', city], ['c2', otherCity]]),
        units: new Map([['cmd1', createTestUnit({
          id: 'cmd1',
          typeId: 'army_commander',
          owner: 'p2',
          position: city.position,
        })]]),
        commanders: new Map([['cmd1', makeCommanderState({ promotions: ['logistics_recruitment'] })]]),
      }, { type: 'END_TURN' });

      expect(sameOwnerOtherCity.cities.get('c1')!.productionProgress).toBe(
        baseline.cities.get('c1')!.productionProgress,
      );
      expect(enemyCommanderOnCity.cities.get('c1')!.productionProgress).toBe(
        baseline.cities.get('c1')!.productionProgress,
      );
    });

    it('does not apply Logistics Recruitment to civilian or naval units', () => {
      const baseState = mapWithTerrain(createTestState(), 'plains');
      const territory = [...baseState.map.tiles.keys()].slice(0, 30);
      const commanderUnit = createTestUnit({
        id: 'cmd1',
        typeId: 'army_commander',
        owner: 'p1',
        position: { q: 3, r: 3 },
      });

      for (const unitId of ['settler', 'galley']) {
        const city = createTestCity({
          productionQueue: [{ type: 'unit', id: unitId }],
          productionProgress: -500,
          territory,
        });
        const baseline = productionSystem({
          ...baseState,
          cities: new Map([['c1', city]]),
        }, { type: 'END_TURN' });
        const withRecruitment = productionSystem({
          ...baseState,
          cities: new Map([['c1', city]]),
          units: new Map([['cmd1', commanderUnit]]),
          commanders: new Map([['cmd1', makeCommanderState({ promotions: ['logistics_recruitment'] })]]),
        }, { type: 'END_TURN' });

        expect(withRecruitment.cities.get('c1')!.productionProgress).toBe(
          baseline.cities.get('c1')!.productionProgress,
        );
      }
    });

    it('creates unit when production completes', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: 29, // warrior costs 30, should complete with any production
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      // Should have created a new unit
      const newUnits = [...next.units.values()].filter(u => u.typeId === 'warrior');
      expect(newUnits.length).toBeGreaterThanOrEqual(1);

      // Queue should be cleared
      expect(next.cities.get('c1')!.productionQueue.length).toBe(0);
    });

    it('adds building when production completes', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'building', id: 'granary' }],
        productionProgress: 54, // granary costs 55
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      expect(next.cities.get('c1')!.buildings).toContain('granary');
    });

    it('adds building without lockedTile does NOT mutate any territory tile', () => {
      // Regression guard for Cycle 1 of the building-placement rework:
      // existing queue items (no lockedTile) must keep the legacy
      // "completed but not placed" behaviour — no map-tile write.
      const city = createTestCity({
        productionQueue: [{ type: 'building', id: 'granary' }],
        productionProgress: 54,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      const updated = next.cities.get('c1')!;
      expect(updated.buildings).toContain('granary');
      for (const tileKey of updated.territory) {
        const tile = next.map.tiles.get(tileKey);
        expect(tile?.building ?? null).toBe(null);
      }
    });

    it('does nothing with empty queue', () => {
      const city = createTestCity({ productionQueue: [] });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      // When no changes occur, returns same state reference
      expect(next).toBe(state);
    });

    it('skips towns in production processing', () => {
      const town = createTestCity({
        settlementType: 'town',
        happiness: 5,
        isCapital: false,
        productionQueue: [{ type: 'unit', id: 'warrior' }],
        productionProgress: 39,
      });
      const state = createTestState({ cities: new Map([['c1', town]]) });
      const next = productionSystem(state, { type: 'END_TURN' });
      // Town production should be unchanged — skipped entirely
      expect(next.cities.get('c1')!.productionProgress).toBe(39);
    });

    it('cancels stale in-progress wonder construction when the wonder is already unavailable', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'wonder', id: 'pyramids' }],
        productionProgress: 250,
      });
      const state = createTestState({
        builtWonders: ['pyramids'],
        cities: new Map([['c1', city]]),
      });

      const next = productionSystem(state, { type: 'END_TURN' });
      const updatedCity = next.cities.get('c1')!;
      expect(updatedCity.productionQueue).toEqual([]);
      expect(updatedCity.productionProgress).toBe(0);
      expect(updatedCity.buildings).not.toContain('pyramids');

      const cancellation = next.log.find(e => e.message.includes('stopped work on The Pyramids'));
      expect(cancellation).toMatchObject({
        turn: 1,
        playerId: 'p1',
        type: 'production',
        severity: 'warning',
        category: 'production',
        panelTarget: 'city',
      });
      expect(cancellation!.message).toBe('Rome stopped work on The Pyramids because it has already been completed.');
    });

    it('cancels and notifies rival wonder queues when a player completes that wonder', () => {
      const builderCity = createTestCity({
        id: 'c1',
        name: 'Rome',
        owner: 'p1',
        productionQueue: [{ type: 'wonder', id: 'pyramids' }],
        productionProgress: 399,
      });
      const rivalCity = createTestCity({
        id: 'c2',
        name: 'Memphis',
        owner: 'p2',
        position: { q: 6, r: 6 },
        territory: [coordToKey({ q: 6, r: 6 })],
        isCapital: false,
        productionQueue: [{ type: 'wonder', id: 'pyramids' }],
        productionProgress: 200,
      });
      const state = createTestState({
        currentPlayerId: 'p1',
        cities: new Map([['c1', builderCity], ['c2', rivalCity]]),
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', name: 'Player 1' })],
          ['p2', createTestPlayer({ id: 'p2', name: 'Player 2', civilizationId: 'egypt' })],
        ]),
      });

      const next = productionSystem(state, { type: 'END_TURN' });

      expect(next.cities.get('c1')!.buildings).toContain('pyramids');
      expect(next.builtWonders).toContain('pyramids');
      expect(next.cities.get('c2')!.productionQueue).toEqual([]);
      expect(next.cities.get('c2')!.productionProgress).toBe(0);
      expect(next.cities.get('c2')!.buildings).not.toContain('pyramids');

      const completion = next.log.find(e => e.playerId === 'p1' && e.message.includes('built pyramids'));
      expect(completion).toBeDefined();

      const cancellation = next.log.find(e => e.playerId === 'p2' && e.message.includes('stopped work on The Pyramids'));
      expect(cancellation).toMatchObject({
        turn: 1,
        playerId: 'p2',
        type: 'production',
        severity: 'warning',
        category: 'production',
        panelTarget: 'city',
      });
      expect(cancellation!.message).toBe('Memphis stopped work on The Pyramids because a rival completed it.');
    });
  });

  describe('SET_PRODUCTION for towns', () => {
    it('rejects SET_PRODUCTION for a town', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({ cities: new Map([['c1', town]]) });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      // Should return validation error
      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Towns cannot produce - must purchase with gold',
        category: 'production',
      });
      // Production queue should be unchanged
      expect(next.cities.get('c1')!.productionQueue).toEqual([]);
    });
  });

  describe('PURCHASE_ITEM', () => {
    it('purchases a unit instantly for gold', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ gold: 200 })]]),
      });
      const next = productionSystem(state, {
        type: 'PURCHASE_ITEM',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      // Warrior cost = 30, gold cost = 120 (4x per Civ VII)
      expect(next.players.get('p1')!.gold).toBe(80);
      const newUnits = [...next.units.values()].filter(u => u.typeId === 'warrior');
      expect(newUnits.length).toBe(1);
    });

    it('purchases a building instantly for gold', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ gold: 300, researchedTechs: ['pottery'] })]]),
      });
      const next = productionSystem(state, {
        type: 'PURCHASE_ITEM',
        cityId: 'c1',
        itemId: 'granary',
        itemType: 'building',
      });
      // Granary cost = 55, gold cost = 220 (4x per Civ VII)
      expect(next.players.get('p1')!.gold).toBe(80);
      expect(next.cities.get('c1')!.buildings).toContain('granary');
    });

    it('rejects purchase if not enough gold', () => {
      const town = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
      const state = createTestState({
        cities: new Map([['c1', town]]),
        players: new Map([['p1', createTestPlayer({ gold: 10 })]]),
      });
      const next = productionSystem(state, {
        type: 'PURCHASE_ITEM',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      // State should have validation error, not be unchanged
      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Not enough gold (need 120)',
        category: 'production',
      });
      // Units and cities should be unchanged
      expect(next.units).toEqual(state.units);
      expect(next.cities).toEqual(state.cities);
    });
  });

  describe('SET_PRODUCTION — strategic resource requirements', () => {
    /** Build a map where one of the city territory tiles contains the given resource */
    function stateWithResourceOnTerritory(resourceId: string): ReturnType<typeof createTestState> {
      const city = createTestCity();
      // The city territory includes coordToKey({ q: 4, r: 3 }) — put the resource there
      const resourceTileKey = coordToKey({ q: 4, r: 3 });
      const baseState = createTestState({ cities: new Map([['c1', city]]) });
      // Patch the tile in the map to carry the resource
      const newTiles = new Map(baseState.map.tiles);
      const existing = newTiles.get(resourceTileKey)!;
      const patchedTile: HexTile = { ...existing, resource: resourceId };
      newTiles.set(resourceTileKey, patchedTile);
      return {
        ...baseState,
        map: { ...baseState.map, tiles: newTiles },
      };
    }

    it('allows SET_PRODUCTION for a unit with requiredResource when player has access', () => {
      // swordsman requires 'iron' — put iron on a territory tile
      const state = stateWithResourceOnTerritory('iron');
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'swordsman',
        itemType: 'unit',
      });
      expect(next.cities.get('c1')!.productionQueue).toEqual([{ type: 'unit', id: 'swordsman' }]);
    });

    it('rejects SET_PRODUCTION for a unit with requiredResource when player lacks it', () => {
      // swordsman requires 'iron' — no resource on any territory tile
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'swordsman',
        itemType: 'unit',
      });
      // State should include validation error
      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Requires resource: iron',
        category: 'production',
      });
      // Production queue should be unchanged
      expect(next.cities.get('c1')!.productionQueue).toEqual([]);
    });

    it('allows SET_PRODUCTION for units without requiredResource regardless of resources', () => {
      // warrior has no requiredResource — should always be allowed
      const city = createTestCity();
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'warrior',
        itemType: 'unit',
      });
      expect(next.cities.get('c1')!.productionQueue).toEqual([{ type: 'unit', id: 'warrior' }]);
    });
  });

  describe('SET_PRODUCTION / PURCHASE_ITEM admission gates', () => {
    it('rejects SET_PRODUCTION for a building with unmet tech requirement', () => {
      const city = createTestCity({ settlementType: 'city' });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        // Default player has no researchedTechs
        players: new Map([['p1', createTestPlayer()]]),
      });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'library',
        itemType: 'building',
      });
      expect(next.lastValidation).toEqual({
        valid: false,
        reason: 'Requires tech: writing',
        category: 'production',
      });
      expect(next.cities.get('c1')!.productionQueue).toEqual([]);
    });

    it('allows SET_PRODUCTION for a building after required tech is researched', () => {
      const city = createTestCity({ settlementType: 'city' });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        players: new Map([
          ['p1', createTestPlayer({ researchedTechs: ['writing'] })],
        ]),
      });
      const next = productionSystem(state, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'library',
        itemType: 'building',
      });
      expect(next.cities.get('c1')!.productionQueue).toEqual([{ type: 'building', id: 'library' }]);
      expect(next.lastValidation).toBeNull();
    });

    it('rejects SET_PRODUCTION and PURCHASE_ITEM for civic-gated building before civic research', () => {
      const city = createTestCity();
      const cityForPurchase = createTestCity({
        settlementType: 'town',
        happiness: 5,
        isCapital: false,
      });
      const baseState = createTestState({
        cities: new Map([['c1', city], ['c2', cityForPurchase]]),
        players: new Map([['p1', createTestPlayer({ researchedTechs: [], researchedCivics: [], gold: 5000 })]]),
      });

      const queued = productionSystem(baseState, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'worlds_fair',
        itemType: 'building',
      });
      expect(queued.lastValidation).toEqual({
        valid: false,
        reason: 'Requires civic: natural_history',
        category: 'production',
      });
      expect(queued.cities.get('c1')!.productionQueue).toEqual([]);

      const purchased = productionSystem(baseState, {
        type: 'PURCHASE_ITEM',
        cityId: 'c2',
        itemId: 'worlds_fair',
        itemType: 'building',
      });
      expect(purchased.lastValidation).toEqual({
        valid: false,
        reason: 'Requires civic: natural_history',
        category: 'production',
      });
      expect(purchased.cities.get('c2')!.buildings).toEqual([]);
    });

    it('restricts civ-unique buildings to owning civilization for SET_PRODUCTION and PURCHASE_ITEM', () => {
      const city = createTestCity({ settlementType: 'city' });
      const cityForPurchase = createTestCity({
        settlementType: 'town',
        happiness: 5,
        isCapital: false,
      });
      const mismatch = createTestState({
        cities: new Map([['c1', city], ['c2', cityForPurchase]]),
        players: new Map([
          ['p1', createTestPlayer({ researchedTechs: ['bronze_working'], civilizationId: 'rome', gold: 5000 })],
        ]),
      });

      const queuedMismatch = productionSystem(mismatch, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'acropolis',
        itemType: 'building',
      });
      expect(queuedMismatch.lastValidation).toEqual({
        valid: false,
        reason: 'Requires civilization: greece',
        category: 'production',
      });

      const purchasedMismatch = productionSystem(mismatch, {
        type: 'PURCHASE_ITEM',
        cityId: 'c2',
        itemId: 'acropolis',
        itemType: 'building',
      });
      expect(purchasedMismatch.lastValidation).toEqual({
        valid: false,
        reason: 'Requires civilization: greece',
        category: 'production',
      });

      const match = createTestState({
        cities: new Map([['c1', city], ['c2', cityForPurchase]]),
        players: new Map([
          ['p1', createTestPlayer({ researchedTechs: ['bronze_working'], civilizationId: 'greece', gold: 5000 })],
        ]),
      });
      const queuedMatch = productionSystem(match, {
        type: 'SET_PRODUCTION',
        cityId: 'c1',
        itemId: 'acropolis',
        itemType: 'building',
      });
      expect(queuedMatch.lastValidation).toBeNull();
      expect(queuedMatch.cities.get('c1')!.productionQueue).toEqual([{ type: 'building', id: 'acropolis' }]);

      const purchasedMatch = productionSystem(match, {
        type: 'PURCHASE_ITEM',
        cityId: 'c2',
        itemId: 'acropolis',
        itemType: 'building',
      });
      expect(purchasedMatch.lastValidation).toBeNull();
      expect(purchasedMatch.cities.get('c2')!.buildings).toContain('acropolis');
    });
  });
});
