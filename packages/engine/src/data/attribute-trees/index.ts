import type { AttributeNodeDef } from '../../types/Attribute';
import { ECONOMIC_NODES } from './economic';
import { MILITARISTIC_NODES } from './militaristic';
import { DIPLOMATIC_NODES } from './diplomatic';
import { EXPANSIONIST_NODES } from './expansionist';
import { CULTURAL_NODES } from './cultural';
import { SCIENTIFIC_NODES } from './scientific';

export { ECONOMIC_NODES } from './economic';
export { MILITARISTIC_NODES } from './militaristic';
export { DIPLOMATIC_NODES } from './diplomatic';
export { EXPANSIONIST_NODES } from './expansionist';
export { CULTURAL_NODES } from './cultural';
export { SCIENTIFIC_NODES } from './scientific';

export const ALL_ATTRIBUTE_NODES: ReadonlyArray<AttributeNodeDef> = [
  ...ECONOMIC_NODES,
  ...MILITARISTIC_NODES,
  ...DIPLOMATIC_NODES,
  ...EXPANSIONIST_NODES,
  ...CULTURAL_NODES,
  ...SCIENTIFIC_NODES,
];
