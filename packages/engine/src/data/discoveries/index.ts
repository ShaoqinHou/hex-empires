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

export const ALL_DISCOVERIES: ReadonlyArray<DiscoveryDef> = [
  DISCOVERY_SHRINE,
  DISCOVERY_RUINS,
  DISCOVERY_CAVE,
  DISCOVERY_ENCAMPMENT,
  DISCOVERY_MONOLITH,
];
