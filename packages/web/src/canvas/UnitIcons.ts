/**
 * Draw distinct unit icons on the hex canvas.
 * Each unit type gets a recognizable silhouette/icon drawn with canvas paths.
 */

const ICON_SIZE = 10;

export interface UnitIconOptions {
  /** Player ownership color (hex string) */
  playerColor: string;
  /** Whether this unit is currently selected */
  isSelected: boolean;
  /** Whether this unit is fortified */
  isFortified: boolean;
  /** 0-100 health value */
  health: number;
  /** Remaining movement points */
  movementLeft: number;
  /** Maximum (base) movement points for this unit type */
  maxMovement: number;
  /** Pulse phase 0–1 driven by the render loop (for selected animation) */
  pulseFraction: number;
}

export function drawUnitIcon(
  ctx: CanvasRenderingContext2D,
  typeId: string,
  cx: number,
  cy: number,
  opts: UnitIconOptions,
): void {
  const { playerColor, isSelected, isFortified, health, movementLeft, maxMovement, pulseFraction } = opts;

  ctx.save();
  ctx.translate(cx, cy);

  const s = ICON_SIZE;

  // ── 1. Player-colored background circle ──────────────────────────────────
  ctx.beginPath();
  ctx.arc(0, 0, s * 1.1, 0, Math.PI * 2);
  // Slightly darken the player color for the background
  ctx.fillStyle = playerColor + '55'; // ~33% opacity fill
  ctx.fill();
  ctx.strokeStyle = playerColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── 2. Selected unit pulsing glow ─────────────────────────────────────────
  if (isSelected) {
    // pulseFraction oscillates 0→1→0; map to alpha 0.3→0.9
    const alpha = 0.3 + pulseFraction * 0.6;
    const radius = s * 1.4 + pulseFraction * s * 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 120, ${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = `rgba(255, 255, 120, ${alpha})`;
    ctx.shadowBlur = 8 + pulseFraction * 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── 3. Unit icon silhouette ───────────────────────────────────────────────
  ctx.fillStyle = playerColor;
  ctx.strokeStyle = isSelected ? '#fff' : 'rgba(0,0,0,0.7)';
  ctx.lineWidth = isSelected ? 2 : 1;

  const drawFn = UNIT_DRAW_MAP[typeId] ?? drawDefaultUnit;
  drawFn(ctx, s);

  // ── 4. Fortification shield outline ──────────────────────────────────────
  if (isFortified) {
    ctx.save();
    const sh = s * 1.5; // shield half-height
    const sw = s * 1.2; // shield half-width
    ctx.beginPath();
    // Classic heater shield path
    ctx.moveTo(0, -sh);
    ctx.lineTo(sw, -sh);
    ctx.lineTo(sw, 0);
    ctx.quadraticCurveTo(sw, sh * 0.8, 0, sh);
    ctx.lineTo(-sw, 0);
    ctx.lineTo(-sw, -sh);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(180, 200, 255, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();

  // ── 5. Health bar (below icon, gradient green→yellow→red) ─────────────
  const barW = ICON_SIZE * 2.2;
  const barH = 3;
  const bx = cx - barW / 2;
  const by = cy + ICON_SIZE * 1.35;

  // Background track
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

  // Gradient fill based on health fraction
  const frac = Math.max(0, Math.min(1, health / 100));
  const grad = ctx.createLinearGradient(bx, by, bx + barW, by);
  if (frac > 0.6) {
    grad.addColorStop(0, '#66bb6a');
    grad.addColorStop(1, '#a5d6a7');
  } else if (frac > 0.3) {
    grad.addColorStop(0, '#ffa726');
    grad.addColorStop(1, '#ffcc80');
  } else {
    grad.addColorStop(0, '#ef5350');
    grad.addColorStop(1, '#ff8a80');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(bx, by, barW * frac, barH);

  // ── 6. Movement dots ──────────────────────────────────────────────────────
  const dotY = by + barH + 4;
  const dotR = 2;
  const totalDots = Math.min(maxMovement, 5);
  const dotSpacing = 5;
  const dotsWidth = totalDots * dotSpacing - (dotSpacing - dotR * 2);
  const dotStartX = cx - dotsWidth / 2 + dotR;

  for (let i = 0; i < totalDots; i++) {
    const dx = dotStartX + i * dotSpacing;
    const filled = i < movementLeft;
    ctx.beginPath();
    ctx.arc(dx, dotY, dotR, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = '#64b5f6';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,100,100,0.6)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
}

type DrawFn = (ctx: CanvasRenderingContext2D, s: number) => void;

// ── Melee: Shield shape ──
const drawWarrior: DrawFn = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.8, -s * 0.3);
  ctx.lineTo(s * 0.8, s * 0.5);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.8, s * 0.5);
  ctx.lineTo(-s * 0.8, -s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Sword cross
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.lineTo(0, s * 0.5);
  ctx.moveTo(-s * 0.3, -s * 0.1);
  ctx.lineTo(s * 0.3, -s * 0.1);
  ctx.stroke();
};

// ── Ranged: Bow/Arrow ──
const drawArcher: DrawFn = (ctx, s) => {
  // Circle body
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Bow arc
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-s * 0.1, 0, s * 0.45, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.stroke();
  // Arrow
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, 0);
  ctx.lineTo(s * 0.5, 0);
  ctx.stroke();
};

const drawSlinger: DrawFn = (ctx, s) => {
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Sling circle
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.25, 0, Math.PI * 2);
  ctx.stroke();
};

// ── Scout: Eye/Diamond ──
const drawScout: DrawFn = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.7, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
};

// ── Spearman: Tall rectangle with spear ──
const drawSpearman: DrawFn = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.8, -s * 0.3);
  ctx.lineTo(s * 0.8, s * 0.5);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.8, s * 0.5);
  ctx.lineTo(-s * 0.8, -s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Spear line
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.8);
  ctx.lineTo(0, s * 0.8);
  ctx.stroke();
  // Spear tip
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.6);
  ctx.lineTo(0, -s * 0.9);
  ctx.lineTo(s * 0.2, -s * 0.6);
  ctx.stroke();
};

