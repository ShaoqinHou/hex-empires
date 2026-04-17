#!/usr/bin/env node
/**
 * Asset status — shows a table of all registered assets and their sources.
 *
 * Usage:
 *   npm run assets:status          (from packages/web/)
 *   node scripts/asset-status.mjs
 *
 * Reads registry data from the static mirror embedded in this script
 * (same approach as validate-assets.mjs — keep in sync with registry.ts).
 */

import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_ROOT = resolve(__dirname, '../public');

function pathToAbsolute(registryPath) {
  return join(ASSETS_ROOT, registryPath);
}

// Static mirror of registry.ts — keep in sync
const REGISTRY = {
  leaders: {
    entries: {
      augustus: { path: '/assets/images/leaders/augustus.webp', source: 'placeholder' },
      cleopatra: { path: '/assets/images/leaders/cleopatra.webp', source: 'placeholder' },
      pericles: { path: '/assets/images/leaders/pericles.webp', source: 'placeholder' },
      cyrus: { path: '/assets/images/leaders/cyrus.webp', source: 'placeholder' },
      gandhi: { path: '/assets/images/leaders/gandhi.webp', source: 'placeholder' },
      'qin-shi-huang': { path: '/assets/images/leaders/qin-shi-huang.webp', source: 'placeholder' },
      alexander: { path: '/assets/images/leaders/alexander.webp', source: 'placeholder' },
      hatshepsut: { path: '/assets/images/leaders/hatshepsut.webp', source: 'placeholder' },
      'genghis-khan': { path: '/assets/images/leaders/genghis-khan.webp', source: 'placeholder' },
    },
  },
  civs: {
    entries: {
      rome: { path: '/assets/images/civs/rome.svg', source: 'placeholder' },
      egypt: { path: '/assets/images/civs/egypt.svg', source: 'placeholder' },
      greece: { path: '/assets/images/civs/greece.svg', source: 'placeholder' },
      persia: { path: '/assets/images/civs/persia.svg', source: 'placeholder' },
      india: { path: '/assets/images/civs/india.svg', source: 'placeholder' },
      china: { path: '/assets/images/civs/china.svg', source: 'placeholder' },
      vikings: { path: '/assets/images/civs/vikings.svg', source: 'placeholder' },
      spain: { path: '/assets/images/civs/spain.svg', source: 'placeholder' },
      england: { path: '/assets/images/civs/england.svg', source: 'placeholder' },
      france: { path: '/assets/images/civs/france.svg', source: 'placeholder' },
      ottoman: { path: '/assets/images/civs/ottoman.svg', source: 'placeholder' },
      japan: { path: '/assets/images/civs/japan.svg', source: 'placeholder' },
      mongolia: { path: '/assets/images/civs/mongolia.svg', source: 'placeholder' },
      america: { path: '/assets/images/civs/america.svg', source: 'placeholder' },
      germany: { path: '/assets/images/civs/germany.svg', source: 'placeholder' },
      russia: { path: '/assets/images/civs/russia.svg', source: 'placeholder' },
      brazil: { path: '/assets/images/civs/brazil.svg', source: 'placeholder' },
    },
  },
  'icons/yields': {
    entries: {
      food: { path: '/assets/images/icons/yields/food.svg', source: 'placeholder' },
      production: { path: '/assets/images/icons/yields/production.svg', source: 'placeholder' },
      gold: { path: '/assets/images/icons/yields/gold.svg', source: 'placeholder' },
      science: { path: '/assets/images/icons/yields/science.svg', source: 'placeholder' },
      culture: { path: '/assets/images/icons/yields/culture.svg', source: 'placeholder' },
      faith: { path: '/assets/images/icons/yields/faith.svg', source: 'placeholder' },
      influence: { path: '/assets/images/icons/yields/influence.svg', source: 'placeholder' },
      housing: { path: '/assets/images/icons/yields/housing.svg', source: 'placeholder' },
      diplomacy: { path: '/assets/images/icons/yields/diplomacy.svg', source: 'placeholder' },
    },
  },
  'icons/actions': {
    entries: {
      'found-city': { path: '/assets/images/icons/actions/found-city.svg', source: 'placeholder' },
      fortify: { path: '/assets/images/icons/actions/fortify.svg', source: 'placeholder' },
      attack: { path: '/assets/images/icons/actions/attack.svg', source: 'placeholder' },
      'build-improvement': { path: '/assets/images/icons/actions/build-improvement.svg', source: 'placeholder' },
      move: { path: '/assets/images/icons/actions/move.svg', source: 'placeholder' },
      'ranged-attack': { path: '/assets/images/icons/actions/ranged-attack.svg', source: 'placeholder' },
      bombard: { path: '/assets/images/icons/actions/bombard.svg', source: 'placeholder' },
      embark: { path: '/assets/images/icons/actions/embark.svg', source: 'placeholder' },
      disembark: { path: '/assets/images/icons/actions/disembark.svg', source: 'placeholder' },
    },
  },
  'icons/categories': {
    entries: {
      tech: { path: '/assets/images/icons/categories/tech.svg', source: 'placeholder' },
      civics: { path: '/assets/images/icons/categories/civics.svg', source: 'placeholder' },
      religion: { path: '/assets/images/icons/categories/religion.svg', source: 'placeholder' },
      government: { path: '/assets/images/icons/categories/government.svg', source: 'placeholder' },
      diplomacy: { path: '/assets/images/icons/categories/diplomacy.svg', source: 'placeholder' },
      commanders: { path: '/assets/images/icons/categories/commanders.svg', source: 'placeholder' },
      governors: { path: '/assets/images/icons/categories/governors.svg', source: 'placeholder' },
      trade: { path: '/assets/images/icons/categories/trade.svg', source: 'placeholder' },
      achievements: { path: '/assets/images/icons/categories/achievements.svg', source: 'placeholder' },
      city: { path: '/assets/images/icons/categories/city.svg', source: 'placeholder' },
      military: { path: '/assets/images/icons/categories/military.svg', source: 'placeholder' },
    },
  },
  'icons/states': {
    entries: {
      locked: { path: '/assets/images/icons/states/locked.svg', source: 'placeholder' },
      unlocked: { path: '/assets/images/icons/states/unlocked.svg', source: 'placeholder' },
      researching: { path: '/assets/images/icons/states/researching.svg', source: 'placeholder' },
      completed: { path: '/assets/images/icons/states/completed.svg', source: 'placeholder' },
      'in-progress': { path: '/assets/images/icons/states/in-progress.svg', source: 'placeholder' },
      unavailable: { path: '/assets/images/icons/states/unavailable.svg', source: 'placeholder' },
    },
  },
  backgrounds: {
    entries: {
      'setup-screen': { path: '/assets/images/backgrounds/setup-screen.webp', source: 'placeholder' },
      'age-antiquity': { path: '/assets/images/backgrounds/age-antiquity.webp', source: 'placeholder' },
      'age-exploration': { path: '/assets/images/backgrounds/age-exploration.webp', source: 'placeholder' },
      'age-modern': { path: '/assets/images/backgrounds/age-modern.webp', source: 'placeholder' },
      victory: { path: '/assets/images/backgrounds/victory.webp', source: 'placeholder' },
      'crisis-plague': { path: '/assets/images/backgrounds/crisis/plague.webp', source: 'placeholder' },
      'crisis-barbarian': { path: '/assets/images/backgrounds/crisis/barbarian-invasion.webp', source: 'placeholder' },
      'crisis-disaster': { path: '/assets/images/backgrounds/crisis/natural-disaster.webp', source: 'placeholder' },
      'crisis-golden-age': { path: '/assets/images/backgrounds/crisis/golden-age.webp', source: 'placeholder' },
      'crisis-trade': { path: '/assets/images/backgrounds/crisis/trade-opportunity.webp', source: 'placeholder' },
    },
  },
  music: {
    entries: {
      antiquity: { path: '/assets/audio/music/antiquity.ogg', source: 'placeholder' },
      exploration: { path: '/assets/audio/music/exploration.ogg', source: 'placeholder' },
      modern: { path: '/assets/audio/music/modern.ogg', source: 'placeholder' },
      combat: { path: '/assets/audio/music/combat.ogg', source: 'placeholder' },
      victory: { path: '/assets/audio/music/victory.ogg', source: 'placeholder' },
    },
  },
  'sfx/ui': {
    entries: {
      click: { path: '/assets/audio/sfx/ui/click.ogg', source: 'placeholder' },
      hover: { path: '/assets/audio/sfx/ui/hover.ogg', source: 'placeholder' },
      'open-panel': { path: '/assets/audio/sfx/ui/open-panel.ogg', source: 'placeholder' },
      'close-panel': { path: '/assets/audio/sfx/ui/close-panel.ogg', source: 'placeholder' },
      error: { path: '/assets/audio/sfx/ui/error.ogg', source: 'placeholder' },
    },
  },
  'sfx/unit': {
    entries: {
      move: { path: '/assets/audio/sfx/unit/move.ogg', source: 'placeholder' },
      attack: { path: '/assets/audio/sfx/unit/attack.ogg', source: 'placeholder' },
      death: { path: '/assets/audio/sfx/unit/death.ogg', source: 'placeholder' },
      fortify: { path: '/assets/audio/sfx/unit/fortify.ogg', source: 'placeholder' },
    },
  },
  'sfx/city': {
    entries: {
      founded: { path: '/assets/audio/sfx/city/founded.ogg', source: 'placeholder' },
      grown: { path: '/assets/audio/sfx/city/grown.ogg', source: 'placeholder' },
      built: { path: '/assets/audio/sfx/city/built.ogg', source: 'placeholder' },
      captured: { path: '/assets/audio/sfx/city/captured.ogg', source: 'placeholder' },
    },
  },
  'sfx/moment': {
    entries: {
      'age-transition': { path: '/assets/audio/sfx/moment/age-transition.ogg', source: 'placeholder' },
      'tech-complete': { path: '/assets/audio/sfx/moment/tech-complete.ogg', source: 'placeholder' },
      'civic-complete': { path: '/assets/audio/sfx/moment/civic-complete.ogg', source: 'placeholder' },
      'wonder-complete': { path: '/assets/audio/sfx/moment/wonder-complete.ogg', source: 'placeholder' },
      'crisis-warning': { path: '/assets/audio/sfx/moment/crisis-warning.ogg', source: 'placeholder' },
      'victory-fanfare': { path: '/assets/audio/sfx/moment/victory-fanfare.ogg', source: 'placeholder' },
    },
  },
};

