import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const DESERT_SHRINE: NarrativeEventDef = {
  id: 'desert_shrine',
  title: 'Ancient Desert Shrine',
  vignette: 'Deep in the sands, your explorers discover a crumbling shrine. Inscriptions hint at forgotten knowledge — or perhaps the favor of gods long silent.',
  category: 'religion',
  requirements: {
    triggerType: 'DISCOVERY_EXPLORED',
    excludesTags: ['found-desert-shrine'],
  },
  choices: [
    {
      label: 'Pray at the shrine (+5 faith)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 5 },
      ],
      tagOutput: ['found-desert-shrine', 'shrine-blessed'],
    },
    {
      label: 'Study the inscriptions (+10 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 10 },
      ],
      tagOutput: ['found-desert-shrine', 'shrine-studied'],
    },
  ],
};