// ── Cavalry/Chariot: Horse silhouette ──
const drawCavalry: DrawFn = (ctx, s) => {
  // Hexagon-ish shape
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, 0);
  ctx.lineTo(-s * 0.4, -s * 0.7);
  ctx.lineTo(s * 0.4, -s * 0.7);
  ctx.lineTo(s * 0.9, 0);
  ctx.lineTo(s * 0.4, s * 0.7);
  ctx.lineTo(-s * 0.4, s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Horse head shape
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, s * 0.2);
  ctx.lineTo(s * 0.1, -s * 0.3);
  ctx.lineTo(s * 0.4, -s * 0.2);
  ctx.stroke();
};

// ── Settler: Star/House ──
const drawSettler: DrawFn = (ctx, s) => {
  // House shape
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.9);
  ctx.lineTo(s * 0.7, -s * 0.1);
  ctx.lineTo(s * 0.7, s * 0.7);
  ctx.lineTo(-s * 0.7, s * 0.7);
  ctx.lineTo(-s * 0.7, -s * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Door
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-s * 0.2, s * 0.1, s * 0.4, s * 0.6);
};

// ── Builder: Hammer ──
const drawBuilder: DrawFn = (ctx, s) => {
  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Hammer
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.4);
  ctx.lineTo(0, -s * 0.15);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-s * 0.3, -s * 0.45, s * 0.6, s * 0.3);
};

// ── Siege: Square with X ──
const drawSiege: DrawFn = (ctx, s) => {
  ctx.fillRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4);
  ctx.strokeRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4);
  // X mark
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.4);
  ctx.lineTo(s * 0.4, s * 0.4);
  ctx.moveTo(s * 0.4, -s * 0.4);
  ctx.lineTo(-s * 0.4, s * 0.4);
  ctx.stroke();
};

// ── Naval: Boat shape ──
const drawNaval: DrawFn = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(-s * 0.9, s * 0.2);
  ctx.quadraticCurveTo(0, s * 0.8, s * 0.9, s * 0.2);
  ctx.lineTo(s * 0.6, -s * 0.3);
  ctx.lineTo(-s * 0.6, -s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Mast
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.3);
  ctx.lineTo(0, -s * 0.9);
  ctx.stroke();
};

// ── Default: Simple triangle ──
const drawDefaultUnit: DrawFn = (ctx, s) => {
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.7, s * 0.5);
  ctx.lineTo(-s * 0.7, s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};

const UNIT_DRAW_MAP: Record<string, DrawFn> = {
  warrior: drawWarrior,
  spearman: drawSpearman,
  archer: drawArcher,
  slinger: drawSlinger,
  scout: drawScout,
  chariot: drawCavalry,
  horseman: drawCavalry,
  knight: drawCavalry,
  cavalry: drawCavalry,
  settler: drawSettler,
  builder: drawBuilder,
  battering_ram: drawSiege,
  bombard: drawSiege,
  cannon: drawSiege,
  rocket_artillery: drawSiege,
  galley: drawNaval,
  caravel: drawNaval,
  ironclad: drawNaval,
  musketman: drawWarrior,
  infantry: drawWarrior,
  tank: drawCavalry,
  machine_gun: drawArcher,
  fighter: drawScout,
};
