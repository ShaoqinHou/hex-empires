/**
 * Modern Age Governors
 *
 * Legendary governors with ultimate abilities for the modern age.
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
 * ROCKEFELLER - Legendary Economic Governor
 */
export const ROCKEFELLER: GovernorDef = {
  id: 'rockefeller',
  name: 'John D. Rockefeller',
  title: 'viceroy',
  specialization: 'economic',
  baseAbilities: [
    ability(
      'rockefeller_base',
      'Oil Tycoon',
      '+50% Gold yield in assigned city',
      1,
      { type: 'yield_bonus', value: 50, yieldType: 'gold' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'rockefeller_monopoly',
      'Global Monopoly',
      '+10 Gold from each strategic and luxury resource',
      2,
      { type: 'yield_bonus', value: 10, yieldType: 'gold' },
    ),
    ability(
      'rockefeller_corporation',
      'Corporation Founder',
      '+100% Gold from Commercial districts',
      3,
      { type: 'yield_bonus', value: 100, yieldType: 'gold' },
    ),
    ability(
      'rockefeller_banking',
      'Financial Empire',
      '+5 Gold per population',
      4,
      { type: 'yield_bonus', value: 5, yieldType: 'gold' },
    ),
    ability(
      'rockefeller_investment',
      'Global Investment',
      '+20% Gold from all international trade routes',
      5,
      { type: 'yield_bonus', value: 20, yieldType: 'gold' },
    ),
    ability(
      'rockefeller_great_merchant',
      'Merchant Prince',
      '+3 Great Merchant points per turn',
      6,
      { type: 'special', value: 3 },
    ),
    ability(
      'rockefeller_wealth',
      'Wealth of Nations',
      'City generates +100 Gold per turn at maximum level',
      7,
      { type: 'special', value: 100 },
    ),
  ],
  maxLevel: 7,
  baseExperience: 200,
};

/**
 * EISENHOWER - Legendary Military Governor
 */
export const EISENHOWER: GovernorDef = {
  id: 'eisenhower',
  name: 'Dwight D. Eisenhower',
  title: 'viceroy',
  specialization: 'military',
  baseAbilities: [
    ability(
      'eisenhower_base',
      'Supreme Commander',
      '+50% Production in assigned city',
      1,
      { type: 'production_bonus', value: 50 },
    ),
  ],
  unlockableAbilities: [
    ability(
      'eisenhower_modern_warfare',
      'Modern Warfare',
      'All units start with +15 XP',
      2,
      { type: 'special', value: 15 },
    ),
    ability(
      'eisenhower_nuclear',
      'Nuclear Deterrent',
      'Can build nuclear units',
      3,
      { type: 'special', value: 1 },
    ),
    ability(
      'eisenhower_airforce',
      'Air Superiority',
      '+100% Production toward air units',
      4,
      { type: 'production_bonus', value: 100 },
    ),
    ability(
      'eisenhower_logistics',
      'Industrial Logistics',
      '+10 CS for all units',
      5,
      { type: 'combat_bonus', value: 10 },
    ),
    ability(
      'eisenhower_great_general',
      'Military Legend',
      '+2 Great General points per turn',
      6,
      { type: 'special', value: 2 },
    ),
    ability(
      'eisenhower_command',
      'Total War',
      'City provides +100% Production and +20 CS at maximum level',
      7,
      { type: 'special', value: 100 },
    ),
  ],
  maxLevel: 7,
  baseExperience: 200,
};

/**
 * EINSTEIN - Legendary Scientific Governor
 */
export const EINSTEIN: GovernorDef = {
  id: 'einstein',
  name: 'Albert Einstein',
  title: 'viceroy',
  specialization: 'scientific',
  baseAbilities: [
    ability(
      'einstein_base',
      'Theory of Relativity',
      '+50% Science yield in assigned city',
      1,
      { type: 'yield_bonus', value: 50, yieldType: 'science' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'einstein_research',
      'Scientific Revolution',
      '+100% Science from Campus districts',
      2,
      { type: 'yield_bonus', value: 100, yieldType: 'science' },
    ),
    ability(
      'einstein_physics',
      'Quantum Leap',
      '+50% Science from all buildings',
      3,
      { type: 'yield_bonus', value: 50, yieldType: 'science' },
    ),
    ability(
      'einstein_space',
      'Space Race',
      '+200% Production toward Space Center',
      4,
      { type: 'production_bonus', value: 200 },
    ),
    ability(
      'einstein_tech',
      'Technological Dominance',
      '+20% Science from all sources',
      5,
      { type: 'yield_bonus', value: 20, yieldType: 'science' },
    ),
    ability(
      'einstein_great_scientist',
      'Science Icon',
      '+3 Great Scientist points per turn',
      6,
      { type: 'special', value: 3 },
    ),
    ability(
      'einstein_genius',
      'Universal Genius',
      'City generates +100 Science and +50% tech boost at maximum level',
      7,
      { type: 'special', value: 100 },
    ),
  ],
  maxLevel: 7,
  baseExperience: 200,
};

/**
 * PICASSO - Legendary Cultural Governor
 */
export const PICASSO: GovernorDef = {
  id: 'picasso',
  name: 'Pablo Picasso',
  title: 'viceroy',
  specialization: 'cultural',
  baseAbilities: [
    ability(
      'picasso_base',
      'Artistic Revolution',
      '+50% Culture yield in assigned city',
      1,
      { type: 'yield_bonus', value: 50, yieldType: 'culture' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'picasso_modern_art',
      'Modern Art Movement',
      '+100% Culture from Theater districts',
      2,
      { type: 'yield_bonus', value: 100, yieldType: 'culture' },
    ),
    ability(
      'picasso_tourism',
      'Cultural Hegemony',
      '+200% Tourism output',
      3,
      { type: 'special', value: 200 },
    ),
    ability(
      'picasso_wonder',
      'Wonder of the Age',
      '+50% Production toward Wonders',
      4,
      { type: 'production_bonus', value: 50 },
    ),
    ability(
      'picasso_great_works',
      'Master Creator',
      '+10 Tourism from each Great Work',
      5,
      { type: 'special', value: 10 },
    ),
    ability(
      'picasso_great_artist',
      'Art Icon',
      '+3 Great Artist and Great Writer points per turn',
      6,
      { type: 'special', value: 3 },
    ),
    ability(
      'picasso_culture',
      'Cultural Victory',
      'City generates +100 Culture and +200 Tourism at maximum level',
      7,
      { type: 'special', value: 100 },
    ),
  ],
  maxLevel: 7,
  baseExperience: 200,
};

/**
 * MOTHER_TERESA - Legendary Religious Governor
 */
export const MOTHER_TERESA: GovernorDef = {
  id: 'mother_teresa',
  name: 'Mother Teresa',
  title: 'viceroy',
  specialization: 'religious',
  baseAbilities: [
    ability(
      'mother_teresa_base',
      'Saintly Work',
      '+50% Faith yield in assigned city',
      1,
      { type: 'yield_bonus', value: 50, yieldType: 'faith' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'mother_teresa_charity',
      'Acts of Charity',
      '+100% Faith from Holy Site districts',
      2,
      { type: 'yield_bonus', value: 100, yieldType: 'faith' },
    ),
    ability(
      'mother_teresa_spread',
      'Global Mission',
      '+200% Religious spread strength',
      3,
      { type: 'special', value: 200 },
    ),
    ability(
      'mother_teresa_miracles',
      'Divine Miracles',
      'Religious units cost 75% less Faith',
      4,
      { type: 'special', value: 75 },
    ),
    ability(
      'mother_teresa_conversion',
      'Mass Conversion',
      '+100% Faith from all sources',
      5,
      { type: 'yield_bonus', value: 100, yieldType: 'faith' },
    ),
    ability(
      'mother_teresa_great_prophet',
      'Saintly Patron',
      '+3 Great Prophet points per turn',
      6,
      { type: 'special', value: 3 },
    ),
    ability(
      'mother_teresa_faith',
      'Religious Victory',
      'City generates +100 Faith and can convert all cities at maximum level',
      7,
      { type: 'special', value: 100 },
    ),
  ],
  maxLevel: 7,
  baseExperience: 200,
};

/**
 * KISSINGER - Legendary Diplomatic Governor
 */
export const KISSINGER: GovernorDef = {
  id: 'kissinger',
  name: 'Henry Kissinger',
  title: 'viceroy',
  specialization: 'diplomatic',
  baseAbilities: [
    ability(
      'kissinger_base',
      'Realpolitik',
      '+50% Influence yield in assigned city',
      1,
      { type: 'yield_bonus', value: 50, yieldType: 'influence' },
    ),
  ],
  unlockableAbilities: [
    ability(
      'kissinger_negotiation',
      'Peace Talks',
      '+20 relationship per turn with all civilizations',
      2,
      { type: 'special', value: 20 },
    ),
    ability(
      'kissinger_un',
      'United Nations',
      '+5 Delegate slots',
      3,
      { type: 'special', value: 5 },
    ),
    ability(
      'kissinger_alliance',
      'Alliance Network',
      '+100% Alliance strength',
      4,
      { type: 'special', value: 100 },
    ),
    ability(
      'kissinger_trade',
      'Global Trade',
      '+100% Trade route bonuses',
      5,
      { type: 'special', value: 100 },
    ),
    ability(
      'kissinger_envoy',
      'Diplomatic Corps',
      '+3 Envoy capacity',
      6,
      { type: 'special', value: 3 },
    ),
    ability(
      'kissinger_diplomacy',
      'Diplomatic Victory',
      'City generates +100 Influence and +5 relationship per turn at maximum level',
      7,
      { type: 'special', value: 100 },
    ),
  ],
  maxLevel: 7,
  baseExperience: 200,
};

// Barrel export
export const ALL_MODERN_GOVERNORS: ReadonlyArray<GovernorDef> = [
  ROCKEFELLER,
  EISENHOWER,
  EINSTEIN,
  PICASSO,
  MOTHER_TERESA,
  KISSINGER,
];
