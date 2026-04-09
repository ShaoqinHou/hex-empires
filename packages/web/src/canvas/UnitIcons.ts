/**
 * Draw distinct unit icons on the hex canvas.
 * Each unit type gets a recognizable silhouette/icon drawn with canvas paths.
 */

const ICON_SIZE = 10;

export function drawUnitIcon(
  ctx: CanvasRenderingContext2D,
  typeId: string,
  cx: number,
  cy: number,
  color: string,
  isSelected: boolean,
): void {
  ctx.save();
  ctx.translate(cx, cy);

  const s = ICON_SIZE;
  ctx.fillStyle = color;
  ctx.strokeStyle = isSelected ? '#fff' : 'rgba(0,0,0,0.6)';
  ctx.lineWidth = isSelected ? 2 : 1;

  const drawFn = UNIT_DRAW_MAP[typeId] ?? drawDefaultUnit;
  drawFn(ctx, s);

  ctx.restore();
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
