/**
 * no-raw-hex-in-chrome.test.ts -- AA4.7 regression guard (expanded BB2.1).
 *
 * Scans panel, HUD, component, and layout source files for raw rgba() literals
 * inside inline style props, which violate the chrome-raw-hex-regression
 * trap documented in `.codex/rules/tech-conventions.md`.
 *
 * Detection: static string scan. Acceptable exclusions:
 *   - Comment-only lines.
 *   - CSS var cascade fallbacks: var(--x, rgba(...)) stripped before check.
 *   - .css token files (rgba in token definitions is expected).
 *   - ui/components/Minimap.tsx: Canvas 2D ctx.fillStyle/strokeStyle uses are
 *     intentional (Canvas API, not chrome).
 *
 * Files scanned: ui/panels/*.tsx + ui/hud/*.tsx
 *              + ui/components/*.tsx + ui/layout/*.tsx (BB2.1 expansion)
 * Excluded:    canvas/ (Canvas 2D rgba is intentional)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// -- File collection ---------------------------------------------------

const WEB_SRC        = path.resolve(__dirname, '..');
const PANEL_DIR      = path.join(WEB_SRC, 'ui', 'panels');
const HUD_DIR        = path.join(WEB_SRC, 'ui', 'hud');
const COMPONENTS_DIR = path.join(WEB_SRC, 'ui', 'components');
const LAYOUT_DIR     = path.join(WEB_SRC, 'ui', 'layout');

/**
 * Files that are exempt from the raw-rgba scan because they use the Canvas 2D
 * API (ctx.fillStyle, ctx.strokeStyle) intentionally — not chrome inline styles.
 */
const CANVAS_EXEMPT = new Set([
  path.join(COMPONENTS_DIR, 'Minimap.tsx'),
]);

function collectTsxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f: string) => f.endsWith('.tsx') || (f.endsWith('.ts') && !f.endsWith('.test.ts')))
    .map((f: string) => path.join(dir, f))
    .filter((p: string) => !CANVAS_EXEMPT.has(p));
}

// -- Violation detection ------------------------------------------------

interface Violation {
  file: string;
  line: number;
  content: string;
}

function isCommentLine(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/**
 * Check if a line has a bare rgba() literal — i.e., rgba() NOT inside a
 * var(--x, ...) cascade fallback.
 *
 * Strategy: split the line on every `rgba(` occurrence. For each occurrence,
 * walk backwards in the pre-split segment to see if it's inside a `var(--`
 * expression. An `rgba(` preceded by a comma inside an open `var(--...` call
 * is a cascade fallback (acceptable); otherwise it's a bare literal (violation).
 *
 * This avoids the catastrophic backtracking that the nested-paren regex
 * /var\s*\((?:[^()]*|\([^()]*\))*rgba[^)]*\)/ exhibited on lines with
 * deeply-nested var(--a, var(--b, value)) patterns (24–54 seconds per line).
 */
function hasBareRgba(line: string): boolean {
  const parts = line.split('rgba(');
  // parts[0] is before first rgba(; parts[1..] are after each rgba(
  for (let p = 1; p < parts.length; p++) {
    const before = parts.slice(0, p).join('rgba(');
    // Walk backwards to see if we're inside a var(-- call.
    // Count open parens from the last var(-- occurrence.
    const varIdx = before.lastIndexOf('var(--');
    if (varIdx === -1) {
      // No var(-- precedes this rgba( — it's a bare literal.
      return true;
    }
    // Count net open parens between varIdx and end of `before`.
    const between = before.slice(varIdx + 4); // skip 'var('
    let depth = 1;
    for (const ch of between) {
      if (ch === '(') depth++;
      else if (ch === ')') { depth--; if (depth === 0) break; }
    }
    if (depth > 0) {
      // Still inside the var(-- call — this is a cascade fallback. OK.
      continue;
    }
    // var(-- was already closed before this rgba( — treat as bare literal.
    return true;
  }
  return false;
}

function scanFile(filePath: string): Violation[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const lines  = source.split('\n');
  const violations: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCommentLine(line)) continue;
    if (hasBareRgba(line)) {
      violations.push({ file: filePath, line: i + 1, content: line.trimEnd() });
    }
  }
  return violations;
}

// -- Test ---------------------------------------------------------------

describe('no-raw-hex-in-chrome (AA4.7 + BB2.1)', () => {
  const panelFiles     = collectTsxFiles(PANEL_DIR);
  const hudFiles       = collectTsxFiles(HUD_DIR);
  const componentFiles = collectTsxFiles(COMPONENTS_DIR);
  const layoutFiles    = collectTsxFiles(LAYOUT_DIR);
  const allFiles       = [...panelFiles, ...hudFiles, ...componentFiles, ...layoutFiles];

  it('finds .tsx source files to scan', () => {
    expect(allFiles.length).toBeGreaterThan(0);
  });

  it('has zero raw rgba() literals in panel, HUD, component, and layout chrome files', () => {
    const allViolations: Violation[] = [];
    for (const file of allFiles) {
      allViolations.push(...scanFile(file));
    }
    if (allViolations.length > 0) {
      const report = allViolations.map(v => {
        const parts = v.file.split(path.sep);
        const shortPath = parts.slice(-3).join('/');
        return `  ${shortPath}:${v.line}` + '\n' + `    ${v.content.trimStart().slice(0, 100)}`;
      }).join('\n');
      throw new Error(
        `Found ${allViolations.length} raw rgba() literal(s) in UI chrome files.\n` +
        `Replace each with a var(--panel-*) or var(--hud-*) token.\n\n` +
        report
      );
    }
  });
});
