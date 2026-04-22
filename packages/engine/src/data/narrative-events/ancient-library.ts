import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const ANCIENT_LIBRARY: NarrativeEventDef = {
  id: 'ancient_library',
  title: 'The Hidden Library',
  vignette: 'Behind a false wall in an abandoned monastery, your scouts uncover a vast collection of scrolls — treatises on mathematics, astronomy, and medicine unknown to the modern world.',
  category: 'discovery',
  requirements: {
    triggerType: 'DISCOVERY_EXPLORED',
    excludesTags: ['found-hidden-library'],
  },
  choices: [
    {
      label: 'Preserve and study the scrolls (+25 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 25 },
      ],
      tagOutput: ['found-hidden-library', 'library-studied'],
    },
    {
      label: 'Sell rare scrolls to collectors (+45 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 45 },
      ],
      tagOutput: ['found-hidden-library', 'library-sold'],
    },
    {
      label: 'Display in a public museum (+12 culture, +5 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 12 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 5 },
      ],
      tagOutput: ['found-hidden-library', 'library-displayed'],
    },
  ],
};
