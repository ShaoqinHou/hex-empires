/**
 * Asset registry — single source of truth mapping logical names to file paths + metadata.
 *
 * Architecture:
 *   - All asset references go through this registry; never hardcode paths in components.
 *   - `resolveAsset` in loader.ts consumes this registry.
 *   - Drop-in replacement: put the right file in public/assets/<category>/<key>.<ext>
 *     and update `source` here. Zero code changes in components.
 *
 * Location: packages/web/src/assets/registry.ts
 */

import type { LeaderId, CivilizationId, YieldType } from '@hex/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssetSource = 'placeholder' | 'commissioned' | 'final' | 'cc0' | 'ai-generated';

export interface AssetRef {
  readonly path: string;                              // URL path (/assets/...)
  readonly source: AssetSource;                       // lifecycle marker
  readonly attribution?: string;                      // artist/composer credit
  readonly dimensions?: readonly [number, number];    // [width, height] for images
  readonly duration?: number;                         // seconds for audio
}

export interface AssetCategoryRef {
  readonly entries: ReadonlyMap<string, AssetRef>;
  readonly fallback: AssetRef;  // used when a specific entry is missing
}

// ---------------------------------------------------------------------------
// Leader portraits (keyed by LeaderId)
// ---------------------------------------------------------------------------

export const LEADER_PORTRAITS: AssetCategoryRef = {
  entries: new Map<LeaderId, AssetRef>([
    ['augustus',       { path: '/assets/images/leaders/augustus.webp',       source: 'placeholder', dimensions: [768, 1024] }],
    ['cleopatra',      { path: '/assets/images/leaders/cleopatra.webp',      source: 'placeholder', dimensions: [768, 1024] }],
    ['pericles',       { path: '/assets/images/leaders/pericles.webp',       source: 'placeholder', dimensions: [768, 1024] }],
    ['cyrus',          { path: '/assets/images/leaders/cyrus.webp',          source: 'placeholder', dimensions: [768, 1024] }],
    ['gandhi',         { path: '/assets/images/leaders/gandhi.webp',         source: 'placeholder', dimensions: [768, 1024] }],
    ['qin_shi_huang',  { path: '/assets/images/leaders/qin-shi-huang.webp',  source: 'placeholder', dimensions: [768, 1024] }],
    ['alexander',      { path: '/assets/images/leaders/alexander.webp',      source: 'placeholder', dimensions: [768, 1024] }],
    ['hatshepsut',     { path: '/assets/images/leaders/hatshepsut.webp',     source: 'placeholder', dimensions: [768, 1024] }],
    ['genghis_khan',   { path: '/assets/images/leaders/genghis-khan.webp',   source: 'placeholder', dimensions: [768, 1024] }],
  ]),
  fallback: { path: '/assets/images/leaders/_fallback-silhouette.svg', source: 'placeholder' },
};

// ---------------------------------------------------------------------------
// Civ glyphs (keyed by CivilizationId)
// ---------------------------------------------------------------------------

export const CIV_GLYPHS: AssetCategoryRef = {
  entries: new Map<CivilizationId, AssetRef>([
    // Antiquity
    ['rome',     { path: '/assets/images/civs/rome.svg',     source: 'placeholder' }],
    ['egypt',    { path: '/assets/images/civs/egypt.svg',    source: 'placeholder' }],
    ['greece',   { path: '/assets/images/civs/greece.svg',   source: 'placeholder' }],
    ['persia',   { path: '/assets/images/civs/persia.svg',   source: 'placeholder' }],
    ['india',    { path: '/assets/images/civs/india.svg',    source: 'placeholder' }],
    ['china',    { path: '/assets/images/civs/china.svg',    source: 'placeholder' }],
    ['vikings',  { path: '/assets/images/civs/vikings.svg',  source: 'placeholder' }],
    // Exploration
    ['spain',    { path: '/assets/images/civs/spain.svg',    source: 'placeholder' }],
    ['england',  { path: '/assets/images/civs/england.svg',  source: 'placeholder' }],
    ['france',   { path: '/assets/images/civs/france.svg',   source: 'placeholder' }],
    ['ottoman',  { path: '/assets/images/civs/ottoman.svg',  source: 'placeholder' }],
    ['japan',    { path: '/assets/images/civs/japan.svg',    source: 'placeholder' }],
    ['mongolia', { path: '/assets/images/civs/mongolia.svg', source: 'placeholder' }],
    // Modern
    ['america',  { path: '/assets/images/civs/america.svg',  source: 'placeholder' }],
    ['germany',  { path: '/assets/images/civs/germany.svg',  source: 'placeholder' }],
    ['russia',   { path: '/assets/images/civs/russia.svg',   source: 'placeholder' }],
    ['brazil',   { path: '/assets/images/civs/brazil.svg',   source: 'placeholder' }],
  ]),
  fallback: { path: '/assets/images/civs/_fallback-glyph.svg', source: 'placeholder' },
};

