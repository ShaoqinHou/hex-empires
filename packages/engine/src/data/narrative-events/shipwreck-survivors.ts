import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const SHIPWRECK_SURVIVORS: NarrativeEventDef = {
  id: 'shipwreck_survivors',
  title: 'Shipwreck Survivors',
  vignette: 'Wreckage washes ashore — splintered timber, tattered sails. Among the debris, a handful of survivors cling to flotsam, waving frantically. They claim to be merchants from a distant land.',
  category: 'discovery',
  requirements: {
    triggerType: 'DISCOVERY_EXPLORED',
    excludesTags: ['rescued-shipwreck-survivors'],
  },
  choices: [
    {
      label: 'Rescue and employ them (+20 production)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 20 },
      ],
      tagOutput: ['rescued-shipwreck-survivors', 'survivors-employed'],
    },
    {
      label: 'Return them to their people for a reward (+35 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 35 },
      ],
      tagOutput: ['rescued-shipwreck-survivors', 'survivors-returned'],
    },
    {
      label: 'Question them about distant lands (+15 science, +5 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 15 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 5 },
      ],
      tagOutput: ['rescued-shipwreck-survivors', 'survivors-questioned'],
    },
  ],
};
