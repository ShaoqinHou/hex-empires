import { describe, it, expect } from 'vitest';
import { narrativeEventSystem, enqueueDiscoveryEvent } from '../narrativeEventSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { NarrativeEventDef } from '../../types/NarrativeEvent';
import type { GameConfig } from '../../types/GameConfig';

// ── Test fixtures ──

const SIMPLE_EVENT: NarrativeEventDef = {
  id: 'test_event',
  title: 'Test Event',
  vignette: 'Something happened.',
  category: 'misc',
  requirements: { triggerType: 'END_TURN', excludesTags: ['test-done'] },
  choices: [
    {
      label: 'Take gold (+50)',
      effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 50 }],
      tagOutput: ['test-done', 'took-gold'],
    },
    {
      label: 'Take culture (+10)',
      effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 10 }],
      tagOutput: ['test-done'],
    },
  ],
};

const DISCOVERY_EVENT: NarrativeEventDef = {
  id: 'discovery_event',
  title: 'Discovery',
  vignette: 'You found something.',
  category: 'discovery',
  requirements: { triggerType: 'DISCOVERY_EXPLORED', excludesTags: ['found-discovery'] },
  choices: [
    {
      label: 'Investigate (+20 science)',
      effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 20 }],
      tagOutput: ['found-discovery'],
    },
  ],
};

function makeConfig(events: ReadonlyArray<NarrativeEventDef>): Partial<GameConfig> {
  const narrativeEvents = new Map<string, NarrativeEventDef>();
  for (const e of events) narrativeEvents.set(e.id, e);
  return { narrativeEvents };
}

// ── Tests ──

