import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const ROGUE_KNIGHT: NarrativeEventDef = {
  id: 'rogue_knight',
  title: 'The Rogue Knight',
  vignette: 'A formidable warrior in battered armor has been terrorizing the countryside. Your scouts report she commands a small band of loyal followers and controls a strategic crossroads.',
  category: 'battle',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['dealt-with-rogue-knight'],
  },
  choices: [
    {
      label: 'Offer her a commission in your army (+10 production, +5 combat strength)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 10 },
      ],
      tagOutput: ['dealt-with-rogue-knight', 'knight-commissioned'],
    },
    {
      label: 'March your forces to defeat her (+25 gold in loot)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 25 },
      ],
      tagOutput: ['dealt-with-rogue-knight', 'knight-defeated'],
    },
  ],
};
