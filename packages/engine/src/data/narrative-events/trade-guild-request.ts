import type { NarrativeEventDef } from '../../types/NarrativeEvent';

export const TRADE_GUILD_REQUEST: NarrativeEventDef = {
  id: 'trade_guild_request',
  title: 'Trade Guild Petition',
  vignette: 'The merchant guilds present a formal petition. They seek a royal charter granting them monopoly over certain trade routes in exchange for a share of the profits flowing to your treasury.',
  category: 'diplomacy',
  requirements: {
    triggerType: 'END_TURN',
    excludesTags: ['responded-to-guild-petition'],
  },
  choices: [
    {
      label: 'Grant the charter (+30 gold)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 30 },
      ],
      tagOutput: ['responded-to-guild-petition', 'charter-granted'],
    },
    {
      label: 'Refuse and keep trade open (+15 production)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 15 },
      ],
      tagOutput: ['responded-to-guild-petition', 'charter-refused'],
    },
    {
      label: 'Negotiate a compromise (+12 gold, +8 culture)',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 12 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 8 },
      ],
      tagOutput: ['responded-to-guild-petition', 'charter-compromise'],
    },
  ],
};
