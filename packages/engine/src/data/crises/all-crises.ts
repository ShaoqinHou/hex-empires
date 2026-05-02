import type { CrisisEventDef } from './types';
import { EXPANSION_CRISES } from './expansion-crises';

export const PLAGUE: CrisisEventDef = {
  id: 'plague',
  name: 'The Great Plague',
  description: 'A devastating plague sweeps across your empire, threatening the lives of your citizens. Your advisors urge immediate action.',
  triggerCondition: 'turn_reached',
  triggerValue: 20,
  age: 'antiquity',
  crisisType: 'plague',
  choices: [
    {
      id: 'quarantine',
      text: 'Enforce strict quarantine measures (-2 food but no population loss)',
      effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: -2 }],
    },
    {
      id: 'ignore',
      text: 'Ignore the plague and hope it passes (lose 1 population in largest city)',
      effects: [{ type: 'LOSE_POPULATION', target: 'largest_city', value: 1 }],
    },
  ],
} as const;

export const BARBARIAN_INVASION: CrisisEventDef = {
  id: 'barbarian_invasion',
  name: 'Barbarian Invasion',
  description: 'Barbarian hordes have been spotted near your borders. They demand tribute or they will attack!',
  triggerCondition: 'turn_reached',
  triggerValue: 10,
  age: 'antiquity',
  crisisType: 'invasion',
  choices: [
    {
      id: 'pay_tribute',
      text: 'Pay tribute to the barbarians (-50 gold)',
      effects: [{ type: 'MODIFY_GOLD', target: 'player', value: -50 }],
    },
    {
      id: 'fight',
      text: 'Refuse and prepare for battle (enemy warriors spawn near a city)',
      effects: [{ type: 'SPAWN_ENEMIES', target: 'random_city', value: 2 }],
    },
  ],
} as const;

export const NATURAL_DISASTER: CrisisEventDef = {
  id: 'natural_disaster',
  name: 'Natural Disaster',
  description: 'Earthquakes and floods threaten your empire! Your people look to you for guidance in this time of crisis.',
  triggerCondition: 'turn_reached',
  triggerValue: 25,
  age: 'antiquity',
  crisisType: 'revolt',
  choices: [
    {
      id: 'evacuate',
      text: 'Evacuate vulnerable areas (-20 gold, no damage)',
      effects: [{ type: 'MODIFY_GOLD', target: 'player', value: -20 }],
    },
    {
      id: 'weather_it',
      text: 'Weather the storm (random city loses 1 population)',
      effects: [{ type: 'LOSE_POPULATION', target: 'random_city', value: 1 }],
    },
  ],
} as const;

export const RELIGIOUS_SCHISM: CrisisEventDef = {
  id: 'religious_schism',
  name: 'Religious Schism',
  description: 'Theological disputes have split your population. Competing factions demand that you take a side or risk cultural collapse.',
  triggerCondition: 'turn_reached',
  triggerValue: 30,
  age: 'exploration',
  crisisType: 'wars_of_religion',
  choices: [
    {
      id: 'tolerance',
      text: 'Preach tolerance and freedom of belief (+3 culture, -1 faith)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: -1 },
      ],
    },
    {
      id: 'suppression',
      text: 'Suppress the heretical faction (+2 loyalty, -2 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: -2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 2 },
      ],
    },
  ],
} as const;

export const TRADE_DISRUPTION: CrisisEventDef = {
  id: 'trade_disruption',
  name: 'Trade Disruption',
  description: 'Bandit raids and hostile neighbors have cut off your trade routes. Your merchants are demanding action to restore commerce.',
  triggerCondition: 'turn_reached',
  triggerValue: 18,
  age: 'exploration',
  crisisType: 'revolt',
  choices: [
    {
      id: 'new_routes',
      text: 'Invest in establishing new trade routes (-30 gold, +3 gold per turn)',
      effects: [
        { type: 'MODIFY_GOLD', target: 'player', value: -30 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 3 },
      ],
    },
    {
      id: 'isolate',
      text: 'Turn inward and focus on domestic production (-2 gold per turn, +2 production)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
      ],
    },
  ],
} as const;

export const EXPLORATION_REVOLUTION: CrisisEventDef = {
  id: 'exploration_revolution',
  name: 'Flames in the Capital',
  description:
    'Rival factions, newly politicized guilds, and radical preachers have ignited unrest in your capital. The old order may not survive the night.',
  triggerCondition: 'turn_reached',
  triggerValue: 55,
  age: 'exploration',
  crisisType: 'revolution',
  choices: [
    {
      id: 'negotiate_reforms',
      text: 'Negotiate sweeping reforms and placate the city elders (+2 culture, -2 gold).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -2 },
      ],
    },
    {
      id: 'mobilize_militias',
      text: 'Mobilize loyal militias and crush unrest (+2 production, -1 culture).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: -1 },
      ],
    },
    {
      id: 'call_new_constitution',
      text: 'Call for a new constitutional assembly (+1 faith, +1 science).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 1 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
      ],
    },
  ],
} as const;

export const SOLAR_ECLIPSE: CrisisEventDef = {
  id: 'solar_eclipse',
  name: 'Solar Eclipse',
  description: 'A total solar eclipse darkens the sky. The people are filled with dread — how do you respond?',
  triggerCondition: 'compound',
  triggerValue: 20, // minTurn — kept for backward compatibility; real logic is in compoundTrigger
  compoundTrigger: {
    minTurn: 20,
    minCityPopulation: 3,
    minResearchedTechs: 1,
  },
  age: 'antiquity',
  crisisType: 'revolt',
  choices: [
    {
      id: 'divine_favor',
      text: 'Embrace it as divine favor (+30 Faith, -10 Science for 5 turns)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 30 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: -10 },
      ],
    },
    {
      id: 'calm_with_science',
      text: 'Calm the people with science (+30 Science, costs 50 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 30 },
        { type: 'MODIFY_GOLD', target: 'player', value: -50 },
      ],
    },
    {
      id: 'do_nothing',
      text: 'Do nothing and let it pass (20% chance of -1 happiness in all cities for 3 turns)',
      effects: [
        { type: 'REDUCE_CITY_HAPPINESS', target: 'all_cities', value: -1, probability: 0.2 },
      ],
    },
  ],
} as const;

export const ALL_CRISES: ReadonlyArray<CrisisEventDef> = [
  PLAGUE,
  BARBARIAN_INVASION,
  NATURAL_DISASTER,
  RELIGIOUS_SCHISM,
  TRADE_DISRUPTION,
  EXPLORATION_REVOLUTION,
  SOLAR_ECLIPSE,
  ...EXPANSION_CRISES,
];
