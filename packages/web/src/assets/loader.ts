/**
 * Asset loader — resolves logical names to URL paths.
 *
 * Rules:
 *   - Always go through these functions; never hardcode paths in components.
 *   - On missing key: returns fallback path silently + warns in dev. Never throws.
 *   - The fallback guarantee means the game keeps running even before real assets land.
 *
 * Location: packages/web/src/assets/loader.ts
 */

import type { LeaderId, CivilizationId, YieldType } from '@hex/engine';
import {
  type AssetRef,
  type AssetCategoryRef,
  LEADER_PORTRAITS,
  CIV_GLYPHS,
  YIELD_ICONS,
  ACTION_ICONS,
  CATEGORY_ICONS,
  STATE_ICONS,
  RESOURCE_ICONS,
  IMPROVEMENT_ICONS,
  BACKGROUNDS,
  MUSIC_TRACKS,
  SFX_UI,
  SFX_UNIT,
  SFX_CITY,
  SFX_MOMENT,
} from './registry';

// ---------------------------------------------------------------------------
// Core resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a logical key to an AssetRef within a category.
 * Falls back to category.fallback if key is missing.
 * In development, logs a warning for missing keys (not fallbacks themselves).
 */
export function resolveAsset(category: AssetCategoryRef, key: string): AssetRef {
  const asset = category.entries.get(key);
  if (!asset) {
    // Warn in non-production builds — process.env.NODE_ENV is injected by Vite
    if (typeof process === 'undefined' || (process as { env?: { NODE_ENV?: string } }).env?.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`[assets] Missing key "${key}" — using fallback ${category.fallback.path}`);
    }
    return category.fallback;
  }
  return asset;
}

// ---------------------------------------------------------------------------
// Per-category typed getters
// ---------------------------------------------------------------------------

/** Returns the portrait URL for a leader. Falls back to silhouette placeholder. */
export function getLeaderPortrait(leaderId: LeaderId): string {
  return resolveAsset(LEADER_PORTRAITS, leaderId).path;
}

/** Returns the AssetRef (with source/attribution metadata) for a leader portrait. */
export function getLeaderPortraitRef(leaderId: LeaderId): AssetRef {
  return resolveAsset(LEADER_PORTRAITS, leaderId);
}

/** Returns the civ glyph URL for a civilization. Falls back to generic glyph placeholder. */
export function getCivGlyph(civId: CivilizationId): string {
  return resolveAsset(CIV_GLYPHS, civId).path;
}

/** Returns the icon URL for a yield type. Falls back to circle placeholder. */
export function getYieldIcon(yieldType: YieldType): string {
  return resolveAsset(YIELD_ICONS, yieldType).path;
}

/** Returns the icon URL for a unit/game action. Falls back to generic action placeholder. */
export function getActionIcon(actionId: string): string {
  return resolveAsset(ACTION_ICONS, actionId).path;
}

/** Returns the icon URL for a panel/system category. Falls back to generic category placeholder. */
export function getCategoryIcon(categoryId: string): string {
  return resolveAsset(CATEGORY_ICONS, categoryId).path;
}

/** Returns the icon URL for a UI state (locked/researching/etc.). Falls back to generic state placeholder. */
export function getStateIcon(stateId: string): string {
  return resolveAsset(STATE_ICONS, stateId).path;
}

/** Returns the icon URL for a resource id (wheat, iron, silk, etc.). Falls back to generic resource placeholder. */
export function getResourceIcon(resourceId: string): string {
  return resolveAsset(RESOURCE_ICONS, resourceId).path;
}

/** Returns the AssetRef for a resource icon (includes source metadata). */
export function getResourceIconRef(resourceId: string): AssetRef {
  return resolveAsset(RESOURCE_ICONS, resourceId);
}

/** Returns the icon URL for an improvement id (farm, mine, etc.). Falls back to generic improvement placeholder. */
export function getImprovementIcon(improvementId: string): string {
  return resolveAsset(IMPROVEMENT_ICONS, improvementId).path;
}

/** Returns the AssetRef for an improvement icon (includes source metadata). */
export function getImprovementIconRef(improvementId: string): AssetRef {
  return resolveAsset(IMPROVEMENT_ICONS, improvementId);
}

/** Returns the background image URL for a scene key. Falls back to SVG placeholder. */
export function getBackground(sceneKey: string): string {
  return resolveAsset(BACKGROUNDS, sceneKey).path;
}

/** Returns the music track URL for a context key. Falls back to 1s silence placeholder. */
export function getMusicTrack(trackKey: string): string {
  return resolveAsset(MUSIC_TRACKS, trackKey).path;
}

/** Returns the SFX URL for a UI sound. Falls back to 1s silence placeholder. */
export function getSfxUI(sfxKey: string): string {
  return resolveAsset(SFX_UI, sfxKey).path;
}

/** Returns the SFX URL for a unit sound. Falls back to 1s silence placeholder. */
export function getSfxUnit(sfxKey: string): string {
  return resolveAsset(SFX_UNIT, sfxKey).path;
}

/** Returns the SFX URL for a city sound. Falls back to 1s silence placeholder. */
export function getSfxCity(sfxKey: string): string {
  return resolveAsset(SFX_CITY, sfxKey).path;
}

/** Returns the SFX URL for a moment/fanfare sound. Falls back to 1s silence placeholder. */
export function getSfxMoment(sfxKey: string): string {
  return resolveAsset(SFX_MOMENT, sfxKey).path;
}
