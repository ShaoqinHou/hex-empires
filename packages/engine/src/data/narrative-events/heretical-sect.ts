import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const HERETICAL_SECT: NarrativeEventDef = {
  id: 'heretical_sect',
  title: 'The Heretical Sect',
  vignette: 'A radical sect has emerged within your cities, preaching an unorthodox interpretation of the dominant faith. Their followers grow daily, and the orthodox priesthood demands you act.',
  category: 'religion',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['dealt-with-heretical-sect'],
  },
  choices: [
    {
      label: 'Suppress the sect to maintain orthodoxy (+15 faith)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 15 },
      ],
      tagOutput: ['dealt-with-heretical-sect', 'sect-suppressed'],
    },
    {
      label: 'Tolerate diversity of thought (+10 science, +5 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 10 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 5 },
      ],
      tagOutput: ['dealt-with-heretical-sect', 'sect-tolerated'],
    },
  ],
};