// ---------------------------------------------------------------------------
// Yield icons (keyed by YieldType)
// ---------------------------------------------------------------------------

export const YIELD_ICONS: AssetCategoryRef = {
  entries: new Map<YieldType, AssetRef>([
    ['food',       { path: '/assets/images/icons/yields/food.svg',       source: 'placeholder' }],
    ['production', { path: '/assets/images/icons/yields/production.svg', source: 'placeholder' }],
    ['gold',       { path: '/assets/images/icons/yields/gold.svg',       source: 'placeholder' }],
    ['science',    { path: '/assets/images/icons/yields/science.svg',    source: 'placeholder' }],
    ['culture',    { path: '/assets/images/icons/yields/culture.svg',    source: 'placeholder' }],
    ['faith',      { path: '/assets/images/icons/yields/faith.svg',      source: 'placeholder' }],
    ['influence',  { path: '/assets/images/icons/yields/influence.svg',  source: 'placeholder' }],
    ['housing',    { path: '/assets/images/icons/yields/housing.svg',    source: 'placeholder' }],
    ['diplomacy',  { path: '/assets/images/icons/yields/diplomacy.svg',  source: 'placeholder' }],
  ]),
  fallback: { path: '/assets/images/icons/yields/_fallback-circle.svg', source: 'placeholder' },
};

// ---------------------------------------------------------------------------
// Action icons
// ---------------------------------------------------------------------------

export const ACTION_ICONS: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['found-city',        { path: '/assets/images/icons/actions/found-city.svg',        source: 'placeholder' }],
    ['fortify',           { path: '/assets/images/icons/actions/fortify.svg',           source: 'placeholder' }],
    ['attack',            { path: '/assets/images/icons/actions/attack.svg',            source: 'placeholder' }],
    ['build-improvement', { path: '/assets/images/icons/actions/build-improvement.svg', source: 'placeholder' }],
    ['move',              { path: '/assets/images/icons/actions/move.svg',              source: 'placeholder' }],
    ['ranged-attack',     { path: '/assets/images/icons/actions/ranged-attack.svg',     source: 'placeholder' }],
    ['bombard',           { path: '/assets/images/icons/actions/bombard.svg',           source: 'placeholder' }],
    ['embark',            { path: '/assets/images/icons/actions/embark.svg',            source: 'placeholder' }],
    ['disembark',         { path: '/assets/images/icons/actions/disembark.svg',         source: 'placeholder' }],
  ]),
  fallback: { path: '/assets/images/icons/actions/_fallback-action.svg', source: 'placeholder' },
};

// ---------------------------------------------------------------------------
// Category (panel/system) icons
// ---------------------------------------------------------------------------

export const CATEGORY_ICONS: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['tech',         { path: '/assets/images/icons/categories/tech.svg',         source: 'placeholder' }],
    ['civics',       { path: '/assets/images/icons/categories/civics.svg',       source: 'placeholder' }],
    ['religion',     { path: '/assets/images/icons/categories/religion.svg',     source: 'placeholder' }],
    ['government',   { path: '/assets/images/icons/categories/government.svg',   source: 'placeholder' }],
    ['diplomacy',    { path: '/assets/images/icons/categories/diplomacy.svg',    source: 'placeholder' }],
    ['commanders',   { path: '/assets/images/icons/categories/commanders.svg',   source: 'placeholder' }],
    ['governors',    { path: '/assets/images/icons/categories/governors.svg',    source: 'placeholder' }],
    ['trade',        { path: '/assets/images/icons/categories/trade.svg',        source: 'placeholder' }],
    ['achievements', { path: '/assets/images/icons/categories/achievements.svg', source: 'placeholder' }],
    ['city',         { path: '/assets/images/icons/categories/city.svg',         source: 'placeholder' }],
    ['military',     { path: '/assets/images/icons/categories/military.svg',     source: 'placeholder' }],
  ]),
  fallback: { path: '/assets/images/icons/categories/_fallback-category.svg', source: 'placeholder' },
};

