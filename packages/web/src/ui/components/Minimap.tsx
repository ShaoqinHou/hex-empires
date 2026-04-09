import { useRef, useEffect } from 'react';
import { useGame } from '../../providers/GameProvider';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 130;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, terrainRegistry } = useGame();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = state.map;
    const scaleX = MINIMAP_WIDTH / width;
    const scaleY = MINIMAP_HEIGHT / height;

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw terrain
    for (const tile of state.map.tiles.values()) {
      const terrain = terrainRegistry.get(tile.terrain);
      if (!terrain) continue;

      // Convert axial to offset for minimap positioning
      const col = tile.coord.q + Math.floor(tile.coord.r / 2);
      const row = tile.coord.r;

      if (col >= 0 && col < width && row >= 0 && row < height) {
        ctx.fillStyle = terrain.color;
        ctx.fillRect(col * scaleX, row * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    // Draw cities
    const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835'];
    const playerIds = [...state.players.keys()];
    for (const city of state.cities.values()) {
      const col = city.position.q + Math.floor(city.position.r / 2);
      const row = city.position.r;
      const pi = playerIds.indexOf(city.owner);
      ctx.fillStyle = playerColors[pi % playerColors.length];
      ctx.fillRect(col * scaleX - 2, row * scaleY - 2, 4, 4);
    }

    // Draw units
    for (const unit of state.units.values()) {
      const col = unit.position.q + Math.floor(unit.position.r / 2);
      const row = unit.position.r;
      const pi = playerIds.indexOf(unit.owner);
      ctx.fillStyle = playerColors[pi % playerColors.length];
      ctx.beginPath();
      ctx.arc(col * scaleX, row * scaleY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [state, terrainRegistry]);

  return (
    <div className="absolute bottom-16 left-2 rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)' }}>
      <canvas ref={canvasRef} width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} />
    </div>
  );
}
