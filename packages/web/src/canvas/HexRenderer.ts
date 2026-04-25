import type { HexCoord, HexMap, HexTile, GameState, UnitState, CityState, DistrictSlot } from '@hex/engine';
import { coordToKey, distance, HEX_DIRECTIONS } from '@hex/engine';
import type { Registry } from '@hex/engine';
import type { TerrainDef, TerrainFeatureDef } from '@hex/engine';
import type { ResourceDef } from '@hex/engine';
import type { Camera } from './Camera';
import { drawUnitIcon } from './UnitIcons';
import { RenderCache, calculateViewportBounds, type ViewportBounds } from './RenderCache';
import { HEX_SIZE, HEX_WIDTH, HEX_HEIGHT, hexToPixel as hexToPixelUtil, pixelToHex as pixelToHexUtil } from '../utils/hexMath';
import { getPaletteColor } from './paletteResolver';
import { getIconImage } from './iconImageCache';
import { getResourceIcon, getImprovementIcon } from '../assets/loader';

export interface RenderContext {
  state: GameState;
  terrainRegistry: Registry<TerrainDef>;
  featureRegistry: Registry<TerrainFeatureDef>;
  resourceRegistry: Registry<ResourceDef>;
  selectedHex: HexCoord | null;
  selectedUnit: UnitState | null;
  reachableHexes: ReadonlySet<string> | null;
  hoveredHex: HexCoord | null;
  /** Precomputed hexes forming the path from selectedUnit to hoveredHex (inclusive).
   *  Null if there's no active preview. Drawn as chevron dots so the player sees
   *  where a right-click will move them. */
  pathPreview: ReadonlyArray<HexCoord> | null;
  /** If the hovered hex is an enemy the selected unit CAN attack, this is that hex.
   *  Renderer paints a pulsing red overlay + crossed-swords marker to signal that
   *  the next right-click will ATTACK rather than MOVE. */
  attackTarget: HexCoord | null;
  visibility: ReadonlySet<string> | null;  // currently visible tiles
  explored: ReadonlySet<string> | null;    // ever-seen tiles
  showYields: boolean;
  /** When true, draw unit-type text labels below each unit icon for readability. */
  showLabels: boolean;
  turnNumber: number;  // Track turn changes for glow effects
  /**
   * Building-placement rework (Cycle 4) — placement overlay inputs.
   *
   * `placementCityId` — when non-null, the renderer draws the placement
   *   overlay scoped to this city's territory. Passed separately from
   *   `placementValidTiles` so the renderer can dim invalid territory
   *   tiles without re-walking the map.
   * `placementValidTiles` — set of hex keys (via `coordToKey`) that are
   *   valid candidates for the chosen building. Green fill + bright stroke.
   * `placementHovered` — the tile currently under the cursor when in
   *   placement mode. If it's a valid tile, it gets a pulsing highlight.
   *
   * All three are null when placement mode is inactive — the overlay
   * pass short-circuits and normal rendering proceeds unchanged.
   */
  placementCityId: string | null;
  placementValidTiles: ReadonlySet<string> | null;
  placementHovered: HexCoord | null;
}

/** Convert axial hex coordinate to pixel position (center of hex) */
export const hexToPixel = hexToPixelUtil;

/** Convert pixel position to axial hex coordinate */
export const pixelToHex = pixelToHexUtil;

