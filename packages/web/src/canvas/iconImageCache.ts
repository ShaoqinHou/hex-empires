/**
 * iconImageCache — pre-loads and caches HTMLImageElement objects for
 * canvas drawImage() calls (resource badges, improvement icons).
 *
 * Why a separate module: the Canvas 2D API cannot draw CSS-referenced SVGs
 * directly. Each icon must be loaded as an HTMLImageElement first, then drawn
 * with ctx.drawImage(). This module provides a simple memoizing cache so
 * each icon URL loads at most once per session.
 *
 * Usage:
 *   const img = getIconImage('/assets/images/icons/resources/wheat.svg');
 *   if (img) ctx.drawImage(img, x, y, size, size);
 *
 * The image may not be ready on the first call (load is async). The caller
 * should call getIconImage() on every render frame — once loaded, the same
 * HTMLImageElement is returned instantly from cache. This means the icon
 * will "pop in" on the first frame after load, which is acceptable for
 * tile icons (no loading spinner needed).
 *
 * Location: packages/web/src/canvas/iconImageCache.ts
 */

type CacheEntry =
  | { state: 'loading'; img: HTMLImageElement }
  | { state: 'loaded';  img: HTMLImageElement }
  | { state: 'error' };

const _imageCache = new Map<string, CacheEntry>();

/**
 * Return the HTMLImageElement for a given URL, or null if it is not yet loaded.
 * Triggers loading on first call for a URL; subsequent calls return the same
 * element once ready.
 */
export function getIconImage(url: string): HTMLImageElement | null {
  const entry = _imageCache.get(url);

  if (entry) {
    if (entry.state === 'loaded') return entry.img;
    return null; // still loading or errored
  }

  // Not yet started — kick off load
  const img = new Image();
  const loadingEntry: CacheEntry = { state: 'loading', img };
  _imageCache.set(url, loadingEntry);

  img.onload = () => {
    _imageCache.set(url, { state: 'loaded', img });
  };
  img.onerror = () => {
    _imageCache.set(url, { state: 'error' });
  };
  img.src = url;

  return null; // not ready this frame
}

/**
 * Clear the image cache. Call after navigating away from the game
 * or during hot-module-replacement in development.
 */
export function clearIconImageCache(): void {
  _imageCache.clear();
}
