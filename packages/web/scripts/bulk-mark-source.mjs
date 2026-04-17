#!/usr/bin/env node
/**
 * Bulk-mark source — updates the source + attribution for all entries in a category.
 *
 * Usage:
 *   npm run assets:bulk-mark-source -- --category=icons/yields --source=commissioned --attribution="Artist Name"
 *   node scripts/bulk-mark-source.mjs --category=leaders --source=ai-generated
 *
 * This script modifies packages/web/src/assets/registry.ts in-place using
 * text substitution. It targets lines matching the category's path prefix
 * and updates the `source:` field.
 *
 * Note: this is a best-effort text patcher, not an AST transformer.
 * Review the diff after running. If the registry structure changes, update
 * the regex here.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, '../src/assets/registry.ts');

// Parse args
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.join('=')];
    })
);

const { category, source, attribution } = args;

const VALID_SOURCES = ['placeholder', 'commissioned', 'final', 'cc0', 'ai-generated'];

if (!category || !source) {
  process.stderr.write('Usage: --category=<name> --source=<source> [--attribution="Name"]\n');
  process.stderr.write(`Valid sources: ${VALID_SOURCES.join(', ')}\n`);
  process.exit(1);
}

if (!VALID_SOURCES.includes(source)) {
  process.stderr.write(`Invalid source "${source}". Valid: ${VALID_SOURCES.join(', ')}\n`);
  process.exit(1);
}

if ((source === 'commissioned' || source === 'final') && !attribution) {
  process.stderr.write(`WARNING: source="${source}" should include --attribution="Artist Name"\n`);
}

// Category → path prefix mapping
const CATEGORY_PATH_MAP = {
  'leaders':          '/assets/images/leaders/',
  'civs':             '/assets/images/civs/',
  'icons/yields':     '/assets/images/icons/yields/',
  'icons/actions':    '/assets/images/icons/actions/',
  'icons/categories': '/assets/images/icons/categories/',
  'icons/states':     '/assets/images/icons/states/',
  'backgrounds':      '/assets/images/backgrounds/',
  'music':            '/assets/audio/music/',
  'sfx/ui':           '/assets/audio/sfx/ui/',
  'sfx/unit':         '/assets/audio/sfx/unit/',
  'sfx/city':         '/assets/audio/sfx/city/',
  'sfx/moment':       '/assets/audio/sfx/moment/',
};

const pathPrefix = CATEGORY_PATH_MAP[category];
if (!pathPrefix) {
  process.stderr.write(`Unknown category "${category}". Known: ${Object.keys(CATEGORY_PATH_MAP).join(', ')}\n`);
  process.exit(1);
}

let content = readFileSync(REGISTRY_PATH, 'utf-8');
let patchCount = 0;

// Match lines that have the path prefix and update their source field
const lines = content.split('\n');
const patched = lines.map(line => {
  if (!line.includes(pathPrefix)) return line;
  // Replace source: '...' with new source
  const updated = line.replace(/source:\s*'[^']*'/, `source: '${source}'`);
  if (updated === line) return line;

  let result = updated;

  // Add or update attribution if provided
  if (attribution) {
    if (result.includes('attribution:')) {
      result = result.replace(/attribution:\s*'[^']*'/, `attribution: '${attribution}'`);
    } else {
      // Insert attribution before closing }
      result = result.replace(/(source:\s*'[^']*')(\s*\})/, `$1, attribution: '${attribution}'$2`);
    }
  }

  patchCount++;
  return result;
});

if (patchCount === 0) {
  process.stderr.write(`No lines matched category "${category}" (path prefix: ${pathPrefix})\n`);
  process.exit(1);
}

writeFileSync(REGISTRY_PATH, patched.join('\n'), 'utf-8');

process.stdout.write(`Updated ${patchCount} entries in category "${category}" to source='${source}'`);
if (attribution) process.stdout.write(` with attribution="${attribution}"`);
process.stdout.write('\n');
process.stdout.write(`Registry file updated: src/assets/registry.ts\n`);
process.stdout.write('Run `npm run assets:validate` to check the result.\n');
