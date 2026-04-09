import type { HexCoord, HexMap, HexTile, GameState, UnitState, CityState } from '@hex/engine';
import { coordToKey, distance } from '@hex/engine';
import type { Registry } from '@hex/engine';
import type { TerrainDef, TerrainFeatureDef } from '@hex/engine';
import type { Camera } from './Camera';
import { drawUnitIcon } from './UnitIcons';

/** Hex sizing — pointy-top orientation */
const HEX_SIZE = 32; // outer radius (center to vertex)
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

export interface RenderContext {
  state: GameState;
  terrainRegistry: Registry<TerrainDef>;
  featureRegistry: Registry<TerrainFeatureDef>;
  selectedHex: HexCoord | null;
  selectedUnit: UnitState | null;
  reachableHexes: ReadonlySet<string> | null;
  hoveredHex: HexCoord | null;
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

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  render(camera: Camera, rc: RenderContext): void {
    const ctx = this.ctx;
    const canvas = ctx.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    camera.applyTransform(ctx);

    // Draw terrain tiles
    this.drawTerrain(rc);

    // Draw rivers
    this.drawRivers(rc);

    // Draw territory borders
    this.drawTerritoryBorders(rc);

    // Draw reachable hex overlay
    if (rc.reachableHexes) {
      this.drawReachableOverlay(rc);
    }

    // Draw cities
    this.drawCities(rc);

    // Draw units
    this.drawUnits(rc);

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

  private drawTerrain(rc: RenderContext): void {
    const ctx = this.ctx;

    for (const tile of rc.state.map.tiles.values()) {
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

      // Yield dots (small indicators)
      this.drawYieldDots(tile, x, y, rc);
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

  private drawRivers(rc: RenderContext): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#4a90b8';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    for (const tile of rc.state.map.tiles.values()) {
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

  private drawTerritoryBorders(rc: RenderContext): void {
    const ctx = this.ctx;
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

    for (const city of rc.state.cities.values()) {
      const players = [...rc.state.players.keys()];
      const playerIndex = players.indexOf(city.owner);
      const color = playerColors[playerIndex % playerColors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;

      for (const hexKey of city.territory) {
        const tile = rc.state.map.tiles.get(hexKey);
        if (!tile) continue;
        const { x, y } = hexToPixel(tile.coord);
        drawHexPath(ctx, x, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawReachableOverlay(rc: RenderContext): void {
    const ctx = this.ctx;
    if (!rc.reachableHexes) return;

    for (const key of rc.reachableHexes) {
      const tile = rc.state.map.tiles.get(key);
      if (!tile) continue;
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

  private drawCities(rc: RenderContext): void {
    const ctx = this.ctx;
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

    for (const city of rc.state.cities.values()) {
      const { x, y } = hexToPixel(city.position);
      const players = [...rc.state.players.keys()];
      const playerIndex = players.indexOf(city.owner);
      const color = playerColors[playerIndex % playerColors.length];

      // City circle
      ctx.beginPath();
      ctx.arc(x, y, HEX_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // City name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(city.name, x, y - HEX_SIZE * 0.55);

      // Population
      ctx.font = '9px sans-serif';
      ctx.fillText(`${city.population}`, x, y + 4);
    }
  }

  private drawUnits(rc: RenderContext): void {
    const ctx = this.ctx;
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

    for (const unit of rc.state.units.values()) {
      const { x, y } = hexToPixel(unit.position);
      const players = [...rc.state.players.keys()];
      const playerIndex = players.indexOf(unit.owner);
      const color = playerColors[playerIndex % playerColors.length];
      const isSelected = rc.selectedUnit?.id === unit.id;

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
    drawHexPath(ctx, x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(8, ctx.canvas.height - 28, ctx.measureText(text).width + 16, 22);
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(text, 16, ctx.canvas.height - 12);
  }
}

export { HEX_SIZE, HEX_WIDTH, HEX_HEIGHT };
