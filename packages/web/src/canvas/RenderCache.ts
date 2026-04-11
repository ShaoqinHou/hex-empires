import type { HexCoord, HexMap, HexTile } from '@hex/engine';
import { coordToKey } from '@hex/engine';
import type { Registry } from '@hex/engine';
import type { TerrainDef, TerrainFeatureDef, ResourceDef, UnitDef } from '@hex/engine';
import { HEX_SIZE, hexToPixel } from './HexRenderer';

/**
 * RenderCache - Performance optimization for canvas rendering
 *
 * Caches static elements (terrain, sprites) to offscreen canvases
 * Tracks dirty tiles for incremental updates
 * Implements viewport culling to skip off-screen rendering
 */

/** Cached sprite for quick rendering */
export interface CachedSprite {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/** Dirty tile tracking */
export interface DirtyTileTracker {
  /** Set of dirty tile keys (hex coordinates that changed) */
  dirty: Set<string>;
  /** Mark a tile as dirty (needs redraw) */
  markDirty(coord: HexCoord): void;
  /** Mark all tiles as dirty (full redraw needed) */
  markAllDirty(): void;
  /** Clear dirty flags after rendering */
  clear(): void;
  /** Check if a tile is dirty */
  isDirty(coord: HexCoord): boolean;
}

/** Viewport bounds for culling */
export interface ViewportBounds {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
}

export class RenderCache {
  private terrainCanvas: HTMLCanvasElement | null = null;
  private terrainCtx: CanvasRenderingContext2D | null = null;
  private terrainValid = false;

  private spriteCache = new Map<string, CachedSprite>();

  private dirtyTracker: DirtyTileTracker;

  constructor() {
    this.dirtyTracker = createDirtyTracker();
  }

