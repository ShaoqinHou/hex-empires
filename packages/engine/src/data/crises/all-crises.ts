import type { CrisisEventDef } from './types';

export const PLAGUE: CrisisEventDef = {
  id: 'plague',
  name: 'The Great Plague',
  description: 'A devastating plague sweeps across your empire, threatening the lives of your citizens. Your advisors urge immediate action.',
  triggerCondition: 'turn_reached',
  triggerValue: 20,
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

export const GOLDEN_AGE: CrisisEventDef = {
  id: 'golden_age',
  name: 'A Golden Age Dawns',
  description: 'Your civilization has achieved great intellectual progress! Scholars and artists flock to your cities. How will you harness this momentum?',
  triggerCondition: 'tech_researched',
  triggerValue: 5,
  choices: [
    {
      id: 'celebrate',
      text: 'Hold grand celebrations (+3 culture for 5 turns)',
      effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 }],
    },
    {
      id: 'expand',
      text: 'Invest in industry (+1 production for 5 turns)',
      effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 }],
    },
  ],
} as const;

export const TRADE_OPPORTUNITY: CrisisEventDef = {
  id: 'trade_opportunity',
  name: 'Foreign Trade Caravan',
  description: 'A wealthy foreign trade caravan has arrived at your borders, offering valuable goods in exchange for passage and hospitality.',
  triggerCondition: 'turn_reached',
  triggerValue: 15,
  choices: [
    {
      id: 'accept_trade',
      text: 'Welcome the traders and open trade (+100 gold)',
      effects: [{ type: 'MODIFY_GOLD', target: 'player', value: 100 }],
    },
    {
      id: 'reject_trade',
      text: 'Turn them away (no effect)',
      effects: [{ type: 'MODIFY_GOLD', target: 'player', value: 0 }],
    },
  ],
} as const;

export const NATURAL_DISASTER: CrisisEventDef = {
  id: 'natural_disaster',
  name: 'Natural Disaster',
  description: 'Earthquakes and floods threaten your empire! Your people look to you for guidance in this time of crisis.',
  triggerCondition: 'turn_reached',
  triggerValue: 25,
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

export const ALL_CRISES: ReadonlyArray<CrisisEventDef> = [
  PLAGUE,
  BARBARIAN_INVASION,
  GOLDEN_AGE,
  TRADE_OPPORTUNITY,
  NATURAL_DISASTER,
];