// ---------------------------------------------------------------------------
// State icons (locked/unlocked/researching/etc.)
// ---------------------------------------------------------------------------

export const STATE_ICONS: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['locked',      { path: '/assets/images/icons/states/locked.svg',      source: 'placeholder' }],
    ['unlocked',    { path: '/assets/images/icons/states/unlocked.svg',    source: 'placeholder' }],
    ['researching', { path: '/assets/images/icons/states/researching.svg', source: 'placeholder' }],
    ['completed',   { path: '/assets/images/icons/states/completed.svg',   source: 'placeholder' }],
    ['in-progress', { path: '/assets/images/icons/states/in-progress.svg', source: 'placeholder' }],
    ['unavailable', { path: '/assets/images/icons/states/unavailable.svg', source: 'placeholder' }],
  ]),
  fallback: { path: '/assets/images/icons/states/_fallback-state.svg', source: 'placeholder' },
};

// ---------------------------------------------------------------------------
// Backgrounds
// ---------------------------------------------------------------------------

export const BACKGROUNDS: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['setup-screen',     { path: '/assets/images/backgrounds/setup-screen.webp',         source: 'placeholder', dimensions: [1920, 1080] }],
    ['age-antiquity',    { path: '/assets/images/backgrounds/age-antiquity.webp',        source: 'placeholder', dimensions: [1920, 1080] }],
    ['age-exploration',  { path: '/assets/images/backgrounds/age-exploration.webp',      source: 'placeholder', dimensions: [1920, 1080] }],
    ['age-modern',       { path: '/assets/images/backgrounds/age-modern.webp',           source: 'placeholder', dimensions: [1920, 1080] }],
    ['victory',          { path: '/assets/images/backgrounds/victory.webp',              source: 'placeholder', dimensions: [1920, 1080] }],
    ['crisis-plague',    { path: '/assets/images/backgrounds/crisis/plague.webp',        source: 'placeholder', dimensions: [1280, 720] }],
    ['crisis-barbarian', { path: '/assets/images/backgrounds/crisis/barbarian-invasion.webp', source: 'placeholder', dimensions: [1280, 720] }],
    ['crisis-disaster',  { path: '/assets/images/backgrounds/crisis/natural-disaster.webp',   source: 'placeholder', dimensions: [1280, 720] }],
    ['crisis-golden-age',{ path: '/assets/images/backgrounds/crisis/golden-age.webp',    source: 'placeholder', dimensions: [1280, 720] }],
    ['crisis-trade',     { path: '/assets/images/backgrounds/crisis/trade-opportunity.webp',  source: 'placeholder', dimensions: [1280, 720] }],
  ]),
  fallback: { path: '/assets/images/backgrounds/_fallback-bg.svg', source: 'placeholder' },
};

// ---------------------------------------------------------------------------
// Music tracks
// ---------------------------------------------------------------------------

export const MUSIC_TRACKS: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['antiquity',   { path: '/assets/audio/music/antiquity.ogg',   source: 'placeholder', duration: 120 }],
    ['exploration', { path: '/assets/audio/music/exploration.ogg', source: 'placeholder', duration: 120 }],
    ['modern',      { path: '/assets/audio/music/modern.ogg',      source: 'placeholder', duration: 120 }],
    ['combat',      { path: '/assets/audio/music/combat.ogg',      source: 'placeholder', duration: 60 }],
    ['victory',     { path: '/assets/audio/music/victory.ogg',     source: 'placeholder', duration: 30 }],
  ]),
  fallback: { path: '/assets/audio/_fallback-silence.ogg', source: 'placeholder', duration: 1 },
};

// ---------------------------------------------------------------------------
// SFX categories
// ---------------------------------------------------------------------------