  /** Get or create cached sprite for a unit type */
  getUnitSprite(unitDef: UnitDef, civColor: string): CachedSprite {
    const cacheKey = `${unitDef.id}_${civColor}`;

    if (this.spriteCache.has(cacheKey)) {
      return this.spriteCache.get(cacheKey)!;
    }

    // Create new cached sprite
    const size = HEX_SIZE * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Draw unit icon (simplified - you'd use your actual drawUnitIcon logic)
    ctx.fillStyle = civColor;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, HEX_SIZE * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Add unit symbol
    ctx.fillStyle = '#fff';
    ctx.font = `${HEX_SIZE * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unitDef.name[0], size / 2, size / 2);

    const sprite: CachedSprite = { canvas, width: size, height: size };
    this.spriteCache.set(cacheKey, sprite);

    return sprite;
  }

  /** Get or create cached resource icon */
  getResourceSprite(resourceId: string): CachedSprite {
    if (this.spriteCache.has(resourceId)) {
      return this.spriteCache.get(resourceId)!;
    }

    // Create placeholder resource sprite
    const size = HEX_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    const sprite: CachedSprite = { canvas, width: size, height: size };
    this.spriteCache.set(resourceId, sprite);

    return sprite;
  }

  /** Render static terrain to offscreen canvas (called when map loads or changes) */
  renderStaticTerrain(
    map: HexMap,
    terrainRegistry: Registry<TerrainDef>,
    featureRegistry: Registry<TerrainFeatureDef>,
    resourceRegistry: Registry<ResourceDef>
  ): void {
    // Calculate canvas size needed
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const tile of map.tiles.values()) {
      const pos = hexToPixel(tile.coord);
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x);
      minY = Math.min(minY, pos.y);
      maxY = Math.max(maxY, pos.y);
    }

    const padding = HEX_SIZE * 4;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    // Create offscreen canvas
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = width;
    this.terrainCanvas.height = height;
    this.terrainCtx = this.terrainCanvas.getContext('2d')!;

    const ctx = this.terrainCtx;

    // Draw all terrain tiles
    for (const tile of map.tiles.values()) {
      const { x, y } = hexToPixel(tile.coord);
      const screenX = x - minX + padding;
      const screenY = y - minY + padding;

      const terrain = terrainRegistry.get(tile.terrain);
      const feature = tile.feature ? featureRegistry.get(tile.feature) : null;

      // Draw hex background
      drawHexPath(ctx, screenX, screenY, HEX_SIZE);
      ctx.fillStyle = terrain?.color ?? '#333';
      ctx.fill();

      // Draw feature
      if (feature) {
        drawHexPath(ctx, screenX, screenY, HEX_SIZE);
        ctx.fillStyle = feature.color + '88';
        ctx.fill();
      }

      // Draw hex border
      drawHexPath(ctx, screenX, screenY, HEX_SIZE);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Draw resource
      if (tile.resource) {
        const resource = resourceRegistry.get(tile.resource);
        if (resource) {
          const sprite = this.getResourceSprite(tile.resource);
          ctx.drawImage(
            sprite.canvas,
            screenX - sprite.width / 2,
            screenY - sprite.height / 2
          );
        }
      }
    }

    this.terrainValid = true;
    this.dirtyTracker.clear();
  }

  /** Get the cached terrain canvas for rendering */
  getTerrainCanvas(): HTMLCanvasElement | null {
    return this.terrainCanvas;
  }

  /** Invalidate terrain cache (call when map changes) */
  invalidateTerrain(): void {
    this.terrainValid = false;
    this.dirtyTracker.markAllDirty();
  }

  /** Get dirty tile tracker */
  getDirtyTracker(): DirtyTileTracker {
    return this.dirtyTracker;
  }

  /** Clear all caches */
  clear(): void {
    this.spriteCache.clear();
    this.terrainCanvas = null;
    this.terrainCtx = null;
    this.terrainValid = false;
    this.dirtyTracker.markAllDirty();
  }
}

/** Helper: Draw hex path */
function drawHexPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number = HEX_SIZE
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const hx = cx + size * Math.cos(angle);
    const hy = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
}

/** Create dirty tile tracker */
function createDirtyTracker(): DirtyTileTracker {
  const dirty = new Set<string>();

  return {
    dirty,
    markDirty(coord: HexCoord): void {
      dirty.add(coordToKey(coord));
    },
    markAllDirty(): void {
      // Mark all tiles - this is handled by invalidating terrain cache
    },
    clear(): void {
      dirty.clear();
    },
    isDirty(coord: HexCoord): boolean {
      return dirty.has(coordToKey(coord));
    },
  };
}

/** Calculate viewport bounds for culling */
export function calculateViewportBounds(
  cameraX: number,
  cameraY: number,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
): ViewportBounds {
  // Convert screen corners to world coords
  const topLeft = {
    x: (0 - canvasWidth / 2) / zoom + cameraX,
    y: (0 - canvasHeight / 2) / zoom + cameraY,
  };
  const bottomRight = {
    x: (canvasWidth - canvasWidth / 2) / zoom + cameraX,
    y: (canvasHeight - canvasHeight / 2) / zoom + cameraY,
  };

  // Convert to hex coordinates (with padding)
  const padding = 2;
  const minHex = pixelToHex(topLeft.x - padding * HEX_SIZE, topLeft.y - padding * HEX_SIZE);
  const maxHex = pixelToHex(bottomRight.x + padding * HEX_SIZE, bottomRight.y + padding * HEX_SIZE);

  return {
    minQ: minHex.q - padding,
    maxQ: maxHex.q + padding,
    minR: minHex.r - padding,
    maxR: maxHex.r + padding,
  };
}

/** Helper: Convert pixel to hex */
function pixelToHex(x: number, y: number): HexCoord {
  const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
  const HEX_HEIGHT = 2 * HEX_SIZE;

  const r = y / (HEX_HEIGHT * 0.75);
  const q = x / HEX_WIDTH - r * 0.5;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}
