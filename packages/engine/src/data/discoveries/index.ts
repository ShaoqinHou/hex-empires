import type { DiscoveryDef } from '../../types/NarrativeEvent';

export const DISCOVERY_SHRINE: DiscoveryDef = {
  id: 'discovery_shrine',
  narrativeEventId: 'desert_shrine',
  label: 'Ancient Shrine',
};

export const DISCOVERY_RUINS: DiscoveryDef = {
  id: 'discovery_ruins',
  narrativeEventId: 'ancient_ruins',
  label: 'Ancient Ruins',
};

export const DISCOVERY_CAVE: DiscoveryDef = {
  id: 'discovery_cave',
  narrativeEventId: 'sacred_cave',
  label: 'Sacred Cave',
};

export const DISCOVERY_ENCAMPMENT: DiscoveryDef = {
  id: 'discovery_encampment',
  narrativeEventId: 'first_barbarian_village',
  label: 'Barbarian Encampment',
};

export const DISCOVERY_MONOLITH: DiscoveryDef = {
  id: 'discovery_monolith',
  narrativeEventId: 'standing_stones',
  label: 'Standing Stones',
};

// ── EE5.2: Reward-bearing discoveries (direct reward via EXPLORE_DISCOVERY) ──

/** Ancient stone tablets filled with early mathematical knowledge. */
export const DISCOVERY_ANCIENT_TABLET: DiscoveryDef = {
  id: 'discovery_ancient_tablet',
  narrativeEventId: 'desert_shrine', // fallback narrative if explored without EXPLORE_DISCOVERY
  label: 'Ancient Tablet',
  reward: { type: 'science', amount: 30 },
};

/** A hidden cache of gold left by long-departed traders. */
export const DISCOVERY_HIDDEN_CACHE: DiscoveryDef = {
  id: 'discovery_hidden_cache',
  narrativeEventId: 'ancient_ruins',
  label: 'Hidden Cache',
  reward: { type: 'gold', amount: 50 },
};

/** A ruined hall whose walls depict the heroic songs of an ancient people. */
export const DISCOVERY_RUINED_TEMPLE: DiscoveryDef = {
  id: 'discovery_ruined_temple',
  narrativeEventId: 'standing_stones',
  label: 'Ruined Temple',
  reward: { type: 'culture', amount: 40 },
};

export const ALL_DISCOVERIES: ReadonlyArray<DiscoveryDef> = [
  DISCOVERY_SHRINE,
  DISCOVERY_RUINS,
  DISCOVERY_CAVE,
  DISCOVERY_ENCAMPMENT,
  DISCOVERY_MONOLITH,
  DISCOVERY_ANCIENT_TABLET,
  DISCOVERY_HIDDEN_CACHE,
  DISCOVERY_RUINED_TEMPLE,
];