export const SFX_UI: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['click',       { path: '/assets/audio/sfx/ui/click.ogg',       source: 'placeholder', duration: 0.1 }],
    ['hover',       { path: '/assets/audio/sfx/ui/hover.ogg',       source: 'placeholder', duration: 0.05 }],
    ['open-panel',  { path: '/assets/audio/sfx/ui/open-panel.ogg',  source: 'placeholder', duration: 0.2 }],
    ['close-panel', { path: '/assets/audio/sfx/ui/close-panel.ogg', source: 'placeholder', duration: 0.15 }],
    ['error',       { path: '/assets/audio/sfx/ui/error.ogg',       source: 'placeholder', duration: 0.3 }],
  ]),
  fallback: { path: '/assets/audio/_fallback-silence.ogg', source: 'placeholder', duration: 0.1 },
};

export const SFX_UNIT: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['move',    { path: '/assets/audio/sfx/unit/move.ogg',    source: 'placeholder', duration: 0.4 }],
    ['attack',  { path: '/assets/audio/sfx/unit/attack.ogg',  source: 'placeholder', duration: 0.5 }],
    ['death',   { path: '/assets/audio/sfx/unit/death.ogg',   source: 'placeholder', duration: 0.8 }],
    ['fortify', { path: '/assets/audio/sfx/unit/fortify.ogg', source: 'placeholder', duration: 0.3 }],
  ]),
  fallback: { path: '/assets/audio/_fallback-silence.ogg', source: 'placeholder', duration: 0.2 },
};

export const SFX_CITY: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['founded',  { path: '/assets/audio/sfx/city/founded.ogg',  source: 'placeholder', duration: 1.0 }],
    ['grown',    { path: '/assets/audio/sfx/city/grown.ogg',    source: 'placeholder', duration: 0.5 }],
    ['built',    { path: '/assets/audio/sfx/city/built.ogg',    source: 'placeholder', duration: 0.4 }],
    ['captured', { path: '/assets/audio/sfx/city/captured.ogg', source: 'placeholder', duration: 1.2 }],
  ]),
  fallback: { path: '/assets/audio/_fallback-silence.ogg', source: 'placeholder', duration: 0.5 },
};

export const SFX_MOMENT: AssetCategoryRef = {
  entries: new Map<string, AssetRef>([
    ['age-transition',  { path: '/assets/audio/sfx/moment/age-transition.ogg',  source: 'placeholder', duration: 2.0 }],
    ['tech-complete',   { path: '/assets/audio/sfx/moment/tech-complete.ogg',   source: 'placeholder', duration: 1.0 }],
    ['civic-complete',  { path: '/assets/audio/sfx/moment/civic-complete.ogg',  source: 'placeholder', duration: 1.0 }],
    ['wonder-complete', { path: '/assets/audio/sfx/moment/wonder-complete.ogg', source: 'placeholder', duration: 2.0 }],
    ['crisis-warning',  { path: '/assets/audio/sfx/moment/crisis-warning.ogg',  source: 'placeholder', duration: 1.5 }],
    ['victory-fanfare', { path: '/assets/audio/sfx/moment/victory-fanfare.ogg', source: 'placeholder', duration: 3.0 }],
  ]),
  fallback: { path: '/assets/audio/_fallback-silence.ogg', source: 'placeholder', duration: 1.0 },
};

// ---------------------------------------------------------------------------
// All categories — for bulk operations (validator, status, bulk-mark)
// ---------------------------------------------------------------------------

export const ALL_ASSET_CATEGORIES: ReadonlyMap<string, AssetCategoryRef> = new Map([
  ['leaders',          LEADER_PORTRAITS],
  ['civs',             CIV_GLYPHS],
  ['icons/yields',     YIELD_ICONS],
  ['icons/actions',    ACTION_ICONS],
  ['icons/categories', CATEGORY_ICONS],
  ['icons/states',     STATE_ICONS],
  ['backgrounds',      BACKGROUNDS],
  ['music',            MUSIC_TRACKS],
  ['sfx/ui',           SFX_UI],
  ['sfx/unit',         SFX_UNIT],
  ['sfx/city',         SFX_CITY],
  ['sfx/moment',       SFX_MOMENT],
]);
