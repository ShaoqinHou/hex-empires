import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const WANDERING_SAGE: NarrativeEventDef = {
  id: 'wandering_sage',
  title: 'The Wandering Sage',
  vignette: 'A travelling philosopher arrives at your court, bearing knowledge from distant lands. She offers to share her wisdom — but warns that some of her teachings may challenge your authority.',
  category: 'misc',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['hosted-wandering-sage'],
  },
  choices: [
    {
      label: 'Welcome her as a court advisor (+20 science, +5 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 20 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 5 },
      ],
      tagOutput: ['hosted-wandering-sage', 'sage-welcomed'],
    },
    {
      label: 'Invite her to teach at the temple (+15 faith, +5 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 15 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 5 },
      ],
      tagOutput: ['hosted-wandering-sage', 'sage-temple'],
    },
    {
      label: 'Send her away to avoid unrest (+10 gold from confiscated scrolls)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 10 },
      ],
      tagOutput: ['hosted-wandering-sage', 'sage-dismissed'],
    },
  ],
};
