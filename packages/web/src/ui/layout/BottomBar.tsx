import { useGame } from '../../providers/GameProvider';
import { coordToKey } from '@hex/engine';
import type { YieldSet } from '@hex/engine';

export function BottomBar() {
  const { selectedUnit, selectedHex, state, dispatch, terrainRegistry, featureRegistry, unitRegistry } = useGame();

  const isSettler = selectedUnit?.typeId === 'settler';
  const isCivilian = selectedUnit
    ? state.config.units.get(selectedUnit.typeId)?.category === 'civilian'
    : false;

  return (
    <div className="h-16 flex items-center px-4 gap-4 select-none"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
      }}>
      {/* Selected unit info */}
      {selectedUnit && (
        <div className="flex items-center gap-3 flex-1">
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              {unitRegistry.get(selectedUnit.typeId)?.name ?? selectedUnit.typeId}
            </span>
            <div className="flex gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>HP: <span style={{ color: selectedUnit.health > 66 ? 'var(--color-health-high)' : 'var(--color-health-low)' }}>{selectedUnit.health}</span>/100</span>
              <span>Move: <span style={{ color: selectedUnit.movementLeft > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>{selectedUnit.movementLeft}</span></span>
              {selectedUnit.fortified && <span style={{ color: 'var(--color-science)' }}>Fortified</span>}
              {selectedUnit.experience > 0 && <span>XP: {selectedUnit.experience}</span>}
            </div>
          </div>

          {/* Combat stats */}
          {!isCivilian && (
            <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
              {(() => {
                const def = unitRegistry.get(selectedUnit.typeId);
                if (!def) return null;
                return (
                  <>
                    <span style={{ color: 'var(--color-production)' }}>Str {def.combat}</span>
                    {def.rangedCombat > 0 && <span style={{ color: 'var(--color-science)' }}> | Rng {def.rangedCombat} ({def.range})</span>}
                  </>
                );
              })()}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-1.5 ml-auto">
            {isSettler && (
              <ActionButton
                label="Found City"
                shortcut="B"
                color="var(--color-food)"
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
                color="var(--color-bg)"
                textColor="var(--color-text-muted)"
                onClick={() => dispatch({ type: 'FORTIFY_UNIT', unitId: selectedUnit.id })}
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

      {/* Instructions with shortcuts */}
      {!selectedUnit && !selectedHex && (
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>Click unit to select | Click blue hex to move | Click enemy to attack</span>
          <span className="opacity-60">WASD/Arrows: pan | Scroll: zoom | Enter: end turn | T: tech | Space: next unit</span>
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, shortcut, color, textColor, onClick }: {
  label: string;
  shortcut: string;
  color: string;
  textColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="px-3 py-1 text-xs rounded font-bold cursor-pointer flex items-center gap-1"
      style={{ backgroundColor: color, color: textColor ?? 'var(--color-bg)' }}
      onClick={onClick}
    >
      {label}
      <span className="opacity-50 text-[10px]">[{shortcut}]</span>
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
