/**
 * build-smoke.spec.ts — Guards against the "broken base path" class of deploy failures.
 *
 * Background: hex-empires is served at /hex-empires/ on cv.rehou.games, so the
 * Vite build must be run with --base /hex-empires/.  Without it, the built
 * index.html references /assets/... (root-relative), which resolves correctly on
 * localhost but 404s in production where files live under /hex-empires/assets/.
 *
 * This spec does NOT require a running dev server.  It reads the built output
 * from packages/web/dist/ directly (file-system assertions only) so it can run in
 * CI immediately after `npm run build:deploy`.
 *
 * Run: npx playwright test e2e/build-smoke.spec.ts
 * (Playwright is used here for its test runner, not its browser automation.)
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve dist from this spec file's location:
// e2e/ -> packages/web/ -> packages/web/dist/
const DIST_DIR = path.resolve(__dirname, '../dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');
const EXPECTED_BASE = '/hex-empires/';

test.describe('Production build smoke tests (dist/ filesystem checks)', () => {
  // Skip the whole suite if dist/ doesn't exist — this spec only applies after
  // running `npm run build:deploy`.  The regular e2e suite runs against the dev
  // server and does not require a prior build.
  test.beforeEach(async () => {
    if (!fs.existsSync(DIST_DIR)) {
      test.skip();
    }
  });

  test('dist/index.html exists', () => {
    expect(fs.existsSync(INDEX_HTML), `dist/index.html not found — run npm run build:deploy first`).toBe(true);
  });

  test('index.html script src starts with /hex-empires/assets/', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    // Vite emits the entry module as <script type="module" src="...">
    const scriptMatch = html.match(/<script[^>]+src="([^"]+)"/);
    expect(scriptMatch, 'No <script src="..."> found in index.html').toBeTruthy();
    const src = scriptMatch![1];
    expect(
      src.startsWith(EXPECTED_BASE),
      `Script src "${src}" does not start with "${EXPECTED_BASE}". ` +
        `Build was likely run without --base /hex-empires/. Use: npm run build:deploy`,
    ).toBe(true);
  });

  test('index.html stylesheet href starts with /hex-empires/assets/', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const linkMatches = [...html.matchAll(/<link[^>]+href="([^"]+\.css[^"]*)"/g)];
    // Filter to asset stylesheets (not Google Fonts / preconnect)
    const assetLinks = linkMatches
      .map((m) => m[1])
      .filter((href) => href.includes('/assets/'));
    expect(assetLinks.length, 'No asset stylesheet links found in index.html').toBeGreaterThan(0);
    for (const href of assetLinks) {
      expect(
        href.startsWith(EXPECTED_BASE),
        `Stylesheet href "${href}" does not start with "${EXPECTED_BASE}". ` +
          `Build was likely run without --base /hex-empires/. Use: npm run build:deploy`,
      ).toBe(true);
    }
  });

  test('index.html modulepreload hrefs start with /hex-empires/assets/', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    const preloadMatches = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)];
    // If no modulepreload links that's fine (small build), but if they exist they must use the base.
    for (const m of preloadMatches) {
      const href = m[1];
      expect(
        href.startsWith(EXPECTED_BASE),
        `Modulepreload href "${href}" does not start with "${EXPECTED_BASE}". ` +
          `Build was likely run without --base /hex-empires/. Use: npm run build:deploy`,
      ).toBe(true);
    }
  });

  test('no asset paths use root-relative /assets/ (would 404 under /hex-empires/)', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    // Look for any src/href that starts exactly with /assets/ — that's the broken pattern.
    const rootRelative = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
    expect(
      rootRelative,
      `Found root-relative asset paths that will 404 in production: ${rootRelative.join(', ')}. ` +
        `Use: npm run build:deploy`,
    ).toEqual([]);
  });

  test('dist/assets/ directory contains at least one JS chunk', () => {
    const assetsDir = path.join(DIST_DIR, 'assets');
    expect(fs.existsSync(assetsDir), 'dist/assets/ directory missing').toBe(true);
    const jsFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.js'));
    expect(jsFiles.length, 'No JS chunks found in dist/assets/').toBeGreaterThan(0);
  });
});
