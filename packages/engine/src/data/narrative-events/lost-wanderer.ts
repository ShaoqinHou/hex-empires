import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const LOST_WANDERER: NarrativeEventDef = {
  id: 'lost_wanderer',
  title: 'The Lost Wanderer',
  vignette: 'A weary traveler stumbles into your capital bearing strange maps and tales of distant lands. Will you shelter them, or turn them away?',
  category: 'misc',
  ageGate: 'antiquity',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['met-wanderer'],
  },
  choices: [
    {
      label: 'Shelter and reward them (+50 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 50 },
      ],
      tagOutput: ['met-wanderer', 'sheltered-wanderer'],
    },
    {
      label: 'Send them onward with provisions (+1 population bonus)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 5 },
      ],
      tagOutput: ['met-wanderer'],
    },
  ],
};
