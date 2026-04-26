import type { RelicDef } from '../../types/Relic';

export const ARK_OF_COVENANT: RelicDef = {
  id: 'ark_of_the_covenant',
  name: 'Ark of the Covenant',
  description: 'A sacred chest said to hold the stone tablets of the Ten Commandments.',
  faithPerTurn: 4,
  culturePerTurn: 2,
} as const;

export const SHROUD: RelicDef = {
  id: 'shroud_of_turin',
  name: 'Shroud of Turin',
  description: 'A linen cloth bearing the faint image of a man, revered as a holy relic.',
  faithPerTurn: 3,
  culturePerTurn: 3,
} as const;

export const SACRED_TOOTH: RelicDef = {
  id: 'sacred_tooth',
  name: 'Sacred Tooth of the Buddha',
  description: 'A venerated relic believed to be a tooth of Gautama Buddha.',
  faithPerTurn: 3,
  culturePerTurn: 2,
} as const;

export const STAFF_OF_MOSES: RelicDef = {
  id: 'staff_of_moses',
  name: 'Staff of Moses',
  description: 'The legendary staff that parted the Red Sea.',
  faithPerTurn: 2,
  culturePerTurn: 4,
} as const;

export const SPEAR_OF_DESTINY: RelicDef = {
  id: 'spear_of_destiny',
  name: 'Spear of Destiny',
  description: 'The Holy Lance said to have pierced the side of Christ.',
  faithPerTurn: 3,
  culturePerTurn: 3,
} as const;

export const HOLY_GRAIL_RELIC: RelicDef = {
  id: 'holy_grail',
  name: 'Holy Grail',
  description: 'The sacred cup used at the Last Supper, sought by knights for centuries.',
  faithPerTurn: 5,
  culturePerTurn: 3,
} as const;

// KK2 (F-09): Four additional relics expanding the relic pool to 10 entries.

export const BUDDHAS_BOWL: RelicDef = {
  id: 'buddhas_bowl',
  name: "Buddha's Alms Bowl",
  description: 'The begging bowl of Gautama Buddha, said to have miraculous healing powers.',
  faithPerTurn: 3,
  culturePerTurn: 2,
} as const;

export const MAHABHARATA_MANUSCRIPT: RelicDef = {
  id: 'mahabharata_manuscript',
  name: 'Mahabharata Manuscript',
  description: 'An ancient illuminated copy of the great Hindu epic, revered as sacred scripture.',
  faithPerTurn: 2,
  culturePerTurn: 4,
} as const;

export const BOOK_OF_THE_DEAD: RelicDef = {
  id: 'book_of_the_dead',
  name: 'Book of the Dead',
  description: 'An Egyptian funerary text containing spells for navigating the afterlife.',
  faithPerTurn: 3,
  culturePerTurn: 3,
} as const;

export const MOUNT_SINAI_TABLETS: RelicDef = {
  id: 'mount_sinai_tablets',
  name: 'Mount Sinai Tablets',
  description: 'The stone tablets on which the divine commandments were inscribed.',
  faithPerTurn: 4,
  culturePerTurn: 2,
} as const;

export const ALL_RELICS: ReadonlyArray<RelicDef> = [
  ARK_OF_COVENANT,
  SHROUD,
  SACRED_TOOTH,
  STAFF_OF_MOSES,
  SPEAR_OF_DESTINY,
  HOLY_GRAIL_RELIC,
  BUDDHAS_BOWL,
  MAHABHARATA_MANUSCRIPT,
  BOOK_OF_THE_DEAD,
  MOUNT_SINAI_TABLETS,
] as const;
