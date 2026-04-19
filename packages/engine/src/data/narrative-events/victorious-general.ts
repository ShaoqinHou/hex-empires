import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const VICTORIOUS_GENERAL: NarrativeEventDef = {
  id: 'victorious_general',
  title: 'The Victorious General',
  vignette: 'Your general returns from battle draped in glory. The people cheer — but your advisors whisper that such popularity can be dangerous for a ruler.',
  category: 'battle',
  requirements: {
    triggerType: 'BATTLE_WON',
    excludesTags: ['celebrated-general'],
  },
  choices: [
    {
      label: 'Hold a grand triumph (+15 culture, +5 faith)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 15 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 5 },
      ],
      tagOutput: ['celebrated-general', 'public-triumph'],
    },
    {
      label: 'Reward the troops quietly (+40 gold spent, +2 combat loyalty)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -20 },
      ],
      tagOutput: ['celebrated-general', 'quiet-reward'],
    },
  ],
};
