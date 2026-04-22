import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const HARVEST_FESTIVAL: NarrativeEventDef = {
  id: 'harvest_festival',
  title: 'Bountiful Harvest Festival',
  vignette: 'The granaries overflow. Your farmers request permission to hold a great harvest festival — a week of feasting, music, and gratitude that would lift the spirits of the entire realm.',
  category: 'misc',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['held-harvest-festival'],
  },
  choices: [
    {
      label: 'Sponsor the festival grandly (+10 food, +10 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 10 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 10 },
      ],
      tagOutput: ['held-harvest-festival', 'festival-grand'],
    },
    {
      label: 'Store the surplus for hard times (+20 food)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 20 },
      ],
      tagOutput: ['held-harvest-festival', 'surplus-stored'],
    },
    {
      label: 'Sell the surplus to neighbors (+30 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 30 },
      ],
      tagOutput: ['held-harvest-festival', 'surplus-sold'],
    },
  ],
};
