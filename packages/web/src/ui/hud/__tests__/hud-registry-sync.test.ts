/**
 * hud-registry-sync — Tier-4 lint-as-test.
 *
 * Asserts bidirectional coverage between:
 *   - `HUDElementId` union in `packages/web/src/ui/hud/hudRegistry.ts`
 *     (and the `HUD_REGISTRY` Map keys it backs)
 *   - The human-readable table in `.codex/workflow/design/hud-elements.md`
 *
 * Motivated by commit-review finding F-c6155628 on `600662a` (the J-shortcut
 * blind-eval commit): a new HUD id (`idleUnitsToast`) was added to the
 * registry but never added to `hud-elements.md`. The rule in
 * `.codex/rules/ui-overlays.md` mandates both, but nothing enforced it,
 * so the two registries drift silently. This test forces them back in
 * sync on every `npm test`.
 *
 * The Markdown registry is the human-readable index. The TypeScript
 * registry is the type-level source of truth. When they disagree, the
 * union wins — this test's error message says which direction is missing
 * so the fix is obvious.
 *
 * See `.codex/workflow/design/phase-6d-findings.md` for context.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_HUD_ELEMENT_IDS, HUD_REGISTRY } from '../hudRegistry';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
// web package root → monorepo root → .codex/workflow/design/hud-elements.md
const HUD_ELEMENTS_DOC = resolve(
  CURRENT_DIR,
  '../../../../../../.codex/workflow/design/hud-elements.md',
);

/**
 * Extract ids from the running-registry table. The table starts with a
 * `| id (hudRegistry) |` header. Each data row begins with `| <id> |`
 * where the id is a camelCase identifier matching the union.
 */
function parseDocIds(md: string): ReadonlySet<string> {
  const ids = new Set<string>();
  let inTable = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\|\s*id \(hudRegistry\)\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith('|')) {
      // blank line or heading — table ended
      inTable = false;
      continue;
    }
    // Match `| <cell> |` where cell is the first column
    const m = /^\|\s*([A-Za-z][\w-]*)\s*\|/.exec(line);
    if (m && m[1] !== 'id' && !/^-+$/.test(m[1])) {
      ids.add(m[1]);
    }
  }
  return ids;
}

describe('hud registry ↔ hud-elements.md sync', () => {
  const md = readFileSync(HUD_ELEMENTS_DOC, 'utf8');
  const docIds = parseDocIds(md);
  const registryIds = new Set<string>(ALL_HUD_ELEMENT_IDS);

  it('every HUDElementId in hudRegistry.ts has a row in hud-elements.md', () => {
    const missing = [...registryIds].filter((id) => !docIds.has(id));
    expect(
      missing,
      `Missing rows in .codex/workflow/design/hud-elements.md — add an entry ` +
        `for each id. The registry (hudRegistry.ts) is the source of truth; ` +
        `the Markdown table must track it. Missing ids: [${missing.join(', ')}]`,
    ).toEqual([]);
  });

  it('every row in hud-elements.md corresponds to a HUDElementId', () => {
    const orphaned = [...docIds].filter((id) => !registryIds.has(id));
    expect(
      orphaned,
      `hud-elements.md has rows for ids that are NOT in hudRegistry.ts. Either ` +
        `add them to the HUDElementId union (if real), or remove the row. ` +
        `Orphaned ids: [${orphaned.join(', ')}]`,
    ).toEqual([]);
  });

  it('HUD_REGISTRY map covers every HUDElementId', () => {
    // Invariant inside the registry file: the map and the union cannot
    // disagree. A union member without a map entry would fail at runtime
    // on `HUD_REGISTRY.get(id)`. This test surfaces the drift explicitly.
    const missingMap = [...registryIds].filter((id) => !HUD_REGISTRY.has(id as never));
    expect(missingMap).toEqual([]);
  });
});
