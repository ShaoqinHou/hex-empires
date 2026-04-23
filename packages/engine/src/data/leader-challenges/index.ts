/**
 * Leader Challenges — per-leader milestones that award Leader XP.
 *
 * Two challenges per leader × 9 leaders (Tier 1) + 12 Tier-2 challenges = 30 total.
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
    name: 'Imperium Maius: Builder',
    description: 'As Augustus, found 5 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 5 },
  },
  {
    id: 'augustus_architect',
    leaderId: 'augustus',
    name: 'Imperium Maius: Architect',
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
    name: 'Gods Wife of Amun: Builder',
    description: 'As Hatshepsut, build 10 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 10 },
  },
  {
    id: 'hatshepsut_age',
    leaderId: 'hatshepsut',
    name: 'Gods Wife of Amun: Age Transcendent',
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

  // ── Augustus Tier 2 ──
  {
    id: 'augustus_road_builder',
    leaderId: 'augustus',
    name: 'Imperium Maius: Road Builder',
    description: 'As Augustus, found 8 cities.',
    xp: 350,
    condition: { type: 'cities_at_least', count: 8 },
  },
  {
    id: 'augustus_scholar',
    leaderId: 'augustus',
    name: 'Imperium Maius: Scholar',
    description: 'As Augustus, research 10 technologies.',
    xp: 350,
    condition: { type: 'techs_researched_at_least', count: 10 },
  },

  // ── Cleopatra Tier 2 ──
  {
    id: 'cleopatra_conqueror',
    leaderId: 'cleopatra',
    name: 'Mediterranean Bride: Conqueror',
    description: 'As Cleopatra, win 5 combats.',
    xp: 350,
    condition: { type: 'combat_wins_at_least', count: 5 },
  },
  {
    id: 'cleopatra_patron',
    leaderId: 'cleopatra',
    name: 'Mediterranean Bride: Patron',
    description: 'As Cleopatra, build 15 buildings.',
    xp: 350,
    condition: { type: 'buildings_built_at_least', count: 15 },
  },

  // ── Pericles Tier 2 ──
  {
    id: 'pericles_scholar',
    leaderId: 'pericles',
    name: 'Surrounded by Glory: Scholar',
    description: 'As Pericles, research 12 technologies.',
    xp: 350,
    condition: { type: 'techs_researched_at_least', count: 12 },
  },
  {
    id: 'pericles_warrior',
    leaderId: 'pericles',
    name: 'Surrounded by Glory: Warrior',
    description: 'As Pericles, win 8 combats.',
    xp: 350,
    condition: { type: 'combat_wins_at_least', count: 8 },
  },

  // ── Cyrus Tier 2 ──
  {
    id: 'cyrus_builder',
    leaderId: 'cyrus',
    name: 'Fall of Babylon: Builder',
    description: 'As Cyrus, build 12 buildings.',
    xp: 350,
    condition: { type: 'buildings_built_at_least', count: 12 },
  },
  {
    id: 'cyrus_scholar',
    leaderId: 'cyrus',
    name: 'Fall of Babylon: Scholar',
    description: 'As Cyrus, research 8 technologies.',
    xp: 350,
    condition: { type: 'techs_researched_at_least', count: 8 },
  },

  // ── Gandhi Tier 2 ──
  {
    id: 'gandhi_culturalist',
    leaderId: 'gandhi',
    name: 'Satyagraha: Culturalist',
    description: 'As Gandhi, found 5 cities.',
    xp: 350,
    condition: { type: 'cities_at_least', count: 5 },
  },
  {
    id: 'gandhi_sage',
    leaderId: 'gandhi',
    name: 'Satyagraha: Sage',
    description: 'As Gandhi, research 15 technologies.',
    xp: 350,
    condition: { type: 'techs_researched_at_least', count: 15 },
  },

  // ── Qin Shi Huang Tier 2 ──
  {
    id: 'qin_scholar',
    leaderId: 'qin_shi_huang',
    name: 'First Emperor: Scholar',
    description: 'As Qin Shi Huang, research 12 technologies.',
    xp: 350,
    condition: { type: 'techs_researched_at_least', count: 12 },
  },
  {
    id: 'qin_warrior',
    leaderId: 'qin_shi_huang',
    name: 'First Emperor: Warrior',
    description: 'As Qin Shi Huang, win 10 combats.',
    xp: 350,
    condition: { type: 'combat_wins_at_least', count: 10 },
  },

  // ── Confucius ──
  {
    id: 'confucius_scholar',
    leaderId: 'confucius',
    name: 'Great Teacher: Scholar',
    description: 'As Confucius, research 10 technologies.',
    xp: 200,
    condition: { type: 'techs_researched_at_least', count: 10 },
  },
  {
    id: 'confucius_builder',
    leaderId: 'confucius',
    name: 'Great Teacher: Builder',
    description: 'As Confucius, build 8 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 8 },
  },

  // ── Ibn Battuta ──
  {
    id: 'ibn_battuta_explorer',
    leaderId: 'ibn_battuta',
    name: 'Travels: Explorer',
    description: 'As Ibn Battuta, found 5 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 5 },
  },
  {
    id: 'ibn_battuta_trader',
    leaderId: 'ibn_battuta',
    name: 'Travels: Trader',
    description: 'As Ibn Battuta, build 6 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 6 },
  },

  // ── Harriet Tubman ──
  {
    id: 'harriet_tubman_defender',
    leaderId: 'harriet_tubman',
    name: 'Underground Railroad: Defender',
    description: 'As Harriet Tubman, win 6 combats.',
    xp: 200,
    condition: { type: 'combat_wins_at_least', count: 6 },
  },
  {
    id: 'harriet_tubman_diplomat',
    leaderId: 'harriet_tubman',
    name: 'Underground Railroad: Diplomat',
    description: 'As Harriet Tubman, found 4 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 4 },
  },

  // ── Napoleon ──
  {
    id: 'napoleon_conqueror',
    leaderId: 'napoleon',
    name: 'Empereur: Conqueror',
    description: 'As Napoleon, win 8 combats.',
    xp: 200,
    condition: { type: 'combat_wins_at_least', count: 8 },
  },
  {
    id: 'napoleon_patron',
    leaderId: 'napoleon',
    name: 'Empereur: Patron',
    description: 'As Napoleon, build 10 buildings.',
    xp: 200,
    condition: { type: 'buildings_built_at_least', count: 10 },
  },

  // ── Tecumseh ──
  {
    id: 'tecumseh_defender',
    leaderId: 'tecumseh',
    name: 'Pan-Confederacy: Defender',
    description: 'As Tecumseh, win 6 combats.',
    xp: 200,
    condition: { type: 'combat_wins_at_least', count: 6 },
  },
  {
    id: 'tecumseh_unifier',
    leaderId: 'tecumseh',
    name: 'Pan-Confederacy: Unifier',
    description: 'As Tecumseh, found 5 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 5 },
  },

  // ── Napoleon (Revolutionary) ──
  {
    id: 'napoleon_revolutionary_zeal',
    leaderId: 'napoleon_revolutionary',
    name: 'Revolutionary Zeal: Liberator',
    description: 'As Napoleon (Revolutionary), win 10 combats.',
    xp: 200,
    condition: { type: 'combat_wins_at_least', count: 10 },
  },
  {
    id: 'napoleon_revolutionary_empire',
    leaderId: 'napoleon_revolutionary',
    name: 'Revolutionary Zeal: Empire',
    description: 'As Napoleon (Revolutionary), found 6 cities.',
    xp: 200,
    condition: { type: 'cities_at_least', count: 6 },
  },

  // ── Tier 3 / Mastery challenges ──

  // ── Augustus Tier 3 ──
  {
    id: 'augustus_magnate',
    leaderId: 'augustus',
    name: 'Imperium Maius: Magnate',
    description: 'As Augustus, build 20 buildings.',
    xp: 400,
    condition: { type: 'buildings_built_at_least', count: 20 },
  },

  // ── Cleopatra Tier 3 ──
  {
    id: 'cleopatra_pharaoh',
    leaderId: 'cleopatra',
    name: 'Mediterranean Bride: Pharaoh',
    description: 'As Cleopatra, found 7 cities.',
    xp: 400,
    condition: { type: 'cities_at_least', count: 7 },
  },

  // ── Pericles Tier 3 ──
  {
    id: 'pericles_statesman',
    leaderId: 'pericles',
    name: 'Surrounded by Glory: Statesman',
    description: 'As Pericles, build 15 buildings and found 5 cities.',
    xp: 400,
    condition: { type: 'buildings_built_at_least', count: 15 },
  },

  // ── Cyrus Tier 3 ──
  {
    id: 'cyrus_liberator',
    leaderId: 'cyrus',
    name: 'Fall of Babylon: Liberator',
    description: 'As Cyrus, win 15 combats.',
    xp: 400,
    condition: { type: 'combat_wins_at_least', count: 15 },
  },

  // ── Gandhi Tier 3 ──
  {
    id: 'gandhi_mahatma',
    leaderId: 'gandhi',
    name: 'Satyagraha: Mahatma',
    description: 'As Gandhi, research 20 technologies.',
    xp: 400,
    condition: { type: 'techs_researched_at_least', count: 20 },
  },

  // ── Qin Shi Huang Tier 3 ──
  {
    id: 'qin_mason',
    leaderId: 'qin_shi_huang',
    name: 'First Emperor: Grand Mason',
    description: 'As Qin Shi Huang, build 25 buildings.',
    xp: 400,
    condition: { type: 'buildings_built_at_least', count: 25 },
  },

  // ── Alexander Tier 3 ──
  {
    id: 'alexander_titan',
    leaderId: 'alexander',
    name: "World's End: Titan",
    description: 'As Alexander, win 20 combats.',
    xp: 400,
    condition: { type: 'combat_wins_at_least', count: 20 },
  },

  // ── Hatshepsut Tier 3 ──
  {
    id: 'hatshepsut_pharaoh',
    leaderId: 'hatshepsut',
    name: 'Gods Wife of Amun: Pharaoh',
    description: 'As Hatshepsut, research 15 technologies.',
    xp: 400,
    condition: { type: 'techs_researched_at_least', count: 15 },
  },

  // ── Genghis Khan Tier 3 ──
  {
    id: 'genghis_khanate',
    leaderId: 'genghis_khan',
    name: 'Mongol Horde: Khanate',
    description: 'As Genghis Khan, win 25 combats.',
    xp: 400,
    condition: { type: 'combat_wins_at_least', count: 25 },
  },

  // ── Confucius Tier 3 ──
  {
    id: 'confucius_sage',
    leaderId: 'confucius',
    name: 'Great Teacher: Sage',
    description: 'As Confucius, research 18 technologies.',
    xp: 400,
    condition: { type: 'techs_researched_at_least', count: 18 },
  },

  // ── Ibn Battuta Tier 3 ──
  {
    id: 'ibn_battuta_cosmopolitan',
    leaderId: 'ibn_battuta',
    name: 'Travels: Cosmopolitan',
    description: 'As Ibn Battuta, found 8 cities.',
    xp: 400,
    condition: { type: 'cities_at_least', count: 8 },
  },

  // ── Harriet Tubman Tier 3 ──
  {
    id: 'harriet_tubman_conductor',
    leaderId: 'harriet_tubman',
    name: 'Underground Railroad: Conductor',
    description: 'As Harriet Tubman, found 7 cities.',
    xp: 400,
    condition: { type: 'cities_at_least', count: 7 },
  },

  // ── Napoleon Tier 3 ──
  {
    id: 'napoleon_emperor',
    leaderId: 'napoleon',
    name: 'Empereur: Emperor',
    description: 'As Napoleon, win 15 combats.',
    xp: 400,
    condition: { type: 'combat_wins_at_least', count: 15 },
  },

  // ── Tecumseh Tier 3 ──
  {
    id: 'tecumseh_chief',
    leaderId: 'tecumseh',
    name: 'Pan-Confederacy: Chief',
    description: 'As Tecumseh, win 12 combats.',
    xp: 400,
    condition: { type: 'combat_wins_at_least', count: 12 },
  },

  // ── Napoleon (Revolutionary) Tier 3 ──
  {
    id: 'napoleon_revolutionary_dictator',
    leaderId: 'napoleon_revolutionary',
    name: 'Revolutionary Zeal: Consul',
    description: 'As Napoleon (Revolutionary), found 8 cities.',
    xp: 400,
    condition: { type: 'cities_at_least', count: 8 },
  },
];
