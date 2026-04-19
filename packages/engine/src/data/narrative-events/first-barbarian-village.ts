import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const FIRST_BARBARIAN_VILLAGE: NarrativeEventDef = {
  id: 'first_barbarian_village',
  title: 'Barbarian Village Encountered',
  vignette: 'Your scouts have found a barbarian village on the frontier. The chieftain eyes you warily — this could be a threat, or an opportunity.',
  category: 'battle',
  ageGate: 'antiquity',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['first-barbarian-contact'],
  },
  choices: [
    {
      label: 'Raid the village (+50 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 50 },
      ],
      tagOutput: ['first-barbarian-contact', 'raided-barbarians'],
    },
    {
      label: 'Befriend the village (+2 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
      ],
      tagOutput: ['first-barbarian-contact', 'befriended-barbarians'],
    },
  ],
};
