/**
 * Religion Data Registry
 *
 * Barrel export for religion-scoped content (pantheons; beliefs and
 * religions arrive in later cycles). Not yet re-exported from the
 * engine index — the Religion system is un-wired until cycle C.
 */

export { ALL_PANTHEONS } from './pantheons';
export { ALL_FOUNDER_BELIEFS, type FounderBeliefDef } from './founder-beliefs';
export { ALL_FOLLOWER_BELIEFS, type FollowerBeliefDef } from './follower-beliefs';
