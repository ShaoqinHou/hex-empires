import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const SACRED_CAVE: NarrativeEventDef = {
  id: 'sacred_cave',
  title: 'Sacred Cave',
  vignette: 'Your explorers discover a cave system decorated with ancient paintings. Local tribes consider it sacred — and they are watching how you respond.',
  category: 'religion',
  requirements: {
    triggerType: 'DISCOVERY_EXPLORED',
    excludesTags: ['found-sacred-cave'],
  },
  choices: [
    {
      label: 'Protect the sacred site (+10 faith, +5 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 10 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 5 },
      ],
      tagOutput: ['found-sacred-cave', 'cave-protected'],
    },
    {
      label: 'Allow scholars to document the art (+20 science)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 20 },
      ],
      tagOutput: ['found-sacred-cave', 'cave-documented'],
    },
  ],
};
