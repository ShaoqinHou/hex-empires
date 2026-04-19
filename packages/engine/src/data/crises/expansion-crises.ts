import type { CrisisEventDef } from './types';

/**
 * Expansion crisis catalog — covers themes from Civ-style rulebook §17
 * (succession, religious reformation, economic depression, civil unrest,
 * diplomatic incident, technological revolution) that are not represented
 * by the original starter set in all-crises.ts.
 *
 * Only MODIFY_YIELD EffectDef shapes are used so that effects remain
 * valid under the strict EffectDef union in types/GameState.ts. Systems
 * and types are untouched.
 */

export const SUCCESSION_CRISIS: CrisisEventDef = {
  id: 'succession_crisis',
  name: 'A Contested Throne',
  description:
    'Your monarch has passed without a clear heir, and rival claimants are gathering retainers. The court demands resolution before the realm fractures along noble lines.',
  triggerCondition: 'turn_reached',
  triggerValue: 40,
  age: 'exploration',
  crisisType: 'revolt',
  choices: [
    {
      id: 'rally_loyalists',
      text: 'Rally loyalist nobles around a chosen heir (+3 culture, -1 gold per turn while legitimacy is asserted).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 3 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -1 },
      ],
    },
    {
      id: 'council_regency',
      text: 'Convene a council of regents to share power (+2 science, -1 production from deadlocked committees).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: -1 },
      ],
    },
    {
      id: 'purge_rivals',
      text: 'Purge rival claimants and seize uncontested rule (+2 production, -2 culture from executed dissent).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: -2 },
      ],
    },
  ],
} as const;

export const RELIGIOUS_REFORMATION: CrisisEventDef = {
  id: 'religious_reformation',
  name: 'The Great Reformation',
  description:
    'Pamphlets and preachers denounce the old orthodoxy, calling on the faithful to break from entrenched religious authority. The empire trembles at the coming reordering.',
  triggerCondition: 'turn_reached',
  triggerValue: 50,
  age: 'exploration',
  crisisType: 'wars_of_religion',
  choices: [
    {
      id: 'embrace_reform',
      text: 'Embrace the reform movement and rewrite doctrine (+3 faith, -2 culture as old institutions crumble).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 3 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: -2 },
      ],
    },
    {
      id: 'defend_orthodoxy',
      text: 'Defend the old order with sermons and gold (+2 culture, -2 gold per turn of enforced conformity).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -2 },
      ],
    },
    {
      id: 'parallel_faiths',
      text: 'Permit parallel faiths under uneasy truce (+1 faith, +1 science from a climate of open inquiry).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'faith', value: 1 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
      ],
    },
  ],
} as const;

export const ECONOMIC_DEPRESSION: CrisisEventDef = {
  id: 'economic_depression',
  name: 'A Long Winter of Markets',
  description:
    'Bankruptcies ripple through the counting houses, granaries empty, and workshops lie idle. Your treasury is bleeding and the guilds demand intervention.',
  triggerCondition: 'turn_reached',
  triggerValue: 60,
  age: 'modern',
  crisisType: 'revolution',
  choices: [
    {
      id: 'public_works',
      text: 'Fund sweeping public works programs (+3 production, -2 gold per turn of deficit spending).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 3 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -2 },
      ],
    },
    {
      id: 'austerity',
      text: 'Enforce strict austerity and debt collection (+2 gold, -1 food as relief funds are slashed).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: -1 },
      ],
    },
  ],
} as const;

export const CIVIL_UNREST: CrisisEventDef = {
  id: 'civil_unrest',
  name: 'Fires in the Forum',
  description:
    'Unrest boils through the streets as citizens gather to protest taxes, scarcity, and perceived injustices. Garrisons stand ready; so do the agitators.',
  triggerCondition: 'turn_reached',
  triggerValue: 35,
  age: 'antiquity',
  crisisType: 'revolt',
  choices: [
    {
      id: 'concessions',
      text: 'Grant reforms and civic concessions (+2 culture, -1 gold per turn of expanded entitlements).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -1 },
      ],
    },
    {
      id: 'martial_law',
      text: 'Declare martial law and disperse the crowds (+2 production, -2 culture from suppressed voices).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: -2 },
      ],
    },
    {
      id: 'distract_games',
      text: 'Fund public games and grain doles to quiet the mob (+1 food, -1 gold while appeasement lasts).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'food', value: 1 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -1 },
      ],
    },
  ],
} as const;

export const DIPLOMATIC_INCIDENT: CrisisEventDef = {
  id: 'diplomatic_incident',
  name: 'The Envoy Affair',
  description:
    'A foreign envoy has been insulted, perhaps deliberately, and the wounded pride of another court now hangs over your borders. Chanceries on both sides await your next word.',
  triggerCondition: 'turn_reached',
  triggerValue: 28,
  age: 'exploration',
  crisisType: 'invasion',
  choices: [
    {
      id: 'formal_apology',
      text: 'Issue a formal apology with lavish reparations (-3 gold per turn, +1 culture from displayed statesmanship).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -3 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'culture', value: 1 },
      ],
    },
    {
      id: 'stand_firm',
      text: 'Stand firm on your honor and call the envoy a liar (+1 production from rallied patriots, -1 science from chilled foreign scholars).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: -1 },
      ],
    },
  ],
} as const;

export const TECHNOLOGICAL_REVOLUTION: CrisisEventDef = {
  id: 'technological_revolution',
  name: 'The Roar of the New Machines',
  description:
    'Inventors demonstrate astonishing engines that threaten to remake every workshop and field. Guilds fear ruin, scholars smell opportunity, and your ministers want a policy.',
  triggerCondition: 'turn_reached',
  triggerValue: 70,
  age: 'modern',
  crisisType: 'revolution',
  choices: [
    {
      id: 'subsidize_invention',
      text: 'Subsidize the new inventors and patent offices (+3 science, -1 gold per turn of research grants).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: -1 },
      ],
    },
    {
      id: 'protect_guilds',
      text: 'Protect guild privileges and restrict the new engines (+2 production, -2 science under conservative decree).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 2 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: -2 },
      ],
    },
    {
      id: 'mixed_reform',
      text: 'Permit the new machines only in designated districts (+1 science, +1 production, slow but steady modernization).',
      effects: [
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 },
        { type: 'MODIFY_YIELD', target: 'empire', yield: 'production', value: 1 },
      ],
    },
  ],
} as const;

export const EXPANSION_CRISES: ReadonlyArray<CrisisEventDef> = [
  SUCCESSION_CRISIS,
  RELIGIOUS_REFORMATION,
  ECONOMIC_DEPRESSION,
  CIVIL_UNREST,
  DIPLOMATIC_INCIDENT,
  TECHNOLOGICAL_REVOLUTION,
];
