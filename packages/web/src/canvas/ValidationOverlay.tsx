import React, { useEffect, useRef } from 'react';
import type { HexCoord } from '@hex/engine';
import { coordToKey } from '@hex/engine';
import type { Camera } from './Camera';
import { hexToPixel } from './HexRenderer';

interface InvalidHexMarker {
  coord: HexCoord;
  reason: string;
  timestamp: number;
}

interface ValidationOverlayProps {
  camera: Camera;
  invalidHexes: InvalidHexMarker[];
  onClear?: () => void;
}

/**
 * ValidationOverlay draws visual indicators on the canvas for invalid action targets.
 * Shows red hex outlines with X markers and floating reason text.
 */
export function ValidationOverlay({ camera, invalidHexes, onClear }: ValidationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      const age = (timestamp: number) => (now - timestamp) / 1000; // seconds

      // Draw invalid hex markers
      for (const invalidHex of invalidHexes) {
        const markerAge = age(invalidHex.timestamp);

        // Fade out after 2 seconds
        if (markerAge > 2) continue;

        const opacity = Math.max(0, 1 - markerAge / 2);

        // Convert hex to screen coordinates
        const { x, y } = hexToPixel(invalidHex.coord);
        const screen = camera.worldToScreen(x, y);

        // Skip if off-screen
        if (screen.x < -50 || screen.x > width + 50 || screen.y < -50 || screen.y > height + 50) {
          continue;
        }

        // Draw red hex outline
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.scale(camera.zoom, camera.zoom);

        // Draw hexagon outline
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = 30 * Math.cos(angle);
          const hy = 30 * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(hx, hy);
          } else {
            ctx.lineTo(hx, hy);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(244, 67, 54, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw X in center
        ctx.beginPath();
        const size = 10;
        ctx.moveTo(-size, -size);
        ctx.lineTo(size, size);
        ctx.moveTo(size, -size);
        ctx.lineTo(-size, size);
        ctx.strokeStyle = `rgba(244, 67, 54, ${opacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();

        // Draw floating text (not scaled by zoom)
        ctx.save();
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(244, 67, 54, ${opacity})`;
        ctx.fillText(invalidHex.reason, screen.x, screen.y - 40 * camera.zoom);
        ctx.restore();
      }

      // Auto-clear when all markers expired
      if (invalidHexes.length > 0 && invalidHexes.every(h => age(h.timestamp) > 2)) {
        onClear?.();
      }

      requestAnimationFrame(render);
    };

    const animFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrame);
  }, [camera, invalidHexes, onClear]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 30 }}
    />
  );
}
