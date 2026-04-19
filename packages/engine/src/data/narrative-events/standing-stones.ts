import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const STANDING_STONES: NarrativeEventDef = {
  id: 'standing_stones',
  title: 'Standing Stones',
  vignette: 'A ring of ancient standing stones emerges from the hillside mist. No one alive remembers who built them or why — but the aura of the place is unmistakable.',
  category: 'discovery',
  requirements: {
    triggerType: 'DISCOVERY_EXPLORED',
    excludesTags: ['found-standing-stones'],
  },
  choices: [
    {
      label: 'Meditate at the stones (+12 faith)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 12 },
      ],
      tagOutput: ['found-standing-stones', 'stones-meditated'],
    },
    {
      label: 'Survey the astronomical alignments (+15 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 15 },
      ],
      tagOutput: ['found-standing-stones', 'stones-surveyed'],
    },
    {
      label: 'Commission art inspired by the stones (+10 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 10 },
      ],
      tagOutput: ['found-standing-stones', 'stones-art'],
    },
  ],
};
