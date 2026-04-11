import type { HexCoord, HexMap, HexTile, GameState, UnitState, CityState } from '@hex/engine';
import { coordToKey, distance, HEX_DIRECTIONS } from '@hex/engine';
import type { Registry } from '@hex/engine';
import type { TerrainDef, TerrainFeatureDef } from '@hex/engine';
import type { ResourceDef } from '@hex/engine';
import type { Camera } from './Camera';
import { drawUnitIcon } from './UnitIcons';
import { RenderCache, calculateViewportBounds, type ViewportBounds } from './RenderCache';

/** Hex sizing — pointy-top orientation */
const HEX_SIZE = 32; // outer radius (center to vertex)
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

export interface RenderContext {
  state: GameState;
  terrainRegistry: Registry<TerrainDef>;
  featureRegistry: Registry<TerrainFeatureDef>;
  resourceRegistry: Registry<ResourceDef>;
  selectedHex: HexCoord | null;
  selectedUnit: UnitState | null;
  reachableHexes: ReadonlySet<string> | null;
  hoveredHex: HexCoord | null;
  visibility: ReadonlySet<string> | null;  // currently visible tiles
  explored: ReadonlySet<string> | null;    // ever-seen tiles
  showYields: boolean;
  turnNumber: number;  // Track turn changes for glow effects
}

/** Convert axial hex coordinate to pixel position (center of hex) */
export function hexToPixel(coord: HexCoord): { x: number; y: number } {
  const x = HEX_WIDTH * (coord.q + coord.r * 0.5);
  const y = HEX_HEIGHT * 0.75 * coord.r;
  return { x, y };
}

