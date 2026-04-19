import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const ANCIENT_RUINS: NarrativeEventDef = {
  id: 'ancient_ruins',
  title: 'Ancient Ruins',
  vignette: 'Crumbling walls and toppled columns mark the site of a once-great city. Looters have taken much, but your scholars believe something of value remains.',
  category: 'discovery',
  requirements: {
    triggerType: 'DISCOVERY_EXPLORED',
    excludesTags: ['explored-ancient-ruins'],
  },
  choices: [
    {
      label: 'Excavate systematically (+30 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 30 },
      ],
      tagOutput: ['explored-ancient-ruins', 'ruins-excavated'],
    },
    {
      label: 'Strip valuables quickly (+40 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 40 },
      ],
      tagOutput: ['explored-ancient-ruins', 'ruins-looted'],
    },
    {
      label: 'Consecrate the site (+8 culture, +5 faith)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 8 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 5 },
      ],
      tagOutput: ['explored-ancient-ruins', 'ruins-consecrated'],
    },
  ],
};
