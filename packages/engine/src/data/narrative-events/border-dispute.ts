import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const BORDER_DISPUTE: NarrativeEventDef = {
  id: 'border_dispute',
  title: 'Border Dispute',
  vignette: 'A neighboring civilization has encroached on territory you claim. Their settlers have erected markers well within what your maps show as your domain. Your generals demand action.',
  category: 'diplomacy',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['resolved-border-dispute'],
  },
  choices: [
    {
      label: 'Send a diplomatic envoy to negotiate (+8 culture, +5 faith)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 8 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 5 },
      ],
      tagOutput: ['resolved-border-dispute', 'dispute-negotiated'],
    },
    {
      label: 'Fortify the border with military garrisons (+15 production)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 15 },
      ],
      tagOutput: ['resolved-border-dispute', 'dispute-fortified'],
    },
    {
      label: 'Ignore it and focus on internal growth (+15 food, +10 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 15 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 10 },
      ],
      tagOutput: ['resolved-border-dispute', 'dispute-ignored'],
    },
  ],
};
