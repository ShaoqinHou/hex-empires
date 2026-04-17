/**
 * Unit tests for the asset registry and loader.
 *
 * Verifies:
 * - resolveAsset returns the correct path for a known key
 * - resolveAsset returns the fallback for an unknown key
 * - Every category has a non-empty fallback path
 * - Every category has at least one entry
 * - Typed getters return the correct path (not the fallback) for known keys
 * - Typed getters return the fallback for unknown keys
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveAsset } from '../loader';
import {
  YIELD_ICONS,
  LEADER_PORTRAITS,
  CIV_GLYPHS,
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
} from '../registry';
import {
  getYieldIcon,
  getLeaderPortrait,
  getCivGlyph,
  getActionIcon,
  getCategoryIcon,
  getStateIcon,
  getBackground,
  getMusicTrack,
  getSfxUI,
  getSfxUnit,
  getSfxCity,
  getSfxMoment,
} from '../loader';

// ---------------------------------------------------------------------------
// resolveAsset core behaviour
// ---------------------------------------------------------------------------

describe('resolveAsset', () => {
  it('returns the registered AssetRef for a known key', () => {
    const ref = resolveAsset(YIELD_ICONS, 'gold');
    expect(ref.path).toBe('/assets/images/icons/yields/gold.svg');
    expect(ref.source).toBe('placeholder');
  });

  it('returns the category fallback for an unknown key', () => {
    const ref = resolveAsset(YIELD_ICONS, 'nonexistent-yield-type');
    expect(ref.path).toBe(YIELD_ICONS.fallback.path);
  });

  it('returns fallback (not undefined) for empty string key', () => {
    const ref = resolveAsset(YIELD_ICONS, '');
    expect(ref).toBeDefined();
    expect(ref.path).toBe(YIELD_ICONS.fallback.path);
  });

  it('emits console.warn when key is missing', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    resolveAsset(YIELD_ICONS, 'does-not-exist');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('does-not-exist');
    spy.mockRestore();
  });

  it('does NOT emit console.warn for a valid key', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    resolveAsset(YIELD_ICONS, 'gold');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Registry invariants — every category must be non-empty with a valid fallback
// ---------------------------------------------------------------------------

describe('registry invariants', () => {
  it('every category has at least one entry', () => {
    for (const [name, cat] of ALL_ASSET_CATEGORIES) {
      expect(cat.entries.size, `${name} entries should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('every category has a non-empty fallback path', () => {
    for (const [name, cat] of ALL_ASSET_CATEGORIES) {
      expect(cat.fallback.path, `${name} fallback path should be non-empty`).toBeTruthy();
      expect(cat.fallback.path, `${name} fallback should start with /assets/`).toMatch(/^\/assets\//);
    }
  });

  it('every asset path starts with /assets/', () => {
    for (const [name, cat] of ALL_ASSET_CATEGORIES) {
      for (const [key, ref] of cat.entries) {
        expect(ref.path, `${name}/${key} path must start with /assets/`).toMatch(/^\/assets\//);
      }
    }
  });

  it('no duplicate paths within a category', () => {
    for (const [name, cat] of ALL_ASSET_CATEGORIES) {
      const paths = [...cat.entries.values()].map(r => r.path);
      const unique = new Set(paths);
      expect(unique.size, `${name} has duplicate paths`).toBe(paths.length);
    }
  });

  it('all entries have a valid source value', () => {
    const validSources = new Set(['placeholder', 'commissioned', 'final', 'cc0', 'ai-generated']);
    for (const [name, cat] of ALL_ASSET_CATEGORIES) {
      for (const [key, ref] of cat.entries) {
        expect(validSources.has(ref.source), `${name}/${key} has invalid source "${ref.source}"`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Typed getters — verify category-specific functions
// ---------------------------------------------------------------------------

describe('getYieldIcon', () => {
  it('returns gold icon path for known yield', () => {
    expect(getYieldIcon('gold')).toBe('/assets/images/icons/yields/gold.svg');
  });
  it('returns fallback path for unknown yield type', () => {
    expect(getYieldIcon('unknown-yield' as never)).toBe(YIELD_ICONS.fallback.path);
  });
});

describe('getLeaderPortrait', () => {
  it('returns augustus path for known leader', () => {
    expect(getLeaderPortrait('augustus')).toBe('/assets/images/leaders/augustus.webp');
  });
  it('returns fallback for unknown leader', () => {
    expect(getLeaderPortrait('unknown-leader' as never)).toBe(LEADER_PORTRAITS.fallback.path);
  });
});

describe('getCivGlyph', () => {
  it('returns rome path for known civ', () => {
    expect(getCivGlyph('rome')).toBe('/assets/images/civs/rome.svg');
  });
  it('returns fallback for unknown civ', () => {
    expect(getCivGlyph('unknown-civ' as never)).toBe(CIV_GLYPHS.fallback.path);
  });
});

describe('getActionIcon', () => {
  it('returns found-city path', () => {
    expect(getActionIcon('found-city')).toBe('/assets/images/icons/actions/found-city.svg');
  });
  it('returns fallback for unknown action', () => {
    expect(getActionIcon('unknown')).toBe(ACTION_ICONS.fallback.path);
  });
});

describe('getCategoryIcon', () => {
  it('returns tech path', () => {
    expect(getCategoryIcon('tech')).toBe('/assets/images/icons/categories/tech.svg');
  });
  it('returns fallback for unknown category', () => {
    expect(getCategoryIcon('unknown')).toBe(CATEGORY_ICONS.fallback.path);
  });
});

describe('getStateIcon', () => {
  it('returns locked path', () => {
    expect(getStateIcon('locked')).toBe('/assets/images/icons/states/locked.svg');
  });
  it('returns fallback for unknown state', () => {
    expect(getStateIcon('unknown')).toBe(STATE_ICONS.fallback.path);
  });
});

describe('getBackground', () => {
  it('returns setup-screen path', () => {
    expect(getBackground('setup-screen')).toBe('/assets/images/backgrounds/setup-screen.webp');
  });
  it('returns fallback for unknown background', () => {
    expect(getBackground('unknown')).toBe(BACKGROUNDS.fallback.path);
  });
});

describe('getMusicTrack', () => {
  it('returns antiquity path', () => {
    expect(getMusicTrack('antiquity')).toBe('/assets/audio/music/antiquity.ogg');
  });
  it('returns fallback for unknown track', () => {
    expect(getMusicTrack('unknown')).toBe(MUSIC_TRACKS.fallback.path);
  });
});

describe('getSfxUI', () => {
  it('returns click path', () => {
    expect(getSfxUI('click')).toBe('/assets/audio/sfx/ui/click.ogg');
  });
  it('returns fallback for unknown sfx', () => {
    expect(getSfxUI('unknown')).toBe(SFX_UI.fallback.path);
  });
});

describe('getSfxUnit', () => {
  it('returns move path', () => {
    expect(getSfxUnit('move')).toBe('/assets/audio/sfx/unit/move.ogg');
  });
  it('returns fallback for unknown sfx', () => {
    expect(getSfxUnit('unknown')).toBe(SFX_UNIT.fallback.path);
  });
});

describe('getSfxCity', () => {
  it('returns founded path', () => {
    expect(getSfxCity('founded')).toBe('/assets/audio/sfx/city/founded.ogg');
  });
  it('returns fallback for unknown sfx', () => {
    expect(getSfxCity('unknown')).toBe(SFX_CITY.fallback.path);
  });
});

describe('getSfxMoment', () => {
  it('returns age-transition path', () => {
    expect(getSfxMoment('age-transition')).toBe('/assets/audio/sfx/moment/age-transition.ogg');
  });
  it('returns fallback for unknown sfx', () => {
    expect(getSfxMoment('unknown')).toBe(SFX_MOMENT.fallback.path);
  });
});

// ---------------------------------------------------------------------------
// YIELD_ICONS completeness — all standard yield types covered
// ---------------------------------------------------------------------------

describe('YIELD_ICONS completeness', () => {
  const STANDARD_YIELD_TYPES = ['food', 'production', 'gold', 'science', 'culture', 'faith', 'influence'];

  it('has entries for all standard yield types', () => {
    for (const yieldType of STANDARD_YIELD_TYPES) {
      expect(YIELD_ICONS.entries.has(yieldType), `Missing yield icon for "${yieldType}"`).toBe(true);
    }
  });
});
