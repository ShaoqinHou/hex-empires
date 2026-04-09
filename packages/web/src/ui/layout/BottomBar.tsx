import { useGame } from '../../providers/GameProvider';
import { coordToKey } from '@hex/engine';

export function BottomBar() {
  const { selectedUnit, selectedHex, state, dispatch, terrainRegistry, featureRegistry, unitRegistry } = useGame();

  const isSettler = selectedUnit?.typeId === 'settler';

  return (
    <div className="h-14 flex items-center px-4 gap-6 select-none"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}>
      {/* Selected unit info */}
      {selectedUnit && (
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              {unitRegistry.get(selectedUnit.typeId)?.name ?? selectedUnit.typeId}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              HP: {selectedUnit.health}/100 | Move: {selectedUnit.movementLeft}
              {selectedUnit.fortified ? ' | Fortified' : ''}
            </span>
          </div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {(() => {
              const def = unitRegistry.get(selectedUnit.typeId);
              if (!def) return null;
              return (
                <span>
                  Str: {def.combat}
                  {def.rangedCombat > 0 ? ` | Ranged: ${def.rangedCombat} (${def.range})` : ''}
                </span>
              );
            })()}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 ml-4">
            {isSettler && (
              <button
                className="px-3 py-1 text-xs rounded font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--color-food)', color: 'var(--color-bg)' }}
                onClick={() => {
                  const name = `City ${state.cities.size + 1}`;
                  dispatch({ type: 'FOUND_CITY', unitId: selectedUnit.id, name });
                }}
              >
                Found City
              </button>
            )}
            {!isSettler && selectedUnit.movementLeft > 0 && (
              <button
                className="px-3 py-1 text-xs rounded cursor-pointer"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                onClick={() => dispatch({ type: 'FORTIFY_UNIT', unitId: selectedUnit.id })}
              >
                Fortify
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected hex info */}
      {selectedHex && !selectedUnit && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            ({selectedHex.q}, {selectedHex.r})
          </span>
          {(() => {
            const tile = state.map.tiles.get(coordToKey(selectedHex));
            if (!tile) return null;
            const terrain = terrainRegistry.get(tile.terrain);
            const feature = tile.feature ? featureRegistry.get(tile.feature) : null;
            return (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {terrain?.name}{feature ? ` + ${feature.name}` : ''}
                {tile.river.length > 0 ? ' | River' : ''}
              </span>
            );
          })()}
        </div>
      )}

      {/* Instructions */}
      {!selectedUnit && !selectedHex && (
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Click a unit to select, then click a blue hex to move. Click a city to manage. Drag to pan, scroll to zoom.
        </span>
      )}
    </div>
  );
}
