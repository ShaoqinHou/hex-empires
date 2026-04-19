import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const MERCHANT_CARAVAN: NarrativeEventDef = {
  id: 'merchant_caravan',
  title: 'Merchant Caravan',
  vignette: 'A wealthy merchant caravan requests safe passage through your territory. They carry rare goods from distant lands and offer to trade.',
  category: 'diplomacy',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['caravan-visited'],
  },
  choices: [
    {
      label: 'Trade generously (+20 gold, +3 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 20 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
      ],
      tagOutput: ['caravan-visited', 'caravan-traded'],
    },
    {
      label: 'Tax the caravan (+35 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 35 },
      ],
      tagOutput: ['caravan-visited', 'caravan-taxed'],
    },
  ],
};
