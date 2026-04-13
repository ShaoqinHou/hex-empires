import { useGameState } from '../../providers/GameProvider';
import { coordToKey } from '@hex/engine';
import type { YieldSet } from '@hex/engine';
import { ALL_IMPROVEMENTS } from '@hex/engine';
import { useMemo } from 'react';

export function BottomBar() {
  const { selectedUnit, selectedHex, state, dispatch, terrainRegistry, featureRegistry, unitRegistry } = useGameState();

  const canFoundCity = selectedUnit
    ? state.config.units.get(selectedUnit.typeId)?.abilities.includes('found_city') ?? false
    : false;
  const isCivilian = selectedUnit
    ? state.config.units.get(selectedUnit.typeId)?.category === 'civilian'
    : false;

  // Check if selected unit is a builder and show improvement hints
  const isBuilder = selectedUnit
    ? state.config.units.get(selectedUnit.typeId)?.abilities.includes('build_improvement') ?? false
    : false;

  // Calculate available improvements for selected tile
  const availableImprovements = useMemo(() => {
    if (!isBuilder || !selectedHex) return [];

    const player = state.players.get(state.currentPlayerId);
    if (!player) return [];

    const tileKey = coordToKey(selectedHex);
    const currentTile = state.map.tiles.get(tileKey);
    if (!currentTile) return [];

    return ALL_IMPROVEMENTS.filter(improvement => {
      // Check tech prerequisite
      if (improvement.requiredTech && !player.researchedTechs.includes(improvement.requiredTech)) {
        return false;
      }

      // Check terrain prerequisite
      if (improvement.prerequisites.terrain) {
        if (!improvement.prerequisites.terrain.includes(currentTile.terrain)) {
          return false;
        }
      }

      // Check feature prerequisite
      if (improvement.prerequisites.feature) {
        if (!currentTile.feature || !improvement.prerequisites.feature.includes(currentTile.feature)) {
          return false;
        }
      }

      // Check resource prerequisite
      if (improvement.prerequisites.resource) {
        if (!currentTile.resource || !improvement.prerequisites.resource.includes(currentTile.resource)) {
          return false;
        }
      }

      // Check if improvement already exists
      if (currentTile.improvement) {
        return false;
      }

      return true;
    });
  }, [isBuilder, selectedHex, state, state.currentPlayerId]);

  return (
    <div className="h-16 flex items-center px-4 gap-4 select-none"
      style={{
        background: 'linear-gradient(0deg, var(--color-bg) 0%, var(--color-surface) 100%)',
        borderTop: '2px solid var(--color-border)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.3)',
        zIndex: 100
      }}>
      {/* Selected unit info */}
      {selectedUnit && (
        <div className="flex items-center gap-3 flex-1">
          <div
            className="px-3 py-1.5 rounded"
            style={{
              background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.1) 0%, rgba(88, 166, 255, 0.05) 100%)',
              border: '1px solid rgba(88, 166, 255, 0.3)',
            }}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {unitRegistry.get(selectedUnit.typeId)?.name ?? selectedUnit.typeId}
              </span>
              <div className="flex gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>❤️ <span style={{ color: selectedUnit.health > 66 ? 'var(--color-health-high)' : 'var(--color-health-low)' }}>{selectedUnit.health}</span>/100</span>
                <span>🚀 <span style={{ color: selectedUnit.movementLeft > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>{selectedUnit.movementLeft}</span></span>
                {selectedUnit.fortified && <span>🛡️ Fortified</span>}
                {selectedUnit.experience > 0 && <span>⭐ XP: {selectedUnit.experience}</span>}
              </div>
            </div>
          </div>

          {/* Combat stats */}
          {!isCivilian && (
            <div
              className="text-xs px-3 py-1.5 rounded font-mono"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                color: 'var(--color-text-muted)'
              }}
            >
              {(() => {
                const def = unitRegistry.get(selectedUnit.typeId);
                if (!def) return null;
                return (
                  <>
                    <span style={{ color: 'var(--color-production)' }}>⚔️ {def.combat}</span>
                    {def.rangedCombat > 0 && <span style={{ color: 'var(--color-science)' }}> | 🎯 {def.rangedCombat} ({def.range})</span>}
                  </>
                );
              })()}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 ml-auto">
            {canFoundCity && (
              <ActionButton
                label="Found City"
                shortcut="B"
                color="var(--color-food)"
                icon="🏰"
                onClick={() => {
                  const name = `City ${state.cities.size + 1}`;
                  dispatch({ type: 'FOUND_CITY', unitId: selectedUnit.id, name });
                }}
              />
            )}
            {!isCivilian && selectedUnit.movementLeft > 0 && (
              <ActionButton
                label={selectedUnit.fortified ? 'Unfortify' : 'Fortify'}
                shortcut="F"
                color="var(--color-science)"
                icon="🛡️"
                onClick={() => {
                  dispatch({ type: 'FORTIFY_UNIT', unitId: selectedUnit.id });
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Selected hex info with yields */}
      {selectedHex && !selectedUnit && (
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            ({selectedHex.q}, {selectedHex.r})
          </span>
          {(() => {
            const tile = state.map.tiles.get(coordToKey(selectedHex));
            if (!tile) return null;
            const terrain = terrainRegistry.get(tile.terrain);
            const feature = tile.feature ? featureRegistry.get(tile.feature) : null;
            return (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {terrain?.name}{feature ? ` + ${feature.name}` : ''}
                </span>
                {terrain && <YieldDisplay yields={terrain.baseYields} />}
                {tile.river.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--color-science)' }}>River (+1 gold)</span>
                )}
                {terrain && (
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Move: {terrain.movementCost}{feature ? `+${feature.movementCostModifier}` : ''}
                    {terrain.defenseBonus > 0 && ` | Def: +${Math.round(terrain.defenseBonus * 100)}%`}
                    {feature && feature.defenseBonusModifier !== 0 && ` | Def: ${feature.defenseBonusModifier > 0 ? '+' : ''}${Math.round(feature.defenseBonusModifier * 100)}%`}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Builder improvement hints */}
      {isBuilder && selectedHex && availableImprovements.length > 0 && (
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded"
          style={{
            background: 'linear-gradient(135deg, rgba(124, 252, 0, 0.1) 0%, rgba(124, 252, 0, 0.05) 100%)',
            border: '1px solid rgba(124, 252, 0, 0.3)',
          }}
        >
          <span style={{ color: 'var(--color-accent)' }}>🏗️ Can build:</span>
          {availableImprovements.slice(0, 3).map(imp => (
            <span
              key={imp.id}
              className="px-2 py-0.5 rounded font-semibold"
              style={{
                background: 'rgba(124, 252, 0, 0.1)',
                color: 'var(--color-text)',
                border: '1px solid rgba(124, 252, 0, 0.2)',
              }}
            >
              {imp.name}
            </span>
          ))}
          {availableImprovements.length > 3 && (
            <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
              +{availableImprovements.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Instructions with shortcuts */}
      {!selectedUnit && !selectedHex && (
        <div className="flex items-center gap-4 text-xs px-3 py-1.5 rounded" style={{
          color: 'var(--color-text-muted)',
          background: 'rgba(139, 148, 158, 0.1)',
          border: '1px solid rgba(139, 148, 158, 0.2)'
        }}>
          <span style={{ color: 'var(--color-accent)' }}>🖱️ Click unit to select</span>
          <span style={{ color: 'var(--color-accent)' }}>🟦 Click blue hex to move</span>
          <span style={{ color: 'var(--color-production)' }}>⚔️ Click enemy to attack</span>
          <span className="opacity-60">| WASD/Arrows: pan | Scroll: zoom | Enter: end turn | Space: next unit</span>
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, shortcut, color, icon, textColor, onClick }: {
  label: string;
  shortcut: string;
  color: string;
  icon?: string;
  textColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="px-3 py-1.5 text-xs rounded font-bold cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        color: textColor ?? '#0d1117',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      }}
      onClick={onClick}
    >
      {icon && <span>{icon}</span>}
      {label}
      <span
        className="text-[10px] px-1.5 py-0.5 rounded ml-1"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          fontWeight: 'normal',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        [{shortcut}]
      </span>
    </button>
  );
}

function YieldDisplay({ yields }: { yields: Partial<YieldSet> }) {
  const items = [
    { key: 'food', value: yields.food, color: 'var(--color-food)' },
    { key: 'production', value: yields.production, color: 'var(--color-production)' },
    { key: 'gold', value: yields.gold, color: 'var(--color-gold)' },
    { key: 'science', value: yields.science, color: 'var(--color-science)' },
    { key: 'culture', value: yields.culture, color: 'var(--color-culture)' },
    { key: 'faith', value: yields.faith, color: 'var(--color-faith)' },
  ].filter(i => i.value && i.value > 0);

  return (
    <div className="flex items-center gap-1.5">
      {items.map(i => (
        <span key={i.key} className="flex items-center gap-0.5 text-xs">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i.color }} />
          <span style={{ color: i.color }}>{i.value}</span>
        </span>
      ))}
    </div>
  );
}