/** Draw a single hexagon path (pointy-top) */
function drawHexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number = HEX_SIZE): void {
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

// ── Terrain color resolution via palette tokens ───────────────────────────────
// Map terrain IDs to CSS custom property names defined in palette-tokens.css.
// Resolved at render time via paletteResolver so the game respects future theme
// changes without a code change.  The string values here are the token names,
// not raw hex — raw hex lives only in palette-tokens.css.

const TERRAIN_TOKEN_MAP: Record<string, string> = {
  grassland: '--color-grassland',
  plains:    '--color-plains',
  desert:    '--color-desert',
  tundra:    '--color-tundra',
  snow:      '--color-snow',
  coast:     '--color-coast',
  ocean:     '--color-ocean',
};

const FEATURE_TOKEN_MAP: Record<string, string> = {
  hills:       '--color-feature-hills',
  mountains:   '--color-feature-mountains',
  forest:      '--color-feature-forest',
  jungle:      '--color-feature-jungle',
  marsh:       '--color-feature-marsh',
  floodplains: '--color-feature-floodplains',
  oasis:       '--color-feature-oasis',
  reef:        '--color-feature-reef',
};

/** Resolve a terrain ID to a canvas-usable color string. */
function getTerrainColor(terrainId: string, fallback: string): string {
  const token = TERRAIN_TOKEN_MAP[terrainId];
  if (token) {
    const resolved = getPaletteColor(token);
    if (resolved) return resolved;
  }
  return fallback;
}

/** Resolve a feature ID to a canvas-usable color string. */
function getFeatureColor(featureId: string, fallback: string): string {
  const token = FEATURE_TOKEN_MAP[featureId];
  if (token) {
    const resolved = getPaletteColor(token);
    if (resolved) return resolved;
  }
  return fallback;
}

export class HexRenderer {
  private ctx: CanvasRenderingContext2D;
  private cache: RenderCache;
  private lastTurnNumber = -1;

  constructor(ctx: CanvasRenderingContext2D, cache: RenderCache) {
    this.ctx = ctx;
    this.cache = cache;
  }

  render(camera: Camera, rc: RenderContext): void {
    const ctx = this.ctx;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill the canvas with the ocean/bg color so edges outside the hex grid
    // show a warm deep-water background rather than transparent black void.
    const bgColor = getPaletteColor('--color-ocean') || '#1a2c3a';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    camera.applyTransform(ctx);

    // Calculate viewport bounds for culling
    const viewport = calculateViewportBounds(
      camera.x,
      camera.y,
      camera.zoom,
      canvas.width,
      canvas.height
    );

    // Rebuild terrain cache on turn change or if invalidated
    if (rc.turnNumber !== this.lastTurnNumber || !this.cache.getTerrainCanvas()) {
      this.cache.renderStaticTerrain(
        rc.state.map,
        rc.terrainRegistry,
        rc.featureRegistry,
        rc.resourceRegistry
      );
      this.lastTurnNumber = rc.turnNumber;
    }

    // Draw terrain tiles (with viewport culling)
    this.drawTerrain(rc, viewport);

    // Draw rivers
    this.drawRivers(rc, viewport);

    // Draw territory borders
    this.drawTerritoryBorders(rc, viewport);

    // Draw fog of war overlay
    this.drawFogOfWar(rc, viewport);

    // Draw reachable hex overlay AFTER fog so the amber tint is visible even
    // over fogged tiles (players need to see where their unit can go regardless
    // of whether they can see the terrain detail there).
    if (rc.reachableHexes) {
      this.drawReachableOverlay(rc, viewport);
    }

    // Draw districts (below cities/units so markers appear on top)
    this.drawDistricts(rc, viewport);

    // Building-placement overlay (Cycle 4) — sits above terrain/districts
    // but below units and cities so sprites remain visible over the tint.
    if (rc.placementCityId && rc.placementValidTiles) {
      this.drawPlacementOverlay(rc, viewport);
    }

    // Draw cities (only visible/explored, viewport culled)
    this.drawCities(rc, viewport);

    // Draw units (only visible, viewport culled)
    this.drawUnits(rc, viewport);

    // Draw selection highlight — use warm gold token for selection border
    if (rc.selectedHex) {
      const selColor = getPaletteColor('--color-tile-border-selected') || 'rgba(255, 220, 100, 0.9)';
      this.drawHexHighlight(rc.selectedHex, selColor, 3);
    }

    // Draw hover highlight — use subtle white token
    if (rc.hoveredHex) {
      const hovColor = getPaletteColor('--color-tile-border-hover') || 'rgba(255, 255, 255, 0.18)';
      this.drawHexHighlight(rc.hoveredHex, hovColor, 1);
    }

    // Draw path preview (after selection + hover so it sits on top of both overlays)
    if (rc.pathPreview && rc.pathPreview.length > 0) {
      this.drawPathPreview(rc);
    }

    // Attack target overlay wins over path preview — if an enemy is attackable we want
    // to signal ATTACK not MOVE, so we stop drawing the yellow path and paint red instead.
    if (rc.attackTarget) {
      this.drawAttackTarget(rc.attackTarget, rc.turnNumber);
    }

    ctx.restore();

    // Draw UI overlays (not affected by camera)
    this.drawCoordinateOverlay(camera, rc);
  }

  private drawTerrain(rc: RenderContext, viewport: ViewportBounds): void {
    const ctx = this.ctx;

    for (const tile of rc.state.map.tiles.values()) {
      // Viewport culling - skip tiles outside viewport
      if (
        tile.coord.q < viewport.minQ ||
        tile.coord.q > viewport.maxQ ||
        tile.coord.r < viewport.minR ||
        tile.coord.r > viewport.maxR
      ) {
        continue;
      }

      const { x, y } = hexToPixel(tile.coord);
      const terrain = rc.terrainRegistry.get(tile.terrain);
      const feature = tile.feature ? rc.featureRegistry.get(tile.feature) : null;

      // Base terrain color — resolve via palette token, fall back to registry color
      const baseColor = terrain
        ? getTerrainColor(terrain.id, terrain.color ?? '#333')
        : '#333';
      drawHexPath(ctx, x, y);
      ctx.fillStyle = baseColor;
      ctx.fill();

      // Feature overlay — special rendering for hills/mountains, else semi-transparent tint
      if (feature) {
        const featureColor = getFeatureColor(feature.id, feature.color ?? '#888');

        if (feature.id === 'hills') {
          // Hills: darker diagonal-stripe overlay for topographic feel
          drawHexPath(ctx, x, y);
          ctx.fillStyle = featureColor + 'aa'; // ~67% opacity
          ctx.fill();
          // Subtle highlight ridge lines
          ctx.save();
          ctx.globalAlpha = 0.18;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          for (let offset = -HEX_SIZE * 0.4; offset <= HEX_SIZE * 0.4; offset += HEX_SIZE * 0.22) {
            ctx.beginPath();
            ctx.moveTo(x - HEX_SIZE * 0.6, y + offset - HEX_SIZE * 0.15);
            ctx.lineTo(x + HEX_SIZE * 0.6, y + offset + HEX_SIZE * 0.15);
            ctx.stroke();
          }
          ctx.restore();
        } else if (feature.id === 'mountains') {
          // Mountains: grey base + snow cap triangle
          drawHexPath(ctx, x, y);
          ctx.fillStyle = featureColor + 'cc'; // 80% opacity
          ctx.fill();
          // Snow cap (white triangle at top of hex)
          ctx.save();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = getTerrainColor('snow', '#fffef7');
          ctx.beginPath();
          ctx.moveTo(x, y - HEX_SIZE * 0.72);           // peak
          ctx.lineTo(x - HEX_SIZE * 0.38, y - HEX_SIZE * 0.18); // left
          ctx.lineTo(x + HEX_SIZE * 0.38, y - HEX_SIZE * 0.18); // right
          ctx.closePath();
          ctx.fill();
          // Dark outline for definition
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = getFeatureColor('mountains', '#7a7a82');
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        } else {
          // Forest, jungle, marsh, etc. — semi-transparent colour wash
          drawHexPath(ctx, x, y);
          ctx.fillStyle = featureColor + 'a0'; // ~63% opacity
          ctx.fill();
          // Add subtle texture dots for forest/jungle
          if (feature.id === 'forest' || feature.id === 'jungle') {
            ctx.save();
            ctx.globalAlpha = 0.5;
            // Darken the base feature color for canopy dots
            ctx.fillStyle = getFeatureColor(
              feature.id === 'forest' ? 'forest' : 'jungle',
              feature.id === 'forest' ? '#4a6428' : '#2e5018'
            );
            const dotPositions = [
              { dx: -HEX_SIZE * 0.22, dy: -HEX_SIZE * 0.18 },
              { dx:  HEX_SIZE * 0.22, dy: -HEX_SIZE * 0.18 },
              { dx:  0,               dy:  HEX_SIZE * 0.1  },
              { dx: -HEX_SIZE * 0.3,  dy:  HEX_SIZE * 0.28 },
              { dx:  HEX_SIZE * 0.3,  dy:  HEX_SIZE * 0.28 },
            ];
            for (const dp of dotPositions) {
              ctx.beginPath();
              ctx.arc(x + dp.dx, y + dp.dy, HEX_SIZE * 0.1, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          } else if (feature.id === 'marsh') {
            // Marsh: wavy horizontal lines
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = getFeatureColor('marsh', '#4a5c30');
            ctx.lineWidth = 1;
            for (let row = -1; row <= 1; row++) {
              ctx.beginPath();
              ctx.moveTo(x - HEX_SIZE * 0.45, y + row * HEX_SIZE * 0.25);
              for (let wx = -HEX_SIZE * 0.45; wx <= HEX_SIZE * 0.45; wx += 5) {
                ctx.lineTo(x + wx, y + row * HEX_SIZE * 0.25 + Math.sin(wx * 0.5) * 2.5);
              }
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      // Hex border — use token color for inter-tile borders; fallback keeps old look
      drawHexPath(ctx, x, y);
      ctx.strokeStyle = getPaletteColor('--color-tile-border') || 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Improvement icon - always visible
      if (tile.improvement) {
        this.drawImprovementIcon(tile, x, y, rc);
      }

      // Building icon - always visible if present
      if (tile.building) {
        this.drawBuildingIcon(tile, x, y, rc);
      }

      // Resource icon — always visible (outside yield lens gate)
      if (tile.resource) {
        this.drawResourceIcon(tile, x, y, rc);
      }

      // Yield dots — only when lens is active
      if (rc.showYields) {
        this.drawYieldDots(tile, x, y, rc);
      }
    }
  }

  private drawYieldDots(tile: HexTile, cx: number, cy: number, rc: RenderContext): void {
    const ctx = this.ctx;
    const terrain = rc.terrainRegistry.get(tile.terrain);
    if (!terrain) return;

    const yields = terrain.baseYields;
    const dots: Array<{ color: string; count: number }> = [];
    if (yields.food > 0) dots.push({ color: '#66bb6a', count: yields.food });
    if (yields.production > 0) dots.push({ color: '#ff8a65', count: yields.production });
    if (yields.gold > 0) dots.push({ color: '#ffd54f', count: yields.gold });

    let dotIndex = 0;
    const dotSize = 2.5;
    const startX = cx - (dots.reduce((s, d) => s + d.count, 0) * (dotSize * 2 + 1)) / 2;

    for (const dot of dots) {
      for (let i = 0; i < dot.count; i++) {
        ctx.beginPath();
        ctx.arc(startX + dotIndex * (dotSize * 2 + 1) + dotSize, cy + HEX_SIZE * 0.55, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.fill();
        dotIndex++;
      }
    }
  }

  private drawResourceIcon(tile: HexTile, cx: number, cy: number, rc: RenderContext): void {
    if (!tile.resource) return;
    const resource = rc.resourceRegistry.get(tile.resource);
    if (!resource) return;

    const ctx = this.ctx;

    // Position: upper-left of hex, clear of improvement icon (upper-right)
    const iconX = cx - HEX_SIZE * 0.35;
    const iconY = cy - HEX_SIZE * 0.35;
    const radius = 6.5;
    const iconSize = radius * 2;

    // Try asset-pipeline image first (loads async; will appear on subsequent frames)
    const iconUrl = getResourceIcon(tile.resource);
    const img = getIconImage(iconUrl);

    if (img) {
      // Image ready — draw icon with ring badge
      ctx.save();

      // Ring badge background per type
      const ringColor = this._resourceRingColor(resource.type);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.arc(iconX, iconY, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = ringColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Clip to circle for the icon
      ctx.beginPath();
      ctx.arc(iconX, iconY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, iconX - radius, iconY - radius, iconSize, iconSize);

      ctx.restore();
    } else {
      // Fallback: letter badge while image loads
      this._drawResourceLetterBadge(ctx, resource, iconX, iconY, radius);
    }
  }

  /** Ring color for resource badge by type. Uses warm-palette token colors.
   * Civ VII taxonomy: bonus | city | empire | treasureFleet | factory
   */
  private _resourceRingColor(type: string): string {
    switch (type) {
      case 'city':         return getPaletteColor('--color-gold')         || '#fbbf24';
      case 'empire':       return getPaletteColor('--color-text-muted')   || '#a89070';
      case 'bonus':        return getPaletteColor('--color-success')      || '#4a8c5a';
      case 'treasureFleet':return getPaletteColor('--color-gold')         || '#fbbf24';
      case 'factory':      return getPaletteColor('--color-production')   || '#c0703a';
      default:             return getPaletteColor('--color-border-accent') || '#7a6030';
    }
  }

  /** Letter fallback badge for resource icon before image loads. */
  private _drawResourceLetterBadge(
    ctx: CanvasRenderingContext2D,
    resource: { name: string; type: string },
    iconX: number, iconY: number, radius: number
  ): void {
    const ringColor = this._resourceRingColor(resource.type);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(iconX, iconY, radius + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(iconX, iconY, radius, 0, Math.PI * 2);
    ctx.fillStyle = getPaletteColor('--color-surface') || '#251e14';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = getPaletteColor('--color-text') || '#f2e8d0';
    ctx.font = `bold ${Math.round(radius * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(resource.name.charAt(0).toUpperCase(), iconX, iconY);
    ctx.restore();
  }

  private drawImprovementIcon(tile: HexTile, cx: number, cy: number, _rc: RenderContext): void {
    if (!tile.improvement) return;

    const ctx = this.ctx;

    // Position: upper-right quadrant of the hex
    const ix = cx + HEX_SIZE * 0.30;
    const iy = cy - HEX_SIZE * 0.28;
    const s = HEX_SIZE * 0.18; // scale unit
    const iconSize = s * 2.4;

    // Try asset-pipeline image first — draw centered at (ix, iy) if ready
    const iconUrl = getImprovementIcon(tile.improvement);
    const img = getIconImage(iconUrl);
    if (img) {
      ctx.save();
      // Subtle drop shadow behind the icon
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 3;
      ctx.drawImage(img, ix - iconSize / 2, iy - iconSize / 2, iconSize, iconSize);
      ctx.restore();
      return; // asset drawn — skip geometry fallback
    }

    // Fallback: geometry-based rendering until asset image loads
    ctx.save();

    switch (tile.improvement) {
      case 'farm': {
        // Three horizontal green crop rows
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 1.5;
        for (let row = -1; row <= 1; row++) {
          ctx.beginPath();
          ctx.moveTo(ix - s, iy + row * s * 0.65);
          ctx.lineTo(ix + s, iy + row * s * 0.65);
          ctx.stroke();
        }
        // Vertical divider
        ctx.beginPath();
        ctx.moveTo(ix, iy - s);
        ctx.lineTo(ix, iy + s);
        ctx.stroke();
        break;
      }

      case 'mine':
      case 'quarry': {
        // Grey downward triangle (pit/mine symbol)
        const col = tile.improvement === 'mine' ? '#9e9e9e' : '#b0bec5';
        ctx.fillStyle = col;
        ctx.strokeStyle = '#424242';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix, iy + s * 1.2);        // bottom apex
        ctx.lineTo(ix - s, iy - s * 0.6);    // top-left
        ctx.lineTo(ix + s, iy - s * 0.6);    // top-right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Small pick handle line
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ix - s * 0.7, iy - s * 0.9);
        ctx.lineTo(ix + s * 0.3, iy + s * 0.4);
        ctx.stroke();
        break;
      }

      case 'pasture': {
        // Light brown filled circle (field/pasture)
        ctx.beginPath();
        ctx.arc(ix, iy, s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(188, 143, 88, 0.75)';
        ctx.fill();
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }

      case 'plantation': {
        // Dark green diamond
        ctx.fillStyle = 'rgba(46, 125, 50, 0.8)';
        ctx.strokeStyle = '#1b5e20';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix, iy - s * 1.1);       // top
        ctx.lineTo(ix + s * 0.9, iy);       // right
        ctx.lineTo(ix, iy + s * 1.1);       // bottom
        ctx.lineTo(ix - s * 0.9, iy);       // left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'camp': {
        // Brown tent triangle
        ctx.fillStyle = 'rgba(121, 85, 72, 0.85)';
        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix, iy - s * 1.1);       // apex
        ctx.lineTo(ix + s, iy + s * 0.7);   // bottom-right
        ctx.lineTo(ix - s, iy + s * 0.7);   // bottom-left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'road': {
        // Draw a thin brown line through the tile center (horizontal)
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx - HEX_SIZE * 0.6, cy);
        ctx.lineTo(cx + HEX_SIZE * 0.6, cy);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      default: {
        // Generic: small white circle with first letter
        ctx.beginPath();
        ctx.arc(ix, iy, s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#333';
        ctx.font = `bold ${Math.round(s * 1.1)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.improvement.charAt(0).toUpperCase(), ix, iy);
        break;
      }
    }

    ctx.restore();
  }

  private drawBuildingIcon(tile: HexTile, cx: number, cy: number, rc: RenderContext): void {
    if (!tile.building) return;

    const ctx = this.ctx;
    const building = rc.state.config.buildings.get(tile.building);
    if (!building) return;

    // Map building categories to badge colors
    const getBuildingColor = (buildingId: string): string => {
      const colorMap: Record<string, string> = {
        // Military — red
        barracks: '#e53935', armory: '#e53935', walls: '#e53935',
        star_fort: '#e53935', military_base: '#e53935',
        // Science — cyan
        library: '#00acc1', university: '#00acc1', research_lab: '#00acc1',
        observatory: '#00acc1',
        // Economy/Production — orange
        granary: '#fb8c00', market: '#fb8c00', bank: '#fb8c00',
        stock_exchange: '#fb8c00', workshop: '#fb8c00', factory: '#fb8c00',
        watermill: '#fb8c00', power_plant: '#fb8c00', nuclear_plant: '#fb8c00',
        // Culture — purple
        monument: '#8e24aa', shrine: '#8e24aa', temple: '#8e24aa',
        cathedral: '#8e24aa', stadium: '#8e24aa', broadcast_tower: '#8e24aa',
        mall: '#8e24aa',
        // Gold — yellow
        airport: '#fdd835', shipyard: '#fdd835',
      };
      return colorMap[buildingId] ?? '#607d8b';
    };

    // Get first two chars of building id as label (more readable than single letter)
    const label = tile.building.substring(0, 2).toUpperCase();
    const color = getBuildingColor(tile.building);

    // Position: lower-right quadrant (away from resource icon in upper-left)
    const bx = cx + HEX_SIZE * 0.30;
    const by = cy + HEX_SIZE * 0.30;
    const r = HEX_SIZE * 0.18;

    ctx.save();

    // Filled rounded square badge
    const sq = r * 1.1;
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx - sq, by - sq, sq * 2, sq * 2, sq * 0.35);
    ctx.fill();
    ctx.stroke();

    // Label text
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 0.95)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, by);

    ctx.restore();
  }

  private drawFogOfWar(rc: RenderContext, viewport: ViewportBounds): void {
    if (!rc.visibility && !rc.explored) return; // no fog data, show everything

    const ctx = this.ctx;
    for (const tile of rc.state.map.tiles.values()) {
      // Viewport culling
      if (
        tile.coord.q < viewport.minQ ||
        tile.coord.q > viewport.maxQ ||
        tile.coord.r < viewport.minR ||
        tile.coord.r > viewport.maxR
      ) {
        continue;
      }

      const key = coordToKey(tile.coord);
      const isVisible = rc.visibility?.has(key) ?? true;
      const isExplored = rc.explored?.has(key) ?? true;

      if (!isExplored) {
        // Completely unexplored — heavy overlay but not pitch black
        const { x, y } = hexToPixel(tile.coord);
        drawHexPath(ctx, x, y);
        ctx.fillStyle = 'rgba(18, 22, 35, 0.8)';
        ctx.fill();
      } else if (!isVisible) {
        // Explored but not currently visible — light desaturation
        const { x, y } = hexToPixel(tile.coord);
        drawHexPath(ctx, x, y);
        ctx.fillStyle = 'rgba(20, 25, 40, 0.3)';
        ctx.fill();
      }
    }
  }

  private drawRivers(rc: RenderContext, viewport: ViewportBounds): void {
    const ctx = this.ctx;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const tile of rc.state.map.tiles.values()) {
      // Viewport culling
      if (
        tile.coord.q < viewport.minQ ||
        tile.coord.q > viewport.maxQ ||
        tile.coord.r < viewport.minR ||
        tile.coord.r > viewport.maxR
      ) {
        continue;
      }

      if (tile.river.length === 0) continue;
      const { x, y } = hexToPixel(tile.coord);

      for (const edge of tile.river) {
        const angle1 = (Math.PI / 180) * (60 * edge - 30);
        const angle2 = (Math.PI / 180) * (60 * ((edge + 1) % 6) - 30);
        const x1 = x + HEX_SIZE * Math.cos(angle1);
        const y1 = y + HEX_SIZE * Math.sin(angle1);
        const x2 = x + HEX_SIZE * Math.cos(angle2);
        const y2 = y + HEX_SIZE * Math.sin(angle2);

        // Outer glow pass — wider, more transparent
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Main river line — bright blue, semi-transparent
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Inner highlight — thin bright core
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#a0d4ff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Reset alpha
    ctx.globalAlpha = 1;
  }

  private drawTerritoryBorders(rc: RenderContext, viewport: ViewportBounds): void {
    const ctx = this.ctx;
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

    // Build a lookup: hexKey -> ownerPlayerId (for all cities' territory)
    const ownerByHex = new Map<string, string>();
    for (const city of rc.state.cities.values()) {
      for (const hexKey of city.territory) {
        ownerByHex.set(hexKey, city.owner);
      }
    }

    for (const city of rc.state.cities.values()) {
      const players = [...rc.state.players.keys()];
      const playerIndex = players.indexOf(city.owner);
      const color = playerColors[playerIndex % playerColors.length];

      // Territory fill (18% opacity — more visible than old 10%)
      for (const hexKey of city.territory) {
        const tile = rc.state.map.tiles.get(hexKey);
        if (!tile) continue;

        // Viewport culling
        if (
          tile.coord.q < viewport.minQ ||
          tile.coord.q > viewport.maxQ ||
          tile.coord.r < viewport.minR ||
          tile.coord.r > viewport.maxR
        ) {
          continue;
        }

        const { x, y } = hexToPixel(tile.coord);
        drawHexPath(ctx, x, y);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Border edges: only draw edges adjacent to non-owned territory
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;

      for (const hexKey of city.territory) {
        const tile = rc.state.map.tiles.get(hexKey);
        if (!tile) continue;

        // Viewport culling for borders (more lenient - include neighbors)
        if (
          tile.coord.q < viewport.minQ - 1 ||
          tile.coord.q > viewport.maxQ + 1 ||
          tile.coord.r < viewport.minR - 1 ||
          tile.coord.r > viewport.maxR + 1
        ) {
          continue;
        }

        const { x, y } = hexToPixel(tile.coord);

        // DIR_TO_EDGE: maps HEX_DIRECTIONS[i] index to the edge vertex pair.
        // Edge e draws from vertex e to vertex (e+1)%6 (angle = 60*e − 30°).
        // For pointy-top hexes: E→0, NE→5, NW→4, W→3, SW→2, SE→1.
        // Using i directly was wrong (only E and W happened to coincide).
        const DIR_TO_EDGE = [0, 5, 4, 3, 2, 1] as const;

        for (let i = 0; i < 6; i++) {
          const dir = HEX_DIRECTIONS[i];
          const neighborCoord: HexCoord = { q: tile.coord.q + dir.q, r: tile.coord.r + dir.r };
          const neighborKey = coordToKey(neighborCoord);
          const neighborOwner = ownerByHex.get(neighborKey);

          // Draw edge only if neighbor is not owned by the same player
          if (neighborOwner === city.owner) continue;

          // Map direction index to the correct edge for pointy-top hexes
          const e = DIR_TO_EDGE[i];
          const angle1 = (Math.PI / 180) * (60 * e - 30);
          const angle2 = (Math.PI / 180) * (60 * ((e + 1) % 6) - 30);
          ctx.beginPath();
          ctx.moveTo(x + HEX_SIZE * Math.cos(angle1), y + HEX_SIZE * Math.sin(angle1));
          ctx.lineTo(x + HEX_SIZE * Math.cos(angle2), y + HEX_SIZE * Math.sin(angle2));
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    }
  }

  private drawReachableOverlay(rc: RenderContext, viewport: ViewportBounds): void {
    const ctx = this.ctx;
    if (!rc.reachableHexes) return;

    for (const key of rc.reachableHexes) {
      const tile = rc.state.map.tiles.get(key);
      if (!tile) continue;

      // Viewport culling
      if (
        tile.coord.q < viewport.minQ ||
        tile.coord.q > viewport.maxQ ||
        tile.coord.r < viewport.minR ||
        tile.coord.r > viewport.maxR
      ) {
        continue;
      }

      const { x, y } = hexToPixel(tile.coord);
      drawHexPath(ctx, x, y);
      // Warm amber tint — matches --color-accent (#d4943a); canvas can't use CSS vars
      ctx.fillStyle = 'rgba(212, 148, 58, 0.18)';
      ctx.fill();
      drawHexPath(ctx, x, y);
      ctx.strokeStyle = 'rgba(212, 148, 58, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /** Pulsing red outline + crossed-swords marker on an attackable enemy hex. */
  private drawAttackTarget(hex: HexCoord, turnNumber: number): void {
    const ctx = this.ctx;
    const { x, y } = hexToPixel(hex);
    // Pulse amplitude derived from wall-clock time so it's independent of turn ticks.
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
    ctx.save();
    // Filled red tint.
    drawHexPath(ctx, x, y);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.22 + 0.15 * pulse})`;
    ctx.fill();
    // Outer glow ring.
    ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
    ctx.shadowBlur = 18;
    drawHexPath(ctx, x, y);
    ctx.strokeStyle = `rgba(255, 99, 99, ${0.85 + 0.15 * pulse})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Crossed-swords glyph (rendered as text so we avoid an extra sprite sheet).
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 240, 240, 0.95)';
    ctx.fillText('⚔', x, y - 2);
    ctx.restore();
    // Reference turnNumber so TSC knows it's intentional (kept for future: flash on new turn).
    void turnNumber;
  }

  /**
   * Building-placement rework (Cycle 4) — placement overlay.
   *
   * For every tile in the placement-mode city's territory, paint:
   *   - Valid tiles: translucent green fill + brighter green stroke.
   *   - Invalid territory tiles: dark dim overlay (no stroke).
   * Tiles outside the city's territory are left untouched so the player
   * keeps spatial context of the map. The hovered valid tile gets a
   * pulsing highlight (same sin-based pulse as the attack target).
   */
  private drawPlacementOverlay(rc: RenderContext, viewport: ViewportBounds): void {
    const ctx = this.ctx;
    if (!rc.placementCityId || !rc.placementValidTiles) return;
    const city = rc.state.cities.get(rc.placementCityId);
    if (!city) return;

    // Paint the dim + valid fills per territory tile.
    for (const tileKey of city.territory) {
      const tile = rc.state.map.tiles.get(tileKey);
      if (!tile) continue;
      if (
        tile.coord.q < viewport.minQ ||
        tile.coord.q > viewport.maxQ ||
        tile.coord.r < viewport.minR ||
        tile.coord.r > viewport.maxR
      ) {
        continue;
      }

      const { x, y } = hexToPixel(tile.coord);
      const isValid = rc.placementValidTiles.has(tileKey);

      if (isValid) {
        // Valid tile: green fill + green stroke.
        drawHexPath(ctx, x, y);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
        ctx.fill();
        drawHexPath(ctx, x, y);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Invalid territory tile: dim overlay.
        drawHexPath(ctx, x, y);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();
      }
    }

    // Hover pulse on a valid tile — reuses the attack-target pulse pattern.
    if (rc.placementHovered) {
      const hoverKey = coordToKey(rc.placementHovered);
      if (rc.placementValidTiles.has(hoverKey)) {
        const { x, y } = hexToPixel(rc.placementHovered);
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);
        ctx.save();
        drawHexPath(ctx, x, y);
        ctx.fillStyle = `rgba(134, 239, 172, ${0.28 + 0.18 * pulse})`;
        ctx.fill();
        ctx.shadowColor = 'rgba(74, 222, 128, 0.85)';
        ctx.shadowBlur = 16;
        drawHexPath(ctx, x, y);
        ctx.strokeStyle = `rgba(187, 247, 208, ${0.85 + 0.15 * pulse})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /** Render the move path as bright chevron dots along hex centers — shows the player
   *  exactly where their right-click MOVE will go. */
  private drawPathPreview(rc: RenderContext): void {
    if (!rc.pathPreview || rc.pathPreview.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    // Draw a dashed line connecting hex centers.
    ctx.strokeStyle = 'rgba(255, 235, 120, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    const start = rc.selectedUnit?.position;
    if (start) {
      const p = hexToPixel(start);
      ctx.moveTo(p.x, p.y);
    }
    for (const step of rc.pathPreview) {
      const p = hexToPixel(step);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Mark each step with a small filled circle; end with a bigger diamond target.
    for (let i = 0; i < rc.pathPreview.length; i++) {
      const step = rc.pathPreview[i];
      const p = hexToPixel(step);
      const isEnd = i === rc.pathPreview.length - 1;
      ctx.fillStyle = isEnd ? 'rgba(255, 220, 60, 0.95)' : 'rgba(255, 235, 120, 0.75)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, isEnd ? 7 : 4, 0, Math.PI * 2);
      ctx.fill();
      if (isEnd) {
        ctx.strokeStyle = 'rgba(40, 30, 0, 0.9)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawDistricts(rc: RenderContext, viewport: ViewportBounds): void {
    if (!rc.state.districts || rc.state.districts.size === 0) return;

    const ctx = this.ctx;

    // Color coding per district type
    const DISTRICT_COLORS: Record<string, string> = {
      city_center:   '#9e9e9e',
      encampment:    '#e53935',  // red — military
      campus:        '#00acc1',  // cyan — science
      theater:       '#8e24aa',  // purple — culture
      commercial:    '#fdd835',  // yellow — gold
      industrial:    '#fb8c00',  // orange — production
      holy_site:     '#fff9c4',  // pale yellow — faith
      government:    '#f5f5f5',  // white — gov
      entertainment: '#e91e63',  // pink — amenities
      aerodrome:     '#78909c',  // steel — air
      waterfront:    '#1565c0',  // deep blue — harbor
      downtown:      '#ff7043',  // deep orange — modern
      preserve:      '#2e7d32',  // dark green — nature
    };

    // Short labels per district type for the badge
    const DISTRICT_LABELS: Record<string, string> = {
      city_center:   'CC',
      encampment:    'EN',
      campus:        'CA',
      theater:       'TH',
      commercial:    'CO',
      industrial:    'IN',
      holy_site:     'HS',
      government:    'GV',
      entertainment: 'ET',
      aerodrome:     'AD',
      waterfront:    'WF',
      downtown:      'DT',
      preserve:      'PR',
    };

    for (const district of rc.state.districts.values()) {
      const pos = district.position;

      // Viewport culling
      if (
        pos.q < viewport.minQ ||
        pos.q > viewport.maxQ ||
        pos.r < viewport.minR ||
        pos.r > viewport.maxR
      ) {
        continue;
      }

      const { x, y } = hexToPixel(pos);
      const color = DISTRICT_COLORS[district.type] ?? '#9e9e9e';
      const label = DISTRICT_LABELS[district.type] ?? district.type.substring(0, 2).toUpperCase();

      ctx.save();

      // Colored hex border outline (thick) to mark the district tile
      drawHexPath(ctx, x, y, HEX_SIZE * 0.88);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.75;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Semi-transparent fill tint
      drawHexPath(ctx, x, y, HEX_SIZE * 0.88);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.12;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Small badge in the lower-center showing district type initials
      const badgeX = x;
      const badgeY = y + HEX_SIZE * 0.5;
      const badgeR = HEX_SIZE * 0.17;

      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(badgeX - badgeR * 1.3, badgeY - badgeR, badgeR * 2.6, badgeR * 2, badgeR * 0.4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(badgeR * 0.95)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, badgeX, badgeY);

      // Level indicator dots (one dot per level above 1)
      if (district.level > 1) {
        for (let i = 0; i < district.level; i++) {
          ctx.beginPath();
          ctx.arc(
            badgeX - (district.level - 1) * 3 + i * 6,
            badgeY + badgeR + 3,
            2, 0, Math.PI * 2
          );
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  private drawCities(rc: RenderContext, viewport: ViewportBounds): void {
    const ctx = this.ctx;
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

    for (const city of rc.state.cities.values()) {
      // Viewport culling
      if (
        city.position.q < viewport.minQ ||
        city.position.q > viewport.maxQ ||
        city.position.r < viewport.minR ||
        city.position.r > viewport.maxR
      ) {
        continue;
      }

      const { x, y } = hexToPixel(city.position);
      const players = [...rc.state.players.keys()];
      const playerIndex = players.indexOf(city.owner);
      const color = playerColors[playerIndex % playerColors.length];

      // City circle (base marker on tile)
      const cityR = HEX_SIZE * 0.38;
      ctx.beginPath();
      ctx.arc(x, y, cityR, 0, Math.PI * 2);
      ctx.fillStyle = color + 'cc'; // ~80% opacity fill
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Castle icon inside the circle: battlements on top + tower body
      const cs = cityR * 0.55; // icon scale factor
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 1;
      // Tower body (rectangle)
      ctx.fillRect(x - cs * 0.55, y - cs * 0.3, cs * 1.1, cs * 0.9);
      // Battlements: three small squares on top
      const bW = cs * 0.28, bH = cs * 0.35;
      ctx.fillRect(x - cs * 0.55, y - cs * 0.3 - bH, bW, bH);
      ctx.fillRect(x - bW * 0.5, y - cs * 0.3 - bH, bW, bH);
      ctx.fillRect(x + cs * 0.55 - bW, y - cs * 0.3 - bH, bW, bH);
      // Door arch (dark)
      ctx.fillStyle = color + '88';
      ctx.beginPath();
      ctx.arc(x, y + cs * 0.15, cs * 0.18, Math.PI, 0);
      ctx.rect(x - cs * 0.18, y + cs * 0.15, cs * 0.36, cs * 0.45);
      ctx.fill();

      // ── Production progress ring (outside the city circle) ──
      if (city.productionQueue.length > 0 && city.productionProgress > 0) {
        const ringRadius = HEX_SIZE * 0.45;
        const startAngle = -Math.PI / 2;
        const progress = Math.min(100, city.productionProgress) / 100;
        const endAngle = startAngle + Math.PI * 2 * progress;

        // Background ring (remaining portion)
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Filled portion (progress so far) drawn clockwise over the background
        ctx.beginPath();
        ctx.arc(x, y, ringRadius, startAngle, endAngle);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.lineWidth = 1;
      }

      // ── City banner (nameplate above the hex) ──
      // Place the banner well above the hex so the 3px selection-highlight ring
      // (drawn at HEX_SIZE radius, top vertex at y - HEX_SIZE) doesn't occlude it.
      // bannerY is the vertical CENTER of the banner. With bannerHeight = 16 and a
      // safety margin of 6px above the top vertex: center = y - HEX_SIZE - 8 - 6 = y - HEX_SIZE*1.44
      const bannerY = y - HEX_SIZE * 1.55;
      const popText = `${city.population}`;
      const nameText = city.name;

      ctx.font = 'bold 10px sans-serif';
      const nameWidth = ctx.measureText(nameText).width;
      ctx.font = 'bold 9px sans-serif';
      const popWidth = ctx.measureText(popText).width;

      // Banner dimensions: [pop] gap [name]
      const popBoxWidth = popWidth + 8;
      const nameBoxWidth = nameWidth + 10;
      const totalWidth = popBoxWidth + nameBoxWidth;
      const bannerHeight = 16;
      const bannerLeft = x - totalWidth / 2;

      // Population box (darker shade)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(bannerLeft, bannerY - bannerHeight / 2, popBoxWidth, bannerHeight);

      // Name box (player color with transparency)
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(bannerLeft + popBoxWidth, bannerY - bannerHeight / 2, nameBoxWidth, bannerHeight);
      ctx.globalAlpha = 1;

      // Thin white border around entire banner
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bannerLeft, bannerY - bannerHeight / 2, totalWidth, bannerHeight);

      // Population number text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(popText, bannerLeft + popBoxWidth / 2, bannerY + 3);

      // City name text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(nameText, bannerLeft + popBoxWidth + nameBoxWidth / 2, bannerY + 3.5);

      // ── Production indicator below banner ──
      if (city.productionQueue.length > 0) {
        const item = city.productionQueue[0];
        const prodLabel = item.id;
        ctx.font = '8px sans-serif';
        const prodWidth = ctx.measureText(prodLabel).width;
        const prodBoxWidth = prodWidth + 8;
        const prodY = bannerY + bannerHeight / 2 + 2;

        // Small production tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - prodBoxWidth / 2, prodY, prodBoxWidth, 11);
        ctx.fillStyle = '#ff8a65'; // production orange
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(prodLabel, x, prodY + 8);
      }
    }
  }

  /**
   * S-05 layered unit rendering.
   *
   * Groups all units by tile, then for each occupied tile:
   *   - Primary unit (S-05 priority: selected > military > civilian) renders
   *     CENTER at full size.
   *   - Secondary unit (if present) renders BOTTOM-RIGHT at ~70% scale.
   *   - When the tile also has a city, primary shifts slightly UP-LEFT so
   *     city banner and unit sprite don't overlap.
   *   - When >2 own units would stack (shouldn't happen in practice per the
   *     1-military + 1-civilian rule, but handled defensively) the extras are
   *     counted in a "+N" badge drawn by drawStackBadge.
   *
   * Enemy units are also rendered per-tile in the same pass, red-tinted.
   */
  private drawUnits(rc: RenderContext, viewport: ViewportBounds): void {
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

    // Pulse fraction: 0→1→0 over a 1.5-second cycle
    const pulseFraction = (Math.sin((performance.now() / 750) * Math.PI) + 1) / 2;

    // Pre-compute sets for quick lookup
    const cityPositionKeys = new Set<string>();
    for (const city of rc.state.cities.values()) {
      cityPositionKeys.add(coordToKey(city.position));
    }

    const isCivilian = (unit: UnitState): boolean => {
      const def = rc.state.config.units.get(unit.typeId);
      return def?.category === 'civilian' || def?.category === 'religious';
    };

    // Group units by tile key so we can determine primary/secondary role
    const byTile = new Map<string, UnitState[]>();
    for (const unit of rc.state.units.values()) {
      const key = coordToKey(unit.position);
      if (!byTile.has(key)) byTile.set(key, []);
      byTile.get(key)!.push(unit);
    }

    const players = [...rc.state.players.keys()];

    for (const [tileKey, tileUnits] of byTile) {
      // Quick viewport cull on the first unit's position (all share the same tile)
      const firstUnit = tileUnits[0];
      if (
        firstUnit.position.q < viewport.minQ ||
        firstUnit.position.q > viewport.maxQ ||
        firstUnit.position.r < viewport.minR ||
        firstUnit.position.r > viewport.maxR
      ) {
        continue;
      }

      const { x: baseCx, y: baseCy } = hexToPixel(firstUnit.position);
      const onCity = cityPositionKeys.has(tileKey);

      // Partition into own vs enemy (from currentPlayer's perspective)
      const ownUnits = tileUnits
        .filter(u => u.owner === rc.state.currentPlayerId)
        .sort((a, b) => {
          // Selected unit always primary; then military before civilian
          if (rc.selectedUnit?.id === a.id) return -1;
          if (rc.selectedUnit?.id === b.id) return  1;
          const aMil = !isCivilian(a) ? 0 : 1;
          const bMil = !isCivilian(b) ? 0 : 1;
          return aMil - bMil;
        });

      const enemyUnits = tileUnits.filter(u => u.owner !== rc.state.currentPlayerId);

      // Determine layout offsets.
      //
      // Layout rules to avoid the city-circle + unit icon collision:
      //
      //   No city on tile:
      //     - 1 unit: center
      //     - 2 units: primary top-center, secondary bottom-right at 70%
      //
      //   City on tile (circle at center, radius ≈ HEX_SIZE * 0.35 = 11px):
      //     - 1 unit: bottom-left quadrant clear of city circle
      //     - 2 units: primary bottom-left, secondary bottom-right (both 80% scale)
      //
      // These positions keep units outside the city circle while keeping them
      // within the hex boundary.
      const hasTwoOwn = ownUnits.length >= 2;

      let px1 = baseCx, py1 = baseCy;           // primary position
      let px2 = baseCx, py2 = baseCy;           // secondary position
      let primaryScale = 1.0, secondaryScale = 0.70;

      if (onCity) {
        // City occupies center. Place units in the lower quadrants.
        const downShift = HEX_SIZE * 0.45;
        const sideShift = HEX_SIZE * 0.30;
        if (hasTwoOwn) {
          // Primary: bottom-left
          px1 = baseCx - sideShift;
          py1 = baseCy + downShift;
          // Secondary: bottom-right
          px2 = baseCx + sideShift;
          py2 = baseCy + downShift;
          primaryScale = 0.80;
          secondaryScale = 0.80;
        } else {
          // Single unit: bottom-center, slightly left so health bar is visible
          px1 = baseCx - HEX_SIZE * 0.12;
          py1 = baseCy + downShift;
        }
      } else {
        // No city: standard S-05 layout
        if (hasTwoOwn) {
          // Primary: top-center
          py1 = baseCy - HEX_SIZE * 0.12;
          // Secondary: bottom-right at 70%
          px2 = baseCx + HEX_SIZE * 0.28;
          py2 = baseCy + HEX_SIZE * 0.22;
        }
      }

      // ── Primary own unit ────────────────────────────────────────────────
      if (ownUnits.length >= 1) {
        const primary = ownUnits[0];
        const playerIndex = players.indexOf(primary.owner);
        const playerColor = playerColors[playerIndex % playerColors.length];
        const isSelected = rc.selectedUnit?.id === primary.id;
        const unitDef = rc.state.config.units.get(primary.typeId);
        const maxMovement = unitDef?.movement ?? 2;

        drawUnitIcon(this.ctx, primary.typeId, px1, py1, {
          playerColor,
          isSelected,
          isFortified: primary.fortified,
          health: primary.health,
          movementLeft: primary.movementLeft,
          maxMovement,
          pulseFraction: isSelected ? pulseFraction : 0,
          scale: primaryScale,
        });
      }

      // ── Secondary own unit ─────────────────────────────────────────────
      if (hasTwoOwn) {
        const secondary = ownUnits[1];
        const playerIndex = players.indexOf(secondary.owner);
        const playerColor = playerColors[playerIndex % playerColors.length];
        const isSelected = rc.selectedUnit?.id === secondary.id;
        const unitDef = rc.state.config.units.get(secondary.typeId);
        const maxMovement = unitDef?.movement ?? 2;

        this.ctx.save();
        this.ctx.globalAlpha = 0.82; // slight fade so primary reads first
        drawUnitIcon(this.ctx, secondary.typeId, px2, py2, {
          playerColor,
          isSelected,
          isFortified: secondary.fortified,
          health: secondary.health,
          movementLeft: secondary.movementLeft,
          maxMovement,
          pulseFraction: isSelected ? pulseFraction : 0,
          scale: secondaryScale,
        });
        this.ctx.restore();
      }

      // ── Overflow badge for >2 own units on same tile ────────────────────
      // This should not happen under the 1-military + 1-civilian rule, but
      // we render a "+N" chip as a safety net.
      if (ownUnits.length > 2) {
        this.drawStackBadge(baseCx, baseCy, ownUnits.length - 2);
      }

      // ── Enemy units ────────────────────────────────────────────────────
      // Enemy units render red-tinted. Primary enemy center (or slight offset
      // if own units also occupy the tile); additional enemies get a badge.
      if (enemyUnits.length >= 1) {
        const enemy = enemyUnits[0];
        const playerIndex = players.indexOf(enemy.owner);
        const playerColor = playerColors[playerIndex % playerColors.length];
        const unitDef = rc.state.config.units.get(enemy.typeId);
        const maxMovement = unitDef?.movement ?? 2;

        // Offset enemy when own units are also here, so they don't exactly overlap
        const ex = ownUnits.length > 0 ? baseCx - HEX_SIZE * 0.14 : baseCx;
        const ey = ownUnits.length > 0 ? baseCy - HEX_SIZE * 0.14 : baseCy;

        this.ctx.save();
        // Red tint for enemy units
        this.ctx.globalCompositeOperation = 'source-over';
        drawUnitIcon(this.ctx, enemy.typeId, ex, ey, {
          playerColor,
          isSelected: false,
          isFortified: enemy.fortified,
          health: enemy.health,
          movementLeft: enemy.movementLeft,
          maxMovement,
          pulseFraction: 0,
          enemyTint: true,
        });
        this.ctx.restore();
      }

      // Enemy overflow badge — top-right of tile
      if (enemyUnits.length > 1) {
        this.drawEnemyStackBadge(baseCx, baseCy, enemyUnits.length);
      }

      // ── Unit labels (showLabels mode) ─────────────────────────────────
      // When showLabels is on, draw the unit type name as a small pill chip
      // at the bottom of the hex so the player can read the unit type at a glance.
      if (rc.showLabels && ownUnits.length > 0) {
        const primary = ownUnits[0];
        const unitDef = rc.state.config.units.get(primary.typeId);
        const label = unitDef?.name ?? primary.typeId;
        const labelX = baseCx;
        const labelY = baseCy + HEX_SIZE * 0.82;

        const ctx = this.ctx;
        ctx.save();
        ctx.font = 'bold 8px sans-serif';
        const tw = ctx.measureText(label).width;
        const pw = tw + 6, ph = 11;

        // Pill background
        ctx.fillStyle = 'rgba(10,8,5,0.80)';
        const rx = labelX - pw / 2, ry = labelY - ph / 2;
        ctx.beginPath();
        ctx.roundRect(rx, ry, pw, ph, 4);
        ctx.fill();

        // Pill text
        ctx.fillStyle = 'rgba(242,232,208,0.95)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);
        ctx.restore();
      }
    }
  }

  /**
   * Draw a "+N" overflow chip in the upper-right corner of the hex when
   * own units beyond the 2-sprite budget are present (defensive; normally
   * the Civ VII stacking rule prevents this).
   */
  private drawStackBadge(cx: number, cy: number, extra: number): void {
    const ctx = this.ctx;
    const bx = cx + HEX_SIZE * 0.42;
    const by = cy - HEX_SIZE * 0.42;
    const r = HEX_SIZE * 0.14;
    const label = `+${extra}`;

    ctx.save();
    ctx.fillStyle = getPaletteColor('--color-surface-raised') || 'rgba(38, 45, 58, 0.92)';
    ctx.strokeStyle = getPaletteColor('--color-border-accent') || 'rgba(180, 140, 60, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx - r * 1.4, by - r, r * 2.8, r * 2, r * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = getPaletteColor('--color-text') || 'rgba(230, 237, 243, 0.95)';
    ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, by);
    ctx.restore();
  }

  /**
   * Draw an enemy stack badge in the upper-right corner of the tile when
   * multiple enemy units are present on it. Shows total count (e.g. "×3").
   */
  private drawEnemyStackBadge(cx: number, cy: number, total: number): void {
    const ctx = this.ctx;
    const bx = cx + HEX_SIZE * 0.38;
    const by = cy - HEX_SIZE * 0.38;
    const r = HEX_SIZE * 0.13;
    const label = `×${total}`;

    ctx.save();
    ctx.fillStyle = 'rgba(200, 30, 30, 0.88)';
    ctx.strokeStyle = 'rgba(255, 120, 120, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx - r * 1.5, by - r, r * 3, r * 2, r * 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, by);
    ctx.restore();
  }

  private drawHexHighlight(coord: HexCoord, color: string, lineWidth: number): void {
    const ctx = this.ctx;
    const { x, y } = hexToPixel(coord);

    // Add glow effect for selected hex
    if (lineWidth >= 3) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      drawHexPath(ctx, x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();

      // Add second outer ring for extra visibility
      drawHexPath(ctx, x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth + 2;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      drawHexPath(ctx, x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  private drawCoordinateOverlay(camera: Camera, rc: RenderContext): void {
    // Mini coordinate display in bottom-left
    if (!rc.hoveredHex) return;
    const ctx = this.ctx;
    const tile = rc.state.map.tiles.get(coordToKey(rc.hoveredHex));
    if (!tile) return;

    const terrain = rc.terrainRegistry.get(tile.terrain);
    const feature = tile.feature ? rc.featureRegistry.get(tile.feature) : null;

    const text = `(${tile.coord.q}, ${tile.coord.r}) ${terrain?.name ?? ''}${feature ? ` + ${feature.name}` : ''}`;
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(8, ctx.canvas.height - 28, ctx.measureText(text).width + 16, 22);
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.fillText(text, 16, ctx.canvas.height - 12);
  }
}

export { HEX_SIZE, HEX_WIDTH, HEX_HEIGHT };
