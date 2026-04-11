export interface CameraState {
  x: number;      // world x offset
  y: number;      // world y offset
  zoom: number;   // scale factor
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;
const PAN_SPEED = 15;

export class Camera {
  x = 0;
  y = 0;
  zoom = 1.0;
  private canvasWidth = 0;
  private canvasHeight = 0;

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /** Pan by pixel delta (screen space) */
  pan(dx: number, dy: number): void {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  /** Pan by keyboard arrow keys */
  panByKey(key: string): void {
    switch (key) {
      case 'ArrowLeft': this.x -= PAN_SPEED / this.zoom; break;
      case 'ArrowRight': this.x += PAN_SPEED / this.zoom; break;
      case 'ArrowUp': this.y -= PAN_SPEED / this.zoom; break;
      case 'ArrowDown': this.y += PAN_SPEED / this.zoom; break;
    }
  }

  /** Zoom toward a screen point */
  zoomAt(screenX: number, screenY: number, delta: number): void {
    const factor = delta > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * factor));

    // Adjust position so the point under cursor stays in place
    const worldX = (screenX - this.canvasWidth / 2) / this.zoom + this.x;
    const worldY = (screenY - this.canvasHeight / 2) / this.zoom + this.y;
    this.x = worldX - (screenX - this.canvasWidth / 2) / newZoom;
    this.y = worldY - (screenY - this.canvasHeight / 2) / newZoom;

    this.zoom = newZoom;
  }

  /** Convert screen coords to world coords */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.canvasWidth / 2) / this.zoom + this.x,
      y: (screenY - this.canvasHeight / 2) / this.zoom + this.y,
    };
  }

  /** Convert world coords to screen coords */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: (worldX - this.x) * this.zoom + this.canvasWidth / 2,
      y: (worldY - this.y) * this.zoom + this.canvasHeight / 2,
    };
  }

  /** Apply camera transform to a canvas context */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  /** Center on a world position */
  centerOn(worldX: number, worldY: number): void {
    this.x = worldX;
    this.y = worldY;
  }

  getState(): CameraState {
    return { x: this.x, y: this.y, zoom: this.zoom };
  }
}
