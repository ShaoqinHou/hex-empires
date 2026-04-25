/**
 * Traditions data barrel — all TraditionDef entries collected into ALL_TRADITIONS.
 *
 * 6 starter traditions: 2 per age (antiquity, exploration, modern).
 * Full tradition catalog is expanded in later phases; this scaffold
 * establishes the registry pattern.
 */

import type { TraditionDef } from '../../types/Tradition';

// ── Antiquity traditions ─────────────────────────────────────────────────────

export const TRADITION_BRONZE_CRAFTSMANSHIP: TraditionDef = {
  id: 'tradition-bronze-craftsmanship',
  name: 'Bronze Craftsmanship',
  age: 'antiquity',
  unlockCivic: 'craftsmanship',
  description: 'Mastery of early metalwork. Improved tiles yield +1 Production empire-wide.',
  effect: [
    { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
  ],
};

export const TRADITION_TRADE_NETWORKS: TraditionDef = {
  id: 'tradition-trade-networks',
  name: 'Trade Networks',
  age: 'antiquity',
  unlockCivic: 'foreign_trade',
  description: 'Ancient trade roads bind your cities. Gain +2 Gold per turn across your empire.',
  effect: [
    { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
  ],
};

// ── Exploration traditions ────────────────────────────────────────────────────

export const TRADITION_CIVIC_PRIDE: TraditionDef = {
  id: 'tradition-civic-pride',
  name: 'Civic Pride',
  age: 'exploration',
  unlockCivic: 'humanism',
  description: 'Renaissance values inspire your citizens. +2 Culture per turn empire-wide.',
  effect: [
    { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
  ],
};

export const TRADITION_MERCANTILE_FLEET: TraditionDef = {
  id: 'tradition-mercantile-fleet',
  name: 'Mercantile Fleet',
  age: 'exploration',
  unlockCivic: 'mercantilism',
  description: 'Your merchant vessels dominate distant seas. +3 Gold per turn empire-wide.',
  effect: [
    { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
  ],
};

// ── Modern traditions ─────────────────────────────────────────────────────────

export const TRADITION_INDUSTRIAL_MIGHT: TraditionDef = {
  id: 'tradition-industrial-might',
  name: 'Industrial Might',
  age: 'modern',
  unlockCivic: 'ideology',
  description: 'Industrial revolution transforms your economy. +3 Production per turn empire-wide.',
  effect: [
    { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 3 },
  ],
};

export const TRADITION_DEMOCRATIC_RENEWAL: TraditionDef = {
  id: 'tradition-democratic-renewal',
  name: 'Democratic Renewal',
  age: 'modern',
  unlockCivic: 'suffrage',
  description: 'Universal participation fuels innovation. +3 Science per turn empire-wide.',
  effect: [
    { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
  ],
};

// ── Barrel export ─────────────────────────────────────────────────────────────

export const ALL_TRADITIONS: ReadonlyArray<TraditionDef> = [
  TRADITION_BRONZE_CRAFTSMANSHIP,
  TRADITION_TRADE_NETWORKS,
  TRADITION_CIVIC_PRIDE,
  TRADITION_MERCANTILE_FLEET,
  TRADITION_INDUSTRIAL_MIGHT,
  TRADITION_DEMOCRATIC_RENEWAL,
];
