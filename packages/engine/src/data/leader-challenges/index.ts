/**
 * Leader Challenges — per-leader milestones that award Leader XP.
 *
 * Two challenges per leader × 9 leaders = 18 total.
 * Leader XP accumulates in AccountState.leaderXP[leaderId] and feeds into
 * leader levels (1-10). Each level unlocks attribute nodes.
 */

import type { AchievementCondition } from '../achievements';

export interface LeaderChallengeDef {
  readonly id: string;
  readonly leaderId: string;
  readonly name: string;
  readonly description: string;
  /** Leader XP awarded on first completion. */
  readonly xp: number;
  /** In-game condition that signals completion. */
  readonly condition: AchievementCondition;
}

export const ALL_LEADER_CHALLENGES: ReadonlyArray<LeaderChallengeDef> = [
  // ── Augustus ──
  {
    id: 'augustus_city_builder',
    leaderId: 'augustus',
    name: 'Pax Romana: Builder',
    description: 'As Augustus, found 5 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 5 },
  },
  {
    id: 'augustus_architect',
    leaderId: 'augustus',
    name: 'Pax Romana: Architect',
    description: 'As Augustus, build 10 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 10 },
  },

  // ── Cleopatra ──
  {
    id: 'cleopatra_trader',
    leaderId: 'cleopatra',
    name: 'Mediterranean Bride: Merchant',
    description: 'As Cleopatra, found 3 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 3 },
  },
  {
    id: 'cleopatra_scholar',
    leaderId: 'cleopatra',
    name: 'Mediterranean Bride: Scholar',
    description: 'As Cleopatra, research 5 technologies.',
    xp: 200,
    condition: { type: 'techs_researched_at_least', count: 5 },
  },

  // ── Pericles ──
  {
    id: 'pericles_culturalist',
    leaderId: 'pericles',
    name: 'Surrounded by Glory: Patron',
    description: 'As Pericles, build 8 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 8 },
  },
  {
    id: 'pericles_founder',
    leaderId: 'pericles',
    name: 'Surrounded by Glory: Founder',
    description: 'As Pericles, found 4 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 4 },
  },

  // ── Cyrus ──
  {
    id: 'cyrus_conqueror',
    leaderId: 'cyrus',
    name: 'Fall of Babylon: Conqueror',
    description: 'As Cyrus, win 5 combats.',
    xp: 200,
    condition: { type: 'combat_wins_at_least', count: 5 },
  },
  {
    id: 'cyrus_empire',
    leaderId: 'cyrus',
    name: 'Fall of Babylon: Empire',
    description: 'As Cyrus, found 4 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 4 },
  },

  // ── Gandhi ──
  {
    id: 'gandhi_peaceful',
    leaderId: 'gandhi',
    name: 'Satyagraha: Peaceful',
    description: 'As Gandhi, research 8 technologies.',
    xp: 200,
    condition: { type: 'techs_researched_at_least', count: 8 },
  },
  {
    id: 'gandhi_builder',
    leaderId: 'gandhi',
    name: 'Satyagraha: Builder',
    description: 'As Gandhi, build 12 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 12 },
  },

  // ── Qin Shi Huang ──
  {
    id: 'qin_wonder',
    leaderId: 'qin_shi_huang',
    name: 'First Emperor: Wonder',
    description: 'As Qin Shi Huang, build 15 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 15 },
  },
  {
    id: 'qin_empire',
    leaderId: 'qin_shi_huang',
    name: 'First Emperor: Empire',
    description: 'As Qin Shi Huang, found 6 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 6 },
  },

  // ── Alexander ──
  {
    id: 'alexander_warrior',
    leaderId: 'alexander',
    name: "World's End: Warrior",
    description: 'As Alexander, win 8 combats.',
    xp: 200,
    condition: { type: 'combat_wins_at_least', count: 8 },
  },
  {
    id: 'alexander_explorer',
    leaderId: 'alexander',
    name: "World's End: Explorer",
    description: 'As Alexander, found 5 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 5 },
  },

  // ── Hatshepsut ──
  {
    id: 'hatshepsut_builder',
    leaderId: 'hatshepsut',
    name: 'Eye of Horus: Builder',
    description: 'As Hatshepsut, build 10 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 10 },
  },
  {
    id: 'hatshepsut_age',
    leaderId: 'hatshepsut',
    name: 'Eye of Horus: Age Transcendent',
    description: 'As Hatshepsut, reach the Exploration Age.',
    xp: 200,
    condition: { type: 'age_at_least', age: 'exploration' },
  },

  // ── Genghis Khan ──
  {
    id: 'genghis_conqueror',
    leaderId: 'genghis_khan',
    name: 'Mongol Horde: Conqueror',
    description: 'As Genghis Khan, win 10 combats.',
    xp: 200,
    condition: { type: 'combat_wins_at_least', count: 10 },
  },
  {
    id: 'genghis_empire',
    leaderId: 'genghis_khan',
    name: 'Mongol Horde: Empire',
    description: 'As Genghis Khan, found 6 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 6 },
  },
];
