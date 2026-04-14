/**
 * Antiquity Age Governors
 *
 * Foundational governors available in the first age.
 */

import type { GovernorDef, GovernorAbility } from '../../types/Governor';

/**
 * Helper to create abilities
 */
const ability = (
  id: string,
  name: string,
  description: string,
  requiredLevel: number,
  effect: GovernorAbility['effect'],
): GovernorAbility => ({
  id,
  name,
  description,
  requiredLevel,
  effect,
});

/**
 * MAGNUS - Economic Governor
 * Specializes in gold, trade, and food production
 */
export const MAGNUS: GovernorDef = {
  id: 'magnus',
  name: 'Magnus',
  title: 'administrator',
  specialization: 'economic',
  baseAbilities: [
    ability(
      'magnus_base',
      'Merchant Background',
      '+15% Gold yield in assigned city',
      1,
      { type: 'yield_bonus', value: 15, yieldType: 'gold' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'magnus_trade',
      'Trade Network',
      '+1 Gold from all trade routes originating in assigned city',
      2,
      { type: 'yield_bonus', value: 1, yieldType: 'gold' },
    ),
    ability(
      'magnus_food',
      'Harvest Master',
      '+10% Food yield in assigned city',
      3,
      { type: 'yield_bonus', value: 10, yieldType: 'food' },
    ),
    ability(
      'magnus_commercial',
      'Commercial Hub',
      '+25% Gold from Commercial Hub districts in assigned city',
      4,
      { type: 'yield_bonus', value: 25, yieldType: 'gold' },
    ),
    ability(
      'magnus_tax',
      'Tax Collector',
      '+2 Gold per population in assigned city',
      5,
      { type: 'yield_bonus', value: 2, yieldType: 'gold' },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

/**
 * VICTORIA - Military Governor
 * Specializes in production, experience, and combat
 */
export const VICTORIA: GovernorDef = {
  id: 'victoria',
  name: 'Victoria',
  title: 'administrator',
  specialization: 'military',
  baseAbilities: [
    ability(
      'victoria_base',
      'Military Discipline',
      '+15% Production in assigned city',
      1,
      { type: 'production_bonus', value: 15 },
    ),
  ],
  unlockableAbilities: [
    ability(
      'victoria_barracks',
      'Barracks Commander',
      'Units built in assigned city start with +5 XP',
      2,
      { type: 'special', value: 5 },
    ),
    ability(
      'victoria_encampment',
      'Fortification Expert',
      '+25% Production toward Encampment districts',
      3,
      { type: 'production_bonus', value: 25 },
    ),
    ability(
      'victoria_veteran',
      'Veteran Training',
      '+1 CS for all land units in assigned city',
      4,
      { type: 'combat_bonus', value: 1 },
    ),
    ability(
      'victoria_defense',
      'City Defender',
      '+5 City defense HP in assigned city',
      5,
      { type: 'special', value: 5 },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

/**
 * GALILEO - Scientific Governor
 * Specializes in science, research, and great people
 */
export const GALILEO: GovernorDef = {
  id: 'galileo',
  name: 'Galileo',
  title: 'administrator',
  specialization: 'scientific',
  baseAbilities: [
    ability(
      'galileo_base',
      'Scientific Mind',
      '+15% Science yield in assigned city',
      1,
      { type: 'yield_bonus', value: 15, yieldType: 'science' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'galileo_campus',
      'Academic Leadership',
      '+25% Science from Campus districts in assigned city',
      2,
      { type: 'yield_bonus', value: 25, yieldType: 'science' },
    ),
    ability(
      'galileo_research',
      'Research Lab',
      '+10% Science from all buildings in assigned city',
      3,
      { type: 'yield_bonus', value: 10, yieldType: 'science' },
    ),
    ability(
      'galileo_mountains',
      'Mountain Observatory',
      '+1 Science from adjacent Mountain tiles',
      4,
      { type: 'yield_bonus', value: 1, yieldType: 'science' },
    ),
    ability(
      'galileo_great_person',
      'Patron of Science',
      '+1 Great Scientist point per turn',
      5,
      { type: 'special', value: 1 },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

/**
 * MICHELANGELO - Cultural Governor
 * Specializes in culture, tourism, and great artists
 */
export const MICHELANGELO: GovernorDef = {
  id: 'michelangelo',
  name: 'Michelangelo',
  title: 'administrator',
  specialization: 'cultural',
  baseAbilities: [
    ability(
      'michelangelo_base',
      'Artistic Vision',
      '+15% Culture yield in assigned city',
      1,
      { type: 'yield_bonus', value: 15, yieldType: 'culture' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'michelangelo_theater',
      'Cultural Center',
      '+25% Culture from Theater districts in assigned city',
      2,
      { type: 'yield_bonus', value: 25, yieldType: 'culture' },
    ),
    ability(
      'michelangelo_wonders',
      'Wonder Builder',
      '+20% Production toward Wonders',
      3,
      { type: 'production_bonus', value: 20 },
    ),
    ability(
      'michelangelo_tourism',
      'Tourism Magnet',
      '+2 Tourism from Wonders in assigned city',
      4,
      { type: 'special', value: 2 },
    ),
    ability(
      'michelangelo_great_artist',
      'Patron of Arts',
      '+1 Great Artist point per turn',
      5,
      { type: 'special', value: 1 },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

/**
 * MOSES - Religious Governor
 * Specializes in faith, religious units, and spread
 */
export const MOSES: GovernorDef = {
  id: 'moses',
  name: 'Moses',
  title: 'administrator',
  specialization: 'religious',
  baseAbilities: [
    ability(
      'moses_base',
      'Spiritual Leader',
      '+15% Faith yield in assigned city',
      1,
      { type: 'yield_bonus', value: 15, yieldType: 'faith' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'moses_holy_site',
      'Religious Center',
      '+25% Faith from Holy Site districts in assigned city',
      2,
      { type: 'yield_bonus', value: 25, yieldType: 'faith' },
    ),
    ability(
      'moses_spread',
      'Faithful Preacher',
      '+20% Religious spread strength',
      3,
      { type: 'special', value: 20 },
    ),
    ability(
      'moses_apostle',
      'Apostle Training',
      'Religious units built with +30% combat strength',
      4,
      { type: 'combat_bonus', value: 30 },
    ),
    ability(
      'moses_great_prophet',
      'Patron of Religion',
      '+1 Great Prophet point per turn',
      5,
      { type: 'special', value: 1 },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

/**
 * CLEOPATRA - Diplomatic Governor
 * Specializes in influence, alliances, and relations
 */
export const CLEOPATRA: GovernorDef = {
  id: 'cleopatra',
  name: 'Cleopatra',
  title: 'administrator',
  specialization: 'diplomatic',
  baseAbilities: [
    ability(
      'cleopatra_base',
      'Diplomatic Grace',
      '+15% Influence yield in assigned city',
      1,
      { type: 'yield_bonus', value: 15, yieldType: 'influence' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'cleopatra_relations',
      'Charismatic Leader',
      '+5 relationship with all civilizations per turn',
      2,
      { type: 'special', value: 5 },
    ),
    ability(
      'cleopatra_trade',
      'Trade Alliance',
      '+2 Food and Gold from trade routes',
      3,
      { type: 'special', value: 2 },
    ),
    ability(
      'cleopatra_envoys',
      'Envoy Master',
      '+1 Envoy capacity',
      4,
      { type: 'special', value: 1 },
    ),
    ability(
      'cleopatra_alliances',
      'Alliance Builder',
      '+25% Alliance strength',
      5,
      { type: 'special', value: 25 },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

/**
 * TARRUN - Logistics-themed Economic Governor
 * Keeps caravans moving, granaries stocked, and tiles cheap to purchase.
 */
export const TARRUN: GovernorDef = {
  id: 'tarrun',
  name: 'Tarrun of the Wainways',
  title: 'administrator',
  specialization: 'economic',
  baseAbilities: [
    ability(
      'tarrun_base',
      'Wainwright Oversight',
      '+10% Gold and +10% Food yield in assigned city from improved roads',
      1,
      { type: 'yield_bonus', value: 10, yieldType: 'gold' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'tarrun_convoy',
      'Convoy Captain',
      'Trade routes originating in the assigned city gain +1 Food',
      2,
      { type: 'yield_bonus', value: 1, yieldType: 'food' },
    ),
    ability(
      'tarrun_granary',
      'Stocked Granaries',
      '+20% Food from stockpile buildings in the assigned city',
      3,
      { type: 'yield_bonus', value: 20, yieldType: 'food' },
    ),
    ability(
      'tarrun_frontier',
      'Frontier Survey',
      'Tile purchase cost reduced by 25% in the assigned city',
      4,
      { type: 'special', value: 25 },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

/**
 * AKAMU - Naval-themed Military Governor
 * A coastal warden who turns harbor cities into fleet bastions.
 */
export const AKAMU: GovernorDef = {
  id: 'akamu',
  name: 'Akamu Tidekeeper',
  title: 'administrator',
  specialization: 'military',
  baseAbilities: [
    ability(
      'akamu_base',
      'Harbor Warden',
      '+15% Production toward naval units in the assigned city',
      1,
      { type: 'production_bonus', value: 15 },
    ),
  ],
  unlockableAbilities: [
    ability(
      'akamu_tide',
      'Tide Reader',
      'Naval units built in the assigned city gain +1 Movement',
      2,
      { type: 'special', value: 1 },
    ),
    ability(
      'akamu_dockhand',
      'Dockhand Discipline',
      '+2 CS for naval units based in the assigned city',
      3,
      { type: 'combat_bonus', value: 2 },
    ),
    ability(
      'akamu_seawall',
      'Seawall Engineer',
      '+4 City defense HP when the assigned city is coastal',
      4,
      { type: 'special', value: 4 },
    ),
  ],
  maxLevel: 5,
  baseExperience: 100,
};

// Barrel export
export const ALL_ANTIQUITY_GOVERNORS: ReadonlyArray<GovernorDef> = [
  MAGNUS,
  VICTORIA,
  GALILEO,
  MICHELANGELO,
  MOSES,
  CLEOPATRA,
  TARRUN,
  AKAMU,
];
