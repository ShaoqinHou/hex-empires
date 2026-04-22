import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const COMET_OMEN: NarrativeEventDef = {
  id: 'comet_omen',
  title: 'The Comet',
  vignette: 'A brilliant comet blazes across the night sky, visible for weeks. The people are divided — some see it as a divine blessing, others as a harbinger of doom. Your priests and scholars both demand your attention.',
  category: 'religion',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['interpreted-comet-omen'],
  },
  choices: [
    {
      label: 'Declare it a divine blessing (+10 faith, +5 food)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 10 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 5 },
      ],
      tagOutput: ['interpreted-comet-omen', 'comet-blessing'],
    },
    {
      label: 'Commission astronomical study (+20 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 20 },
      ],
      tagOutput: ['interpreted-comet-omen', 'comet-studied'],
    },
  ],
};
