/**
 * Exploration Age Governors
 *
 * Advanced governors with enhanced abilities for the exploration age.
 */

import type { GovernorDef, GovernorAbility } from '../../types/Governor';

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
 * MEDICI - Advanced Economic Governor
 */
export const MEDICI: GovernorDef = {
  id: 'medici',
  name: 'Medici',
  title: 'prefect',
  specialization: 'economic',
  baseAbilities: [
    ability(
      'medici_base',
      'Banking Dynasty',
      '+25% Gold yield in assigned city',
      1,
      { type: 'yield_bonus', value: 25, yieldType: 'gold' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'medici_trade_empire',
      'Trade Empire',
      '+2 Gold from all trade routes',
      2,
      { type: 'yield_bonus', value: 2, yieldType: 'gold' },
    ),
    ability(
      'medici_resource',
      'Resource Monopoly',
      '+5 Gold from each luxury resource in territory',
      3,
      { type: 'yield_bonus', value: 5, yieldType: 'gold' },
    ),
    ability(
      'medici_market',
      'Market Master',
      '+50% Gold from Commercial districts',
      4,
      { type: 'yield_bonus', value: 50, yieldType: 'gold' },
    ),
    ability(
      'medici_tax_reform',
      'Tax Reform',
      '+3 Gold per population',
      5,
      { type: 'yield_bonus', value: 3, yieldType: 'gold' },
    ),
    ability(
      'medici_great_merchant',
      'Patron of Commerce',
      '+2 Great Merchant points per turn',
      6,
      { type: 'special', value: 2 },
    ),
  ],
  maxLevel: 6,
  baseExperience: 150,
};

/**
 * RICHARD_LIONHEART - Advanced Military Governor
 */
export const RICHARD_LIONHEART: GovernorDef = {
  id: 'richard_lionheart',
  name: 'Richard the Lionheart',
  title: 'prefect',
  specialization: 'military',
  baseAbilities: [
    ability(
      'richard_base',
      'Crusader King',
      '+25% Production in assigned city',
      1,
      { type: 'production_bonus', value: 25 },
    ),
  ],
  unlockableAbilities: [
    ability(
      'richard_chivalry',
      'Code of Chivalry',
      'Units start with +10 XP',
      2,
      { type: 'special', value: 10 },
    ),
    ability(
      'richard_crusade',
      'Crusader Spirit',
      '+5 CS for religious units',
      3,
      { type: 'combat_bonus', value: 5 },
    ),
    ability(
      'richard_siege',
      'Siege Master',
      '+50% Production toward siege units',
      4,
      { type: 'production_bonus', value: 50 },
    ),
    ability(
      'richard_defense',
      'Fortification',
      '+10 City defense HP',
      5,
      { type: 'special', value: 10 },
    ),
    ability(
      'richard_great_general',
      'Military Legend',
      '+1 Great General point per turn',
      6,
      { type: 'special', value: 1 },
    ),
  ],
  maxLevel: 6,
  baseExperience: 150,
};

/**
 * NEWTON - Advanced Scientific Governor
 */
export const NEWTON: GovernorDef = {
  id: 'newton',
  name: 'Isaac Newton',
  title: 'prefect',
  specialization: 'scientific',
  baseAbilities: [
    ability(
      'newton_base',
      'Scientific Revolution',
      '+25% Science yield in assigned city',
      1,
      { type: 'yield_bonus', value: 25, yieldType: 'science' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'newton_university',
      'University System',
      '+50% Science from Campus districts',
      2,
      { type: 'yield_bonus', value: 50, yieldType: 'science' },
    ),
    ability(
      'newton_laboratory',
      'Research Laboratory',
      '+20% Science from all buildings',
      3,
      { type: 'yield_bonus', value: 20, yieldType: 'science' },
    ),
    ability(
      'newton_observation',
      'Royal Observatory',
      '+2 Science from adjacent Mountains',
      4,
      { type: 'yield_bonus', value: 2, yieldType: 'science' },
    ),
    ability(
      'newton_discovery',
      'Age of Discovery',
      '+10% Science from all sources',
      5,
      { type: 'yield_bonus', value: 10, yieldType: 'science' },
    ),
    ability(
      'newton_great_scientist',
      'Patron of Science',
      '+2 Great Scientist points per turn',
      6,
      { type: 'special', value: 2 },
    ),
  ],
  maxLevel: 6,
  baseExperience: 150,
};

/**
 * SHAKESPEARE - Advanced Cultural Governor
 */
export const SHAKESPEARE: GovernorDef = {
  id: 'shakespeare',
  name: 'William Shakespeare',
  title: 'prefect',
  specialization: 'cultural',
  baseAbilities: [
    ability(
      'shakespeare_base',
      'Bard of Avon',
      '+25% Culture yield in assigned city',
      1,
      { type: 'yield_bonus', value: 25, yieldType: 'culture' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'shakespeare_theater',
      'Globe Theater',
      '+50% Culture from Theater districts',
      2,
      { type: 'yield_bonus', value: 50, yieldType: 'culture' },
    ),
    ability(
      'shakespeare_literature',
      'Literary Genius',
      '+5 Tourism from Great Works',
      3,
      { type: 'special', value: 5 },
    ),
    ability(
      'shakespeare_wonder',
      'Wonder of Arts',
      '+30% Production toward Wonders',
      4,
      { type: 'production_bonus', value: 30 },
    ),
    ability(
      'shakespeare_tourism',
      'Cultural Dominance',
      '+50% Tourism output',
      5,
      { type: 'special', value: 50 },
    ),
    ability(
      'shakespeare_great_artist',
      'Patron of Arts',
      '+2 Great Artist and Great Writer points per turn',
      6,
      { type: 'special', value: 2 },
    ),
  ],
  maxLevel: 6,
  baseExperience: 150,
};

/**
 * LUTHER - Advanced Religious Governor
 */
export const LUTHER: GovernorDef = {
  id: 'luther',
  name: 'Martin Luther',
  title: 'prefect',
  specialization: 'religious',
  baseAbilities: [
    ability(
      'luther_base',
      'Reformation',
      '+25% Faith yield in assigned city',
      1,
      { type: 'yield_bonus', value: 25, yieldType: 'faith' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'luther_church',
      'Church Power',
      '+50% Faith from Holy Site districts',
      2,
      { type: 'yield_bonus', value: 50, yieldType: 'faith' },
    ),
    ability(
      'luther_reformation',
      '95 Theses',
      '+100% Religious spread strength',
      3,
      { type: 'special', value: 100 },
    ),
    ability(
      'luther_conversion',
      'Mass Conversion',
      'Religious units cost 50% less Faith',
      4,
      { type: 'special', value: 50 },
    ),
    ability(
      'luther_theology',
      'Theological Scholar',
      '+50% Faith from all buildings',
      5,
      { type: 'yield_bonus', value: 50, yieldType: 'faith' },
    ),
    ability(
      'luther_great_prophet',
      'Patron of Religion',
      '+2 Great Prophet points per turn',
      6,
      { type: 'special', value: 2 },
    ),
  ],
  maxLevel: 6,
  baseExperience: 150,
};

/**
 * TALLEYRAND - Advanced Diplomatic Governor
 */
export const TALLEYRAND: GovernorDef = {
  id: 'talleyrand',
  name: 'Talleyrand',
  title: 'prefect',
  specialization: 'diplomatic',
  baseAbilities: [
    ability(
      'talleyrand_base',
      'Diplomatic Genius',
      '+25% Influence yield in assigned city',
      1,
      { type: 'yield_bonus', value: 25, yieldType: 'influence' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'talleyrand_negotiation',
      'Master Negotiator',
      '+10 relationship per turn with all civilizations',
      2,
      { type: 'special', value: 10 },
    ),
    ability(
      'talleyrand_alliance',
      'Alliance Network',
      '+3 Diplomatic Slots',
      3,
      { type: 'special', value: 3 },
    ),
    ability(
      'talleyrand_congress',
      'Diplomatic Congress',
      '+50% Alliance strength',
      4,
      { type: 'special', value: 50 },
    ),
    ability(
      'talleyrand_trade',
      'Trade Diplomacy',
      '+50% Trade route bonuses',
      5,
      { type: 'special', value: 50 },
    ),
    ability(
      'talleyrand_envoy',
      'Envoy Network',
      '+2 Envoy capacity',
      6,
      { type: 'special', value: 2 },
    ),
  ],
  maxLevel: 6,
  baseExperience: 150,
};

// Barrel export
export const ALL_EXPLORATION_GOVERNORS: ReadonlyArray<GovernorDef> = [
  MEDICI,
  RICHARD_LIONHEART,
  NEWTON,
  SHAKESPEARE,
  LUTHER,
  TALLEYRAND,
];