// Source counts per category
function countSources(entries, assetRoot) {
  const counts = { placeholder: 0, 'ai-generated': 0, commissioned: 0, final: 0, cc0: 0, missing: 0, total: 0 };
  for (const entry of Object.values(entries)) {
    counts.total++;
    const abs = join(assetRoot, entry.path);
    if (!existsSync(abs)) {
      counts.missing++;
    } else {
      counts[entry.source] = (counts[entry.source] ?? 0) + 1;
    }
  }
  return counts;
}

process.stdout.write('\nAsset status — hex-empires\n');
process.stdout.write('='.repeat(65) + '\n');
process.stdout.write(
  'CATEGORY'.padEnd(22) +
  'TOTAL'.padEnd(7) +
  'PLCHLDR'.padEnd(9) +
  'AI-GEN'.padEnd(8) +
  'COMMISS'.padEnd(9) +
  'FINAL'.padEnd(7) +
  'CC0'.padEnd(6) +
  'MISSING\n'
);
process.stdout.write('-'.repeat(65) + '\n');

let grandTotal = 0;
let grandPresent = 0;

for (const [catName, cat] of Object.entries(REGISTRY)) {
  const counts = countSources(cat.entries, ASSETS_ROOT);
  grandTotal += counts.total;
  grandPresent += counts.total - counts.missing;

  process.stdout.write(
    catName.padEnd(22) +
    String(counts.total).padEnd(7) +
    String(counts.placeholder ?? 0).padEnd(9) +
    String(counts['ai-generated'] ?? 0).padEnd(8) +
    String(counts.commissioned ?? 0).padEnd(9) +
    String(counts.final ?? 0).padEnd(7) +
    String(counts.cc0 ?? 0).padEnd(6) +
    (counts.missing > 0 ? `${counts.missing} missing` : '') +
    '\n'
  );
}

process.stdout.write('-'.repeat(65) + '\n');
process.stdout.write(`Total: ${grandPresent}/${grandTotal} files present on disk.\n\n`);
