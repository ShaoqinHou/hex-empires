#!/usr/bin/env node
/**
 * Asset validator — checks that every registered asset exists, is within
 * size limits, and that fallback files are present.
 *
 * Usage:
 *   npm run assets:validate          (from packages/web/)
 *   node scripts/validate-assets.mjs
 *
 * Exit codes:
 *   0 = all-green (warnings may be printed but don't fail)
 *   1 = one or more errors
 *
 * No runtime dependencies beyond Node built-ins.
 * Optional: if `image-size` is installed, dimension checks run for images.
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Public assets root — served by Vite as /assets/... */
const ASSETS_ROOT = resolve(__dirname, '../public');

/** Max file sizes (bytes) */
const MAX_SIZES = {
  image: 5 * 1024 * 1024,    // 5 MB
  audio: 15 * 1024 * 1024,   // 15 MB
};

/** Dimension constraints per category pattern (pixels) */
const DIMENSION_CONSTRAINTS = {
  leaders:     { min: [512, 768], max: [1024, 1536] },
  civs:        { min: [64, 64],   max: [512, 512] },
  yields:      { min: [16, 16],   max: [96, 96] },
  actions:     { min: [16, 16],   max: [96, 96] },
  categories:  { min: [16, 16],   max: [96, 96] },
  states:      { min: [12, 12],   max: [48, 48] },
  backgrounds: { min: [1280, 720], max: [3840, 2160] },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let errors = 0;
let warnings = 0;
let checked = 0;
const categoryStats = {};

function pass(msg) {
  process.stdout.write(`\x1b[32m✓\x1b[0m ${msg}\n`);
}

function warn(msg) {
  warnings++;
  process.stdout.write(`\x1b[33m⚠\x1b[0m ${msg}\n`);
}

function fail(msg) {
  errors++;
  process.stdout.write(`\x1b[31m✗\x1b[0m ${msg}\n`);
}

function pathToAbsolute(registryPath) {
  // registry paths are like /assets/images/leaders/augustus.webp
  return join(ASSETS_ROOT, registryPath);
}

function getDimensionConstraint(path) {
  if (path.includes('/leaders/'))     return DIMENSION_CONSTRAINTS.leaders;
  if (path.includes('/civs/'))        return DIMENSION_CONSTRAINTS.civs;
  if (path.includes('/yields/'))      return DIMENSION_CONSTRAINTS.yields;
  if (path.includes('/actions/'))     return DIMENSION_CONSTRAINTS.actions;
  if (path.includes('/categories/'))  return DIMENSION_CONSTRAINTS.categories;
  if (path.includes('/states/'))      return DIMENSION_CONSTRAINTS.states;
  if (path.includes('/backgrounds/')) return DIMENSION_CONSTRAINTS.backgrounds;
  return null;
}

function isAudio(path) {
  return path.endsWith('.ogg') || path.endsWith('.mp3') || path.endsWith('.wav');
}

function isImage(path) {
  return path.endsWith('.svg') || path.endsWith('.webp') || path.endsWith('.png') || path.endsWith('.jpg');
}

// Attempt dimension check via image-size (optional dependency)
let sizeOf = null;
try {
  const mod = await import('image-size');
  sizeOf = mod.default || mod.imageSize || mod;
} catch {
  // image-size not installed — skip dimension checks
}

function checkDimensions(absolutePath, registryPath) {
  if (!sizeOf) return; // skip if not available
  const constraint = getDimensionConstraint(registryPath);
  if (!constraint) return;
  if (registryPath.endsWith('.svg')) return; // SVG is scalable, skip

  try {
    const dims = sizeOf(absolutePath);
    const [w, h] = [dims.width, dims.height];
    const [minW, minH] = constraint.min;
    const [maxW, maxH] = constraint.max;

    if (w < minW || h < minH) {
      warn(`${registryPath}: dimensions ${w}x${h} below minimum ${minW}x${minH}`);
    } else if (w > maxW || h > maxH) {
      warn(`${registryPath}: dimensions ${w}x${h} above maximum ${maxW}x${maxH}`);
    }
  } catch {
    // sizeOf failed for this file type — skip
  }
}

function checkEntry(categoryName, key, entry) {
  checked++;
  const abs = pathToAbsolute(entry.path);
  const cat = categoryStats[categoryName] ?? { total: 0, missing: 0, missingKeys: [] };

  cat.total++;

  if (!existsSync(abs)) {
    cat.missing++;
    cat.missingKeys.push(key);
    categoryStats[categoryName] = cat;
    // Missing assets are warnings (fallback kicks in), not hard errors
    warn(`${categoryName}/${key}: file missing at ${entry.path}`);
    return;
  }

  // File size check
  const size = statSync(abs).size;
  const limit = isAudio(entry.path) ? MAX_SIZES.audio : MAX_SIZES.image;
  if (size > limit) {
    fail(`${categoryName}/${key}: ${entry.path} is ${(size / 1024 / 1024).toFixed(1)}MB (max ${(limit / 1024 / 1024).toFixed(0)}MB)`);
  }

  // Attribution check for commissioned/final
  if ((entry.source === 'commissioned' || entry.source === 'final') && !entry.attribution) {
    fail(`${categoryName}/${key}: source='${entry.source}' but no attribution provided`);
  }

  checkDimensions(abs, entry.path);
  categoryStats[categoryName] = cat;
}

function checkFallback(categoryName, fallback) {
  const abs = pathToAbsolute(fallback.path);
  if (!existsSync(abs)) {
    // Audio fallbacks are silent stubs — warn only (no content to check)
    // Image fallbacks are required for visual integrity — hard error
    if (isAudio(fallback.path)) {
      warn(`${categoryName}: audio fallback missing at ${fallback.path} (stub OGG needed)`);
    } else {
      fail(`${categoryName}: fallback file missing at ${fallback.path}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Load registry dynamically
// ---------------------------------------------------------------------------

// We can't import TS directly from an mjs script at runtime.
// Instead, we read the registry.ts file and extract the data via a mini-parser
// that reads the known structure. This avoids needing ts-node or build artifacts.
//
// Approach: read registry entries from the build output (dist/) if available,
// or fall back to a static config embedded here.
//
// For the validator to work in CI (where dist/ exists) and in dev (where we
// run pre-build), we use the STATIC COPY approach: a JSON manifest of all
// registered paths is generated by a separate build step, or we use a
// hard-coded registry mirror here.
//
// v1 implementation: uses the known registry structure embedded as JS.
// When the registry grows, update this file in tandem (low-friction since
// the validator is run as a check after registry edits).

const REGISTRY = {
  leaders: {
    fallback: '/assets/images/leaders/_fallback-silhouette.svg',
    entries: {
      augustus:      '/assets/images/leaders/augustus.webp',
      cleopatra:     '/assets/images/leaders/cleopatra.webp',
      pericles:      '/assets/images/leaders/pericles.webp',
      cyrus:         '/assets/images/leaders/cyrus.webp',
      gandhi:        '/assets/images/leaders/gandhi.webp',
      'qin-shi-huang': '/assets/images/leaders/qin-shi-huang.webp',
      alexander:     '/assets/images/leaders/alexander.webp',
      hatshepsut:    '/assets/images/leaders/hatshepsut.webp',
      'genghis-khan':'/assets/images/leaders/genghis-khan.webp',
    },
  },
  civs: {
    fallback: '/assets/images/civs/_fallback-glyph.svg',
    entries: {
      rome: '/assets/images/civs/rome.svg', egypt: '/assets/images/civs/egypt.svg',
      greece: '/assets/images/civs/greece.svg', persia: '/assets/images/civs/persia.svg',
      india: '/assets/images/civs/india.svg', china: '/assets/images/civs/china.svg',
      vikings: '/assets/images/civs/vikings.svg', spain: '/assets/images/civs/spain.svg',
      england: '/assets/images/civs/england.svg', france: '/assets/images/civs/france.svg',
      ottoman: '/assets/images/civs/ottoman.svg', japan: '/assets/images/civs/japan.svg',
      mongolia: '/assets/images/civs/mongolia.svg', america: '/assets/images/civs/america.svg',
      germany: '/assets/images/civs/germany.svg', russia: '/assets/images/civs/russia.svg',
      brazil: '/assets/images/civs/brazil.svg',
    },
  },
  'icons/yields': {
    fallback: '/assets/images/icons/yields/_fallback-circle.svg',
    entries: {
      food: '/assets/images/icons/yields/food.svg',
      production: '/assets/images/icons/yields/production.svg',
      gold: '/assets/images/icons/yields/gold.svg',
      science: '/assets/images/icons/yields/science.svg',
      culture: '/assets/images/icons/yields/culture.svg',
      faith: '/assets/images/icons/yields/faith.svg',
      influence: '/assets/images/icons/yields/influence.svg',
      housing: '/assets/images/icons/yields/housing.svg',
      diplomacy: '/assets/images/icons/yields/diplomacy.svg',
    },
  },
  'icons/actions': {
    fallback: '/assets/images/icons/actions/_fallback-action.svg',
    entries: {
      'found-city': '/assets/images/icons/actions/found-city.svg',
      fortify: '/assets/images/icons/actions/fortify.svg',
      attack: '/assets/images/icons/actions/attack.svg',
      'build-improvement': '/assets/images/icons/actions/build-improvement.svg',
      move: '/assets/images/icons/actions/move.svg',
      'ranged-attack': '/assets/images/icons/actions/ranged-attack.svg',
      bombard: '/assets/images/icons/actions/bombard.svg',
      embark: '/assets/images/icons/actions/embark.svg',
      disembark: '/assets/images/icons/actions/disembark.svg',
    },
  },
  'icons/categories': {
    fallback: '/assets/images/icons/categories/_fallback-category.svg',
    entries: {
      tech: '/assets/images/icons/categories/tech.svg',
      civics: '/assets/images/icons/categories/civics.svg',
      religion: '/assets/images/icons/categories/religion.svg',
      government: '/assets/images/icons/categories/government.svg',
      diplomacy: '/assets/images/icons/categories/diplomacy.svg',
      commanders: '/assets/images/icons/categories/commanders.svg',
      governors: '/assets/images/icons/categories/governors.svg',
      trade: '/assets/images/icons/categories/trade.svg',
      achievements: '/assets/images/icons/categories/achievements.svg',
      city: '/assets/images/icons/categories/city.svg',
      military: '/assets/images/icons/categories/military.svg',
    },
  },
  'icons/states': {
    fallback: '/assets/images/icons/states/_fallback-state.svg',
    entries: {
      locked: '/assets/images/icons/states/locked.svg',
      unlocked: '/assets/images/icons/states/unlocked.svg',
      researching: '/assets/images/icons/states/researching.svg',
      completed: '/assets/images/icons/states/completed.svg',
      'in-progress': '/assets/images/icons/states/in-progress.svg',
      unavailable: '/assets/images/icons/states/unavailable.svg',
    },
  },
  backgrounds: {
    fallback: '/assets/images/backgrounds/_fallback-bg.svg',
    entries: {
      'setup-screen': '/assets/images/backgrounds/setup-screen.webp',
      'age-antiquity': '/assets/images/backgrounds/age-antiquity.webp',
      'age-exploration': '/assets/images/backgrounds/age-exploration.webp',
      'age-modern': '/assets/images/backgrounds/age-modern.webp',
      victory: '/assets/images/backgrounds/victory.webp',
      'crisis-plague': '/assets/images/backgrounds/crisis/plague.webp',
      'crisis-barbarian': '/assets/images/backgrounds/crisis/barbarian-invasion.webp',
      'crisis-disaster': '/assets/images/backgrounds/crisis/natural-disaster.webp',
      'crisis-golden-age': '/assets/images/backgrounds/crisis/golden-age.webp',
      'crisis-trade': '/assets/images/backgrounds/crisis/trade-opportunity.webp',
    },
  },
  music: {
    fallback: '/assets/audio/_fallback-silence.ogg',
    entries: {
      antiquity: '/assets/audio/music/antiquity.ogg',
      exploration: '/assets/audio/music/exploration.ogg',
      modern: '/assets/audio/music/modern.ogg',
      combat: '/assets/audio/music/combat.ogg',
      victory: '/assets/audio/music/victory.ogg',
    },
  },
  'sfx/ui': {
    fallback: '/assets/audio/_fallback-silence.ogg',
    entries: {
      click: '/assets/audio/sfx/ui/click.ogg',
      hover: '/assets/audio/sfx/ui/hover.ogg',
      'open-panel': '/assets/audio/sfx/ui/open-panel.ogg',
      'close-panel': '/assets/audio/sfx/ui/close-panel.ogg',
      error: '/assets/audio/sfx/ui/error.ogg',
    },
  },
  'sfx/unit': {
    fallback: '/assets/audio/_fallback-silence.ogg',
    entries: {
      move: '/assets/audio/sfx/unit/move.ogg',
      attack: '/assets/audio/sfx/unit/attack.ogg',
      death: '/assets/audio/sfx/unit/death.ogg',
      fortify: '/assets/audio/sfx/unit/fortify.ogg',
    },
  },
  'sfx/city': {
    fallback: '/assets/audio/_fallback-silence.ogg',
    entries: {
      founded: '/assets/audio/sfx/city/founded.ogg',
      grown: '/assets/audio/sfx/city/grown.ogg',
      built: '/assets/audio/sfx/city/built.ogg',
      captured: '/assets/audio/sfx/city/captured.ogg',
    },
  },
  'sfx/moment': {
    fallback: '/assets/audio/_fallback-silence.ogg',
    entries: {
      'age-transition': '/assets/audio/sfx/moment/age-transition.ogg',
      'tech-complete': '/assets/audio/sfx/moment/tech-complete.ogg',
      'civic-complete': '/assets/audio/sfx/moment/civic-complete.ogg',
      'wonder-complete': '/assets/audio/sfx/moment/wonder-complete.ogg',
      'crisis-warning': '/assets/audio/sfx/moment/crisis-warning.ogg',
      'victory-fanfare': '/assets/audio/sfx/moment/victory-fanfare.ogg',
    },
  },
};

// ---------------------------------------------------------------------------
// Run validation
// ---------------------------------------------------------------------------

process.stdout.write('\nAsset validator — hex-empires\n');
process.stdout.write('='.repeat(40) + '\n\n');

for (const [catName, cat] of Object.entries(REGISTRY)) {
  // Check fallback
  checkFallback(catName, { path: cat.fallback });

  // Check each entry
  for (const [key, path] of Object.entries(cat.entries)) {
    checkEntry(catName, key, { path, source: 'placeholder' });
  }
}

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------

process.stdout.write('\n' + '-'.repeat(40) + '\n');
process.stdout.write('CATEGORY'.padEnd(22) + 'TOTAL'.padEnd(8) + 'MISSING\n');
process.stdout.write('-'.repeat(40) + '\n');

for (const [cat, stats] of Object.entries(categoryStats)) {
  const ok = stats.total - stats.missing;
  const line = cat.padEnd(22) + `${ok}/${stats.total}`.padEnd(8) +
    (stats.missing > 0 ? `${stats.missing} missing` : '');
  process.stdout.write(line + '\n');
}

process.stdout.write('\n');

if (errors === 0 && warnings === 0) {
  pass(`All ${checked} registered assets passed validation.`);
} else {
  if (warnings > 0) warn(`${warnings} warning(s)`);
  if (errors > 0) fail(`${errors} error(s)`);
}

process.exit(errors > 0 ? 1 : 0);