/** Convert pixel position to axial hex coordinate */
export function pixelToHex(x: number, y: number): HexCoord {
  const r = (y / (HEX_HEIGHT * 0.75));
  const q = (x / HEX_WIDTH) - r * 0.5;
  // Round to nearest hex
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

    // Draw reachable hex overlay
    if (rc.reachableHexes) {
      this.drawReachableOverlay(rc, viewport);
    }

    // Draw fog of war overlay
    this.drawFogOfWar(rc, viewport);

    // Draw cities (only visible/explored, viewport culled)
    this.drawCities(rc, viewport);

    // Draw units (only visible, viewport culled)
    this.drawUnits(rc, viewport);

    // Draw selection highlight
    if (rc.selectedHex) {
      this.drawHexHighlight(rc.selectedHex, 'rgba(255, 255, 255, 0.4)', 3);
    }

    // Draw hover highlight
    if (rc.hoveredHex) {
      this.drawHexHighlight(rc.hoveredHex, 'rgba(255, 255, 255, 0.15)', 1);
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

      // Base terrain color
      drawHexPath(ctx, x, y);
      ctx.fillStyle = terrain?.color ?? '#333';
      ctx.fill();

      // Feature overlay
      if (feature) {
        drawHexPath(ctx, x, y);
        ctx.fillStyle = feature.color + '88'; // semi-transparent
        ctx.fill();
      }

      // Hex border
      drawHexPath(ctx, x, y);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Improvement icon - always visible
      if (tile.improvement) {
        this.drawImprovementIcon(tile, x, y, rc);
      }

      // Yield dots (small indicators) — only when lens is active
      if (rc.showYields) {
        this.drawYieldDots(tile, x, y, rc);
        // Resource icon — drawn after yield dots to appear above them
        if (tile.resource) {
          this.drawResourceIcon(tile, x, y, rc);
        }
        // Improvement icon
        if (tile.improvement) {
          this.drawImprovementIcon(tile, x, y, rc);
        }
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

    // Pick circle color by resource type
    let circleColor: string;
    switch (resource.type) {
      case 'luxury':   circleColor = '#ffd54f'; break; // gold
      case 'strategic': circleColor = '#9e9e9e'; break; // gray
      case 'bonus':    circleColor = '#66bb6a'; break; // green
      default:         circleColor = '#ffffff';
    }

    // Position icon in upper-left area of the hex (doesn't overlap yield dots at bottom)
    const iconX = cx - HEX_SIZE * 0.35;
    const iconY = cy - HEX_SIZE * 0.35;
    const radius = 5;

    // Drop shadow for readability
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;

    // Filled circle
    ctx.beginPath();
    ctx.arc(iconX, iconY, radius, 0, Math.PI * 2);
    ctx.fillStyle = circleColor;
    ctx.fill();

    // Dark border
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // First letter of resource name
    ctx.fillStyle = '#000';
    ctx.font = `bold ${radius + 1}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(resource.name.charAt(0).toUpperCase(), iconX, iconY);
    ctx.textBaseline = 'alphabetic'; // reset
  }

  private drawImprovementIcon(tile: HexTile, cx: number, cy: number, rc: RenderContext): void {
    if (!tile.improvement) return;

    const ctx = this.ctx;

    // Improvement icons map
    const icons: Record<string, string> = {
      farm: '🌾',
      mine: '⛏️',
      pasture: '🐄',
      plantation: '🌿',
      quarry: '🪨',
      camp: '⛺',
      road: '🛤️',
    };

    const icon = icons[tile.improvement] || '❓';

    // Position icon in upper-right area of the hex (opposite to resources)
    const iconX = cx + HEX_SIZE * 0.35;
    const iconY = cy - HEX_SIZE * 0.35;

    // Draw improvement icon
    ctx.save();
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText(icon, iconX, iconY);
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
    ctx.strokeStyle = '#4a90b8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

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
        ctx.beginPath();
        ctx.moveTo(x + HEX_SIZE * Math.cos(angle1), y + HEX_SIZE * Math.sin(angle1));
        ctx.lineTo(x + HEX_SIZE * Math.cos(angle2), y + HEX_SIZE * Math.sin(angle2));
        ctx.stroke();
      }
    }
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

      // Subtle territory fill (10% opacity)
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
        ctx.globalAlpha = 0.1;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Border edges: only draw edges adjacent to non-owned territory
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7;

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

        for (let i = 0; i < 6; i++) {
          const dir = HEX_DIRECTIONS[i];
          const neighborCoord: HexCoord = { q: tile.coord.q + dir.q, r: tile.coord.r + dir.r };
          const neighborKey = coordToKey(neighborCoord);
          const neighborOwner = ownerByHex.get(neighborKey);

          // Draw edge only if neighbor is not owned by the same player
          if (neighborOwner === city.owner) continue;

          // Pointy-top hex: vertex i is at angle (60*i - 30) degrees
          const angle1 = (Math.PI / 180) * (60 * i - 30);
          const angle2 = (Math.PI / 180) * (60 * ((i + 1) % 6) - 30);
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
      ctx.fillStyle = 'rgba(100, 181, 246, 0.25)';
      ctx.fill();
      drawHexPath(ctx, x, y);
      ctx.strokeStyle = 'rgba(100, 181, 246, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
      ctx.beginPath();
      ctx.arc(x, y, HEX_SIZE * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── City banner (nameplate above the hex) ──
      const bannerY = y - HEX_SIZE * 0.85;
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

  private drawUnits(rc: RenderContext, viewport: ViewportBounds): void {
    const ctx = this.ctx;
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

    // Build a set of city position keys for quick lookup
    const cityPositionKeys = new Set<string>();
    for (const city of rc.state.cities.values()) {
      cityPositionKeys.add(coordToKey(city.position));
    }

    for (const unit of rc.state.units.values()) {
      // Viewport culling
      if (
        unit.position.q < viewport.minQ ||
        unit.position.q > viewport.maxQ ||
        unit.position.r < viewport.minR ||
        unit.position.r > viewport.maxR
      ) {
        continue;
      }

      const { x: baseX, y: baseY } = hexToPixel(unit.position);
      const players = [...rc.state.players.keys()];
      const playerIndex = players.indexOf(unit.owner);
      const color = playerColors[playerIndex % players.length];
      const isSelected = rc.selectedUnit?.id === unit.id;

      // Offset unit when on a city tile so both are visible
      const onCity = cityPositionKeys.has(coordToKey(unit.position));
      const x = onCity ? baseX - 10 : baseX;
      const y = onCity ? baseY - 10 : baseY;

      // Check if unit is freshly ready (has full movement and belongs to current player)
      const isReady = unit.owner === rc.state.currentPlayerId && unit.movementLeft > 0;

      // Draw glow effect for newly available units
      if (isReady) {
        ctx.save();
        ctx.shadowColor = 'rgba(100, 181, 246, 0.9)';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x, y, HEX_SIZE * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 181, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Unit icon (distinct per type)
      drawUnitIcon(ctx, unit.typeId, x, y - 2, color, isSelected);

      // Unit type label
      ctx.fillStyle = '#fff';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(unit.typeId.charAt(0).toUpperCase(), x, y + HEX_SIZE * 0.4);

      // Health bar (always visible)
      const barWidth = HEX_SIZE * 0.5;
      const barHeight = 3;
      const bx = x - barWidth / 2;
      const by = y + HEX_SIZE * 0.45;
      ctx.fillStyle = '#222';
      ctx.fillRect(bx, by, barWidth, barHeight);
      ctx.fillStyle = unit.health > 66 ? '#4caf50' : unit.health > 33 ? '#ff9800' : '#f44336';
      ctx.fillRect(bx, by, barWidth * (unit.health / 100), barHeight);

      // Movement dots
      if (unit.movementLeft > 0 && unit.owner === rc.state.currentPlayerId) {
        for (let i = 0; i < Math.min(unit.movementLeft, 4); i++) {
          ctx.fillStyle = '#64b5f6';
          ctx.beginPath();
          ctx.arc(x - barWidth / 2 + 3 + i * 5, by + 6, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
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
