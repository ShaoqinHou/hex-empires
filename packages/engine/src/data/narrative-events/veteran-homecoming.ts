import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const VETERAN_HOMECOMING: NarrativeEventDef = {
  id: 'veteran_homecoming',
  title: 'Veteran Homecoming',
  vignette: 'A company of battle-hardened veterans returns from a long campaign. They bring spoils and stories, but also wounds and trauma. Your people look to you for how to honor their sacrifice.',
  category: 'battle',
  requirements: {
    triggerType: 'BATTLE_WON',
    excludesTags: ['honored-veteran-homecoming'],
  },
  choices: [
    {
      label: 'Grant them land and pensions (+15 food, +10 production)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 15 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 10 },
      ],
      tagOutput: ['honored-veteran-homecoming', 'veterans-landed'],
    },
    {
      label: 'Hold a victory parade (+12 culture, +8 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 12 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 8 },
      ],
      tagOutput: ['honored-veteran-homecoming', 'veterans-paraded'],
    },
    {
      label: 'Send them to train new recruits (+10 production, +5 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 10 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 5 },
      ],
      tagOutput: ['honored-veteran-homecoming', 'veterans-training'],
    },
  ],
};