describe('narrativeEventSystem', () => {
  describe('END_TURN evaluation', () => {
    it('enqueues a matching event on END_TURN', () => {
      const state = createTestState({
        config: { ...createTestState().config, ...makeConfig([SIMPLE_EVENT]) },
      });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect(next.pendingNarrativeEvents).toContain('test_event');
    });

    it('marks the event as fired after enqueue', () => {
      const state = createTestState({
        config: { ...createTestState().config, ...makeConfig([SIMPLE_EVENT]) },
      });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect(next.firedNarrativeEvents).toContain('test_event');
    });

    it('fires at most ONE event per END_TURN when multiple match', () => {
      const eventA: NarrativeEventDef = {
        ...SIMPLE_EVENT,
        id: 'event_a',
        requirements: { triggerType: 'END_TURN' },
      };
      const eventB: NarrativeEventDef = {
        ...SIMPLE_EVENT,
        id: 'event_b',
        requirements: { triggerType: 'END_TURN' },
      };
      const state = createTestState({
        config: { ...createTestState().config, ...makeConfig([eventA, eventB]) },
      });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect((next.pendingNarrativeEvents ?? []).length).toBe(1);
    });

    it('dedup: does not fire an event that is already in firedNarrativeEvents', () => {
      const state = createTestState({
        firedNarrativeEvents: ['test_event'],
        config: { ...createTestState().config, ...makeConfig([SIMPLE_EVENT]) },
      });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect(next.pendingNarrativeEvents ?? []).not.toContain('test_event');
    });

    it('respects excludesTags: skips event if player has the tag', () => {
      const player = createTestPlayer({ id: 'p1', narrativeTags: ['test-done'] });
      const state = createTestState({
        players: new Map([['p1', player]]),
        config: { ...createTestState().config, ...makeConfig([SIMPLE_EVENT]) },
      });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect(next.pendingNarrativeEvents ?? []).not.toContain('test_event');
    });

    it('respects requiresTags: skips event if player is missing required tag', () => {
      const requiredEvent: NarrativeEventDef = {
        ...SIMPLE_EVENT,
        id: 'required_tag_event',
        requirements: { triggerType: 'END_TURN', requiresTags: ['special-tag'] },
      };
      const state = createTestState({
        config: { ...createTestState().config, ...makeConfig([requiredEvent]) },
      });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect(next.pendingNarrativeEvents ?? []).not.toContain('required_tag_event');
    });

    it('does not fire DISCOVERY_EXPLORED events on END_TURN', () => {
      const state = createTestState({
        config: { ...createTestState().config, ...makeConfig([DISCOVERY_EVENT]) },
      });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect(next.pendingNarrativeEvents ?? []).not.toContain('discovery_event');
    });

    it('is a no-op when narrativeEvents config is absent', () => {
      const baseConfig = createTestState().config;
      // Explicitly remove narrativeEvents from config
      const configWithoutNE: typeof baseConfig = { ...baseConfig, narrativeEvents: undefined };
      const state = createTestState({ config: configWithoutNE });
      const next = narrativeEventSystem(state, { type: 'END_TURN' });
      expect(next).toBe(state); // same reference — no mutation
    });
  });

  describe('RESOLVE_NARRATIVE_EVENT', () => {
    it('applies MODIFY_YIELD gold effect on resolution', () => {
      const narrativeEvents = new Map([['test_event', SIMPLE_EVENT]]);
      const state = createTestState({
        pendingNarrativeEvents: ['test_event'],
        config: { ...createTestState().config, narrativeEvents },
        players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 100 })]]),
      });
      const next = narrativeEventSystem(state, {
        type: 'RESOLVE_NARRATIVE_EVENT',
        eventId: 'test_event',
        choiceIndex: 0, // take gold
      });
      expect(next.players.get('p1')!.gold).toBe(150); // 100 + 50
    });

    it('applies MODIFY_YIELD culture effect on resolution', () => {
      const narrativeEvents = new Map([['test_event', SIMPLE_EVENT]]);
      const state = createTestState({
        pendingNarrativeEvents: ['test_event'],
        config: { ...createTestState().config, narrativeEvents },
        players: new Map([['p1', createTestPlayer({ id: 'p1', culture: 5 })]]),
      });
      const next = narrativeEventSystem(state, {
        type: 'RESOLVE_NARRATIVE_EVENT',
        eventId: 'test_event',
        choiceIndex: 1, // take culture
      });
      expect(next.players.get('p1')!.culture).toBe(15); // 5 + 10
    });

    it('writes tagOutput to PlayerState.narrativeTags', () => {
      const narrativeEvents = new Map([['test_event', SIMPLE_EVENT]]);
      const state = createTestState({
        pendingNarrativeEvents: ['test_event'],
        config: { ...createTestState().config, narrativeEvents },
      });
      const next = narrativeEventSystem(state, {
        type: 'RESOLVE_NARRATIVE_EVENT',
        eventId: 'test_event',
        choiceIndex: 0, // tagOutput: ['test-done', 'took-gold']
      });
      const tags = next.players.get('p1')!.narrativeTags ?? [];
      expect(tags).toContain('test-done');
      expect(tags).toContain('took-gold');
    });

    it('removes event from pendingNarrativeEvents queue after resolution', () => {
      const narrativeEvents = new Map([['test_event', SIMPLE_EVENT]]);
      const state = createTestState({
        pendingNarrativeEvents: ['test_event'],
        config: { ...createTestState().config, narrativeEvents },
      });
      const next = narrativeEventSystem(state, {
        type: 'RESOLVE_NARRATIVE_EVENT',
        eventId: 'test_event',
        choiceIndex: 0,
      });
      expect(next.pendingNarrativeEvents ?? []).not.toContain('test_event');
    });

    it('does not duplicate tags if already present', () => {
      const narrativeEvents = new Map([['test_event', SIMPLE_EVENT]]);
      const player = createTestPlayer({ id: 'p1', narrativeTags: ['test-done'] });
      const state = createTestState({
        pendingNarrativeEvents: ['test_event'],
        config: { ...createTestState().config, narrativeEvents },
        players: new Map([['p1', player]]),
      });
      const next = narrativeEventSystem(state, {
        type: 'RESOLVE_NARRATIVE_EVENT',
        eventId: 'test_event',
        choiceIndex: 0,
      });
      const tags = next.players.get('p1')!.narrativeTags ?? [];
      const testDoneCount = tags.filter(t => t === 'test-done').length;
      expect(testDoneCount).toBe(1);
    });

    it('no-ops for unknown eventId', () => {
      const state = createTestState({
        config: { ...createTestState().config, ...makeConfig([SIMPLE_EVENT]) },
      });
      const next = narrativeEventSystem(state, {
        type: 'RESOLVE_NARRATIVE_EVENT',
        eventId: 'does_not_exist',
        choiceIndex: 0,
      });
      expect(next).toBe(state);
    });

    it('no-ops for out-of-range choiceIndex', () => {
      const narrativeEvents = new Map([['test_event', SIMPLE_EVENT]]);
      const state = createTestState({
        pendingNarrativeEvents: ['test_event'],
        config: { ...createTestState().config, narrativeEvents },
      });
      const next = narrativeEventSystem(state, {
        type: 'RESOLVE_NARRATIVE_EVENT',
        eventId: 'test_event',
        choiceIndex: 99,
      });
      expect(next).toBe(state);
    });
  });

  describe('enqueueDiscoveryEvent (F-06)', () => {
    it('enqueues a discovery event when not yet fired', () => {
      const narrativeEvents = new Map([['discovery_event', DISCOVERY_EVENT]]);
      const state = createTestState({
        config: { ...createTestState().config, narrativeEvents },
      });
      const next = enqueueDiscoveryEvent(state, 'discovery_event');
      expect(next.pendingNarrativeEvents).toContain('discovery_event');
      expect(next.firedNarrativeEvents).toContain('discovery_event');
    });

    it('is a no-op if discovery event already fired (dedup)', () => {
      const narrativeEvents = new Map([['discovery_event', DISCOVERY_EVENT]]);
      const state = createTestState({
        firedNarrativeEvents: ['discovery_event'],
        config: { ...createTestState().config, narrativeEvents },
      });
      const next = enqueueDiscoveryEvent(state, 'discovery_event');
      // Should not add a second entry to the queue
      const count = (next.pendingNarrativeEvents ?? []).filter(id => id === 'discovery_event').length;
      expect(count).toBe(0);
    });

    it('is a no-op for unknown narrativeEventId', () => {
      const state = createTestState();
      const next = enqueueDiscoveryEvent(state, 'no_such_event');
      expect(next).toBe(state);
    });
  });

  describe('content validation — ALL_NARRATIVE_EVENTS', () => {
    it('all 10 events have unique ids', async () => {
      const { ALL_NARRATIVE_EVENTS } = await import('../../data/narrative-events');
      const ids = ALL_NARRATIVE_EVENTS.map(e => e.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('all 10 events have at least one choice', async () => {
      const { ALL_NARRATIVE_EVENTS } = await import('../../data/narrative-events');
      for (const e of ALL_NARRATIVE_EVENTS) {
        expect(e.choices.length).toBeGreaterThan(0);
      }
    });

    it('all events have non-empty title and vignette', async () => {
      const { ALL_NARRATIVE_EVENTS } = await import('../../data/narrative-events');
      for (const e of ALL_NARRATIVE_EVENTS) {
        expect(e.title.length).toBeGreaterThan(0);
        expect(e.vignette.length).toBeGreaterThan(0);
      }
    });

    it('all 5 discoveries reference existing narrative event ids', async () => {
      const { ALL_NARRATIVE_EVENTS } = await import('../../data/narrative-events');
      const { ALL_DISCOVERIES } = await import('../../data/discoveries');
      const eventIds = new Set(ALL_NARRATIVE_EVENTS.map(e => e.id));
      for (const d of ALL_DISCOVERIES) {
        expect(eventIds.has(d.narrativeEventId)).toBe(true);
      }
    });
  });
});
