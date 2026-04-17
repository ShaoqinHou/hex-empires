/**
 * Asset pipeline barrel export.
 * Components import from here: import { getYieldIcon } from '@web/assets';
 */
export type { AssetRef, AssetCategoryRef, AssetSource } from './registry';
export {
  LEADER_PORTRAITS,
  CIV_GLYPHS,
  YIELD_ICONS,
  ACTION_ICONS,
  CATEGORY_ICONS,
  STATE_ICONS,
  BACKGROUNDS,
  MUSIC_TRACKS,
  SFX_UI,
  SFX_UNIT,
  SFX_CITY,
  SFX_MOMENT,
  ALL_ASSET_CATEGORIES,
} from './registry';
export {
  resolveAsset,
  getLeaderPortrait,
  getLeaderPortraitRef,
  getCivGlyph,
  getYieldIcon,
  getActionIcon,
  getCategoryIcon,
  getStateIcon,
  getBackground,
  getMusicTrack,
  getSfxUI,
  getSfxUnit,
  getSfxCity,
  getSfxMoment,
} from './loader';
