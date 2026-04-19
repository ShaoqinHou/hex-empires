import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const PLAGUE_OF_LOCUSTS: NarrativeEventDef = {
  id: 'plague_of_locusts',
  title: 'Plague of Locusts',
  vignette: 'A great swarm of locusts descends on your farmlands, threatening the harvest. Your advisors argue about how best to respond to this calamity.',
  category: 'misc',
  ageGate: 'antiquity',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['survived-locust-plague'],
  },
  choices: [
    {
      label: 'Organize emergency food distribution (-20 gold, maintain food)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -20 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 3 },
      ],
      tagOutput: ['survived-locust-plague', 'locust-relief'],
    },
    {
      label: 'Weather it out (accept -8 food penalty)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: -8 },
      ],
      tagOutput: ['survived-locust-plague'],
    },
  ],
};
