import type { TreatyDef } from '../../types/Treaty';

/** Y5 — Treaty type stubs (diplomacy F-06). */

export const OPEN_BORDERS: TreatyDef = {
  id: 'open_borders',
  name: 'Open Borders',
  description: 'Allow mutual passage through each other\'s territory.',
  influenceCost: 20,
  durationTurns: 30,
  effectCategory: 'border',
} as const;

export const IMPROVE_TRADE_RELATIONS: TreatyDef = {
  id: 'improve_trade_relations',
  name: 'Improve Trade Relations',
  description: 'Boost gold yields from trade routes between the two empires.',
  influenceCost: 25,
  durationTurns: 30,
  effectCategory: 'trade',
} as const;

export const DENOUNCE_MILITARY_PRESENCE: TreatyDef = {
  id: 'denounce_military_presence',
  name: 'Denounce Military Presence',
  description: 'Diplomatically pressure a rival to reduce military forces near your borders.',
  influenceCost: 15,
  durationTurns: 20,
  effectCategory: 'political',
} as const;
