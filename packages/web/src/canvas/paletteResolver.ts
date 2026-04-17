/**
 * paletteResolver — reads CSS custom properties from :root at runtime and
 * memoizes them so canvas rendering code never calls getComputedStyle on every frame.
 *
 * Rules:
 *   - Every tile-color lookup in HexRenderer goes through getPaletteColor().
 *   - Call invalidatePaletteCache() after a theme toggle or viewport-class change
 *     (future theming) to force a re-read on the next frame.
 *   - Returns '' for missing tokens; callers must provide a safe fallback.
 *
 * Why: canvas ctx.fillStyle cannot consume CSS var() directly. This module is
 * the bridge that respects the token-first philosophy (P3) while remaining
 * compatible with the Canvas 2D API.
 *
 * Location: packages/web/src/canvas/paletteResolver.ts
 */

// Cached resolved values: token name → resolved string
const _cache = new Map<string, string>();

/**
 * Resolve a CSS custom property from :root and return the trimmed value.
 * Results are memoized; call invalidatePaletteCache() to reset.
 *
 * @param name - The CSS custom property name, e.g. '--color-grassland'
 * @returns The resolved color string, or '' if the property is not set.
 */
export function getPaletteColor(name: string): string {
  const cached = _cache.get(name);
  if (cached !== undefined) return cached;

  let resolved = '';
  if (typeof document !== 'undefined') {
    resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  _cache.set(name, resolved);
  return resolved;
}

/**
 * Clear all memoized palette values.
 * Call this after dynamically updating CSS custom properties (theme toggle, etc.)
 * so the next getPaletteColor() call re-reads from the live stylesheet.
 */
export function invalidatePaletteCache(): void {
  _cache.clear();
}
