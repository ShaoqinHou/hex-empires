/**
 * AnimationRenderer — Draws visual animations on the canvas.
 *
 * This is a pure rendering layer. It reads animation state and draws it on top of the game.
 * All animations are visual overlays; they don't affect game logic.
 */

import type {
  AnyAnimation,
  UnitMoveAnimation,
  MeleeAttackAnimation,
  RangedAttackAnimation,
  DamageFlashAnimation,
  UnitDeathAnimation,
  CityFoundedAnimation,
  ProductionCompleteAnimation,
  CityGrowthAnimation,
} from './AnimationManager';
import { AnimationManager } from './AnimationManager';
import type { Camera } from './Camera';
import { drawUnitIcon } from './UnitIcons';
import { hexToPixel, HEX_SIZE } from './HexRenderer';

const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

/** Get player color by index (consistent with HexRenderer) */
function getPlayerColor(ownerId: string): string {
  // Simple hash of owner ID to pick a consistent color
  let hash = 0;
  for (let i = 0; i < ownerId.length; i++) {
    hash = ownerId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PLAYER_COLORS.length;
  return PLAYER_COLORS[index];
}

export class AnimationRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /** Render all active animations */
  render(camera: Camera, manager: AnimationManager, currentTime: number): void {
    const animations = manager.getActive();
    if (animations.length === 0) return;

    this.ctx.save();
    camera.applyTransform(this.ctx);

    // Render animations in order: movement, projectiles, effects, overlays
    for (const anim of animations) {
      switch (anim.type) {
        case 'unit-move':
          this.renderUnitMove(anim, manager, currentTime);
          break;
        case 'melee-attack':
          this.renderMeleeAttack(anim, manager, currentTime);
          break;
        case 'ranged-attack':
          this.renderRangedAttack(anim, manager, currentTime);
          break;
        case 'damage-flash':
          this.renderDamageFlash(anim, manager, currentTime);
          break;
        case 'unit-death':
          this.renderUnitDeath(anim, manager, currentTime);
          break;
        case 'city-founded':
          this.renderCityFounded(anim, manager, currentTime);
          break;
        case 'production-complete':
          this.renderProductionComplete(anim, manager, currentTime);
          break;
        case 'city-growth':
          this.renderCityGrowth(anim, manager, currentTime);
          break;
      }
    }

    this.ctx.restore();
  }

  /** Render moving unit */
  private renderUnitMove(anim: UnitMoveAnimation, manager: AnimationManager, currentTime: number): void {
    const pos = manager.getUnitPosition(anim, currentTime);
    if (!pos) return;

    const progress = manager.getProgress(anim, currentTime);
    const color = getPlayerColor(anim.ownerId);

    // Slight scale effect during movement
    const scale = 1 + Math.sin(progress * Math.PI) * 0.1;

    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    this.ctx.scale(scale, scale);

    // Draw unit icon with unit type from animation data
    // For now, use a generic unit icon - in a full implementation, you'd pass unit type
    drawUnitIcon(this.ctx, 'warrior', 0, 0, color, false);

    // Movement trail (fading dots behind)
    const trailLength = 3;
    for (let i = 1; i <= trailLength; i++) {
      const trailProgress = Math.max(0, progress - i * 0.05);
      if (trailProgress <= 0) continue;

      const trailPos = manager.getUnitPosition(anim, currentTime - i * 20);
      if (!trailPos) continue;

      const alpha = 0.3 * (1 - i / trailLength);
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(trailPos.x - pos.x, trailPos.y - pos.y, HEX_SIZE * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /** Render melee attack lunge */
  private renderMeleeAttack(anim: MeleeAttackAnimation, manager: AnimationManager, currentTime: number): void {
    const pos = manager.getMeleeLungePosition(anim, currentTime);
    if (!pos) return;

    const progress = manager.getProgress(anim, currentTime);
    const attackerColor = getPlayerColor(anim.attackerOwnerId);
    const targetColor = getPlayerColor(anim.targetOwnerId);

    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);

    // Draw attacker unit
    drawUnitIcon(this.ctx, anim.attackerTypeId, 0, 0, attackerColor, false);

    // Draw attack slash effect
    if (progress > 0.3 && progress < 0.7) {
      const slashAlpha = Math.sin((progress - 0.3) / 0.4 * Math.PI);
      this.ctx.globalAlpha = slashAlpha * 0.8;
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(-HEX_SIZE * 0.8, -HEX_SIZE * 0.3);
      this.ctx.lineTo(HEX_SIZE * 0.8, HEX_SIZE * 0.3);
      this.ctx.stroke();
    }

    // Draw target unit with shake effect
    if (progress > 0.4 && progress < 0.6) {
      const shakeAmount = Math.sin((progress - 0.4) / 0.2 * Math.PI) * 3;
      this.ctx.globalAlpha = 1;
      this.ctx.translate(
        (Math.random() - 0.5) * shakeAmount,
        (Math.random() - 0.5) * shakeAmount
      );
      drawUnitIcon(this.ctx, anim.targetTypeId, HEX_SIZE, 0, targetColor, false);
    }

    this.ctx.restore();
  }

  /** Render ranged attack projectile */
  private renderRangedAttack(anim: RangedAttackAnimation, manager: AnimationManager, currentTime: number): void {
    const pos = manager.getProjectilePosition(anim, currentTime);
    if (!pos) return;

    const progress = manager.getProgress(anim, currentTime);
    const attackerColor = getPlayerColor(anim.attackerOwnerId);
    const targetColor = getPlayerColor(anim.targetOwnerId);

    this.ctx.save();

    // Draw attacker and target units
    const fromPos = hexToPixel(anim.from);
    const toPos = hexToPixel(anim.to);

    // Projectile glow
    const glowSize = HEX_SIZE * (0.4 + Math.sin(progress * Math.PI) * 0.2);
    const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
    gradient.addColorStop(0, anim.projectileColor);
    gradient.addColorStop(0.5, anim.projectileColor + '88');
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
    this.ctx.fill();

    // Projectile core
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, HEX_SIZE * 0.15, 0, Math.PI * 2);
    this.ctx.fill();

    // Impact effect at target
    if (progress > 0.9) {
      const impactAlpha = (progress - 0.9) / 0.1;
      this.ctx.globalAlpha = impactAlpha;
      this.ctx.beginPath();
      this.ctx.arc(toPos.x, toPos.y, HEX_SIZE * 0.5, 0, Math.PI * 2);
      const impactGradient = this.ctx.createRadialGradient(toPos.x, toPos.y, 0, toPos.x, toPos.y, HEX_SIZE * 0.5);
      impactGradient.addColorStop(0, 'rgba(255, 100, 50, 0.8)');
      impactGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
      this.ctx.fillStyle = impactGradient;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /** Render damage flash */
  private renderDamageFlash(anim: DamageFlashAnimation, manager: AnimationManager, currentTime: number): void {
    const progress = manager.getProgress(anim, currentTime);
    const alpha = 1 - progress; // Fade out

    const { x, y } = hexToPixel(anim.position);

    this.ctx.save();
    this.ctx.globalAlpha = alpha * 0.7;

    // Red flash overlay
    this.ctx.fillStyle = '#f44336';
    this.ctx.beginPath();
    this.ctx.arc(x, y, HEX_SIZE * 0.6, 0, Math.PI * 2);
    this.ctx.fill();

    // Damage rings
    const ringSize = HEX_SIZE * (0.6 + progress * 0.5);
    this.ctx.strokeStyle = '#ff5722';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringSize, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /** Render unit death */
  private renderUnitDeath(anim: UnitDeathAnimation, manager: AnimationManager, currentTime: number): void {
    const progress = manager.getProgress(anim, currentTime);
    const { x, y } = hexToPixel(anim.position);
    const color = getPlayerColor(anim.ownerId);

    this.ctx.save();
    this.ctx.translate(x, y);

    // Shrink and fade
    const scale = 1 - progress;
    const alpha = 1 - progress;

    this.ctx.globalAlpha = alpha;
    this.ctx.scale(scale, scale);

    // Draw unit icon fading
    drawUnitIcon(this.ctx, anim.unitTypeId, 0, 0, color, false);

    // Death particles exploding outward
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = progress * HEX_SIZE * 1.5;
      const px = Math.cos(angle) * distance / scale;
      const py = Math.sin(angle) * distance / scale;

      this.ctx.globalAlpha = alpha * (1 - progress * 0.5);
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(px, py, HEX_SIZE * 0.15, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /** Render city founded animation */
  private renderCityFounded(anim: CityFoundedAnimation, manager: AnimationManager, currentTime: number): void {
    const progress = manager.getProgress(anim, currentTime);
    const { x, y } = hexToPixel(anim.position);
    const color = getPlayerColor(anim.ownerId);

    this.ctx.save();

    // Expanding ring
    const maxRadius = HEX_SIZE * 2.5;
    const ringRadius = progress * maxRadius;
    const ringAlpha = 1 - progress;

    // Outer ring
    this.ctx.globalAlpha = ringAlpha * 0.6;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Inner ring
    this.ctx.globalAlpha = ringAlpha * 0.4;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, ringRadius * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();

    // City name popup
    if (progress > 0.3) {
      const popupProgress = (progress - 0.3) / 0.7;
      const popupAlpha = Math.min(1, popupProgress * 2);
      const popupY = y - HEX_SIZE - popupProgress * 20;

      this.ctx.globalAlpha = popupAlpha;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.font = 'bold 12px sans-serif';
      const textWidth = this.ctx.measureText(anim.cityName).width;
      this.ctx.fillRect(x - textWidth / 2 - 8, popupY - 10, textWidth + 16, 20);

      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(anim.cityName, x, popupY);
    }

    this.ctx.restore();
  }

  /** Render production complete animation */
  private renderProductionComplete(anim: ProductionCompleteAnimation, manager: AnimationManager, currentTime: number): void {
    const progress = manager.getProgress(anim, currentTime);
    const { x, y } = hexToPixel(anim.position);

    this.ctx.save();

    // Pop-up effect
    const scale = progress < 0.2
      ? progress / 0.2 // Scale up
      : 1 + (1 - progress) * 0.2; // Bounce back slightly

    const offsetY = -progress * 30;
    const alpha = progress < 0.8 ? 1 : (1 - progress) / 0.2; // Fade at end

    this.ctx.translate(x, y + offsetY);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = alpha;

    // Background
    let bgColor: string;
    let icon: string;
    switch (anim.itemType) {
      case 'unit':
        bgColor = '#64b5f6';
        icon = '⚔';
        break;
      case 'building':
        bgColor = '#ff8a65';
        icon = '🏠';
        break;
      case 'wonder':
        bgColor = '#ffd54f';
        icon = '✨';
        break;
      case 'district':
        bgColor = '#9575cd';
        icon = '🏛';
        break;
    }

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.font = 'bold 11px sans-serif';
    const textWidth = this.ctx.measureText(anim.itemName).width;
    const boxWidth = Math.max(textWidth + 16, 50);
    const boxHeight = 24;

    this.ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);

    // Colored border
    this.ctx.strokeStyle = bgColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);

    // Icon and text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 11px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${icon} ${anim.itemName}`, 0, 0);

    this.ctx.restore();
  }

  /** Render city growth animation */
  private renderCityGrowth(anim: CityGrowthAnimation, manager: AnimationManager, currentTime: number): void {
    const progress = manager.getProgress(anim, currentTime);
    const { x, y } = hexToPixel(anim.position);

    this.ctx.save();

    // Green upward arrow
    const arrowY = y - HEX_SIZE * 0.5 - progress * 20;
    const alpha = progress < 0.7 ? progress / 0.7 : (1 - progress) / 0.3;

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#4caf50';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('↑', x, arrowY);

    // Population change text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.fillText(`${anim.fromPop} → ${anim.toPop}`, x, arrowY + 14);

    this.ctx.restore();
  }
}
