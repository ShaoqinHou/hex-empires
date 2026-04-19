import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const FOREIGN_AMBASSADOR: NarrativeEventDef = {
  id: 'foreign_ambassador',
  title: 'Foreign Ambassador',
  vignette: 'A foreign dignitary arrives at your court bearing gifts and propositions. Their nation seeks closer ties — but there may be strings attached.',
  category: 'diplomacy',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['received-ambassador'],
  },
  choices: [
    {
      label: 'Welcome them warmly (+4 influence, +10 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 10 },
      ],
      tagOutput: ['received-ambassador', 'welcomed-ambassador'],
    },
    {
      label: 'Negotiate a cultural exchange (+8 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 8 },
      ],
      tagOutput: ['received-ambassador', 'culture-exchange'],
    },
  ],
};
