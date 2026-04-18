/**
 * ImprovementPanel — build-improvement chooser for a selected builder unit.
 *
 * Migrated from `ui/components/ImprovementPanel.tsx` in the panel-cleanup
 * cycle. Now wraps `PanelShell`, drops its hand-rolled fixed-center
 * positioning and raw-hex chrome, and opens via `usePanelManager()` rather
 * than a local `useState<boolean>` in `GameCanvas`. Registered as
 * `'improvement'` in `panelRegistry.ts`.
 */

import { useMemo } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { coordToKey } from '@hex/engine';
import type { ImprovementDef } from '@hex/engine';
import { PanelShell } from './PanelShell';

interface ImprovementPanelProps {
  readonly builderUnitId: string;
  readonly onClose: () => void;
}

export function ImprovementPanel({ builderUnitId, onClose }: ImprovementPanelProps) {
  const { state, dispatch, selectedHex } = useGameState();

  const builder = state.units.get(builderUnitId);
  const currentTile = selectedHex ? state.map.tiles.get(coordToKey(selectedHex)) : null;

  // Filter improvements that can be built on this tile.
  const availableImprovements = useMemo<ReadonlyArray<ImprovementDef>>(() => {
    if (!currentTile || !builder || !selectedHex) return [];

    const player = state.players.get(state.currentPlayerId);
    if (!player) return [];

    return [...state.config.improvements.values()].filter(improvement => {
      if (improvement.requiredTech && !player.researchedTechs.includes(improvement.requiredTech)) {
        return false;
      }
      if (improvement.prerequisites.terrain) {
        if (!improvement.prerequisites.terrain.includes(currentTile.terrain)) return false;
      }
      if (improvement.prerequisites.feature) {
        if (!currentTile.feature || !improvement.prerequisites.feature.includes(currentTile.feature)) {
          return false;
        }
      }
      if (improvement.prerequisites.resource) {
        if (!currentTile.resource || !improvement.prerequisites.resource.includes(currentTile.resource)) {
          return false;
        }
      }
      if (currentTile.improvement) return false;
      return true;
    });
  }, [currentTile, builder, selectedHex, state]);

  const handleBuildImprovement = (improvementId: string) => {
    if (!selectedHex) return;
    dispatch({
      type: 'BUILD_IMPROVEMENT',
      unitId: builderUnitId,
      tile: selectedHex,
      improvementId,
    });
    onClose();
  };

  // No builder / no tile selected — render empty-state inside the shell so
  // ESC, close button, and chrome still behave.
  if (!builder || !currentTile) {
    return (
      <PanelShell id="improvement" title="Build Improvement" onClose={onClose} priority="overlay" width="wide">
        <div style={{ color: 'var(--panel-muted-color)', fontSize: '13px' }}>
          No tile selected
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell id="improvement" title="Build Improvement" onClose={onClose} priority="overlay" width="wide">
      {selectedHex && (
        <div style={{ color: 'var(--panel-muted-color)', fontSize: '12px', marginBottom: 'var(--panel-padding-md)' }}>
          Location: ({selectedHex.q}, {selectedHex.r})
        </div>
      )}

      {currentTile.improvement ? (
        <div
          className="p-4 rounded mb-4"
          style={{
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
          }}
        >
          <div className="text-sm font-bold" style={{ color: 'var(--color-health-low)' }}>
            ⚠️ This tile already has an improvement
          </div>
        </div>
      ) : availableImprovements.length === 0 ? (
        <div
          className="p-4 rounded mb-4"
          style={{
            backgroundColor: 'rgba(255, 213, 79, 0.1)',
            border: '1px solid rgba(255, 213, 79, 0.3)',
          }}
        >
          <div className="text-sm" style={{ color: 'var(--color-gold)' }}>
            ℹ️ No improvements can be built on this tile
          </div>
          <div className="text-xs mt-2" style={{ color: 'var(--panel-muted-color)' }}>
            Requirements: Check terrain, features, resources, and technologies
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {availableImprovements.map(improvement => (
            <ImprovementCard
              key={improvement.id}
              improvement={improvement}
              onBuild={() => handleBuildImprovement(improvement.id)}
            />
          ))}
        </div>
      )}
    </PanelShell>
  );
}

interface ImprovementCardProps {
  readonly improvement: ImprovementDef;
  readonly onBuild: () => void;
}

function ImprovementCard({ improvement, onBuild }: ImprovementCardProps) {
  const getYieldDisplay = (): string => {
    const yields: string[] = [];
    const y = improvement.yields;
    if (y.food)       yields.push(`🌾 +${y.food}`);
    if (y.production) yields.push(`🔨 +${y.production}`);
    if (y.gold)       yields.push(`💰 +${y.gold}`);
    if (y.science)    yields.push(`🔬 +${y.science}`);
    if (y.culture)    yields.push(`🎭 +${y.culture}`);
    if (y.faith)      yields.push(`🙏 +${y.faith}`);
    return yields.join(' ');
  };

  return (
    <div
      className="p-3 rounded cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        background: 'linear-gradient(135deg, rgba(88, 166, 255, 0.05) 0%, rgba(88, 166, 255, 0.02) 100%)',
        border: '1px solid rgba(88, 166, 255, 0.2)',
      }}
      onClick={onBuild}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: 'var(--panel-text-color)' }}>
              {improvement.name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(88, 166, 255, 0.1)',
                color: 'var(--color-accent)',
                border: '1px solid rgba(88, 166, 255, 0.3)',
              }}
            >
              {improvement.cost} charge{improvement.cost !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="text-xs mt-2" style={{ color: 'var(--panel-muted-color)' }}>
            {getYieldDisplay()}
          </div>

          {improvement.modifier.defense && (
            <div className="text-xs mt-1" style={{ color: 'var(--color-production)' }}>
              🛡️ +{Math.round(improvement.modifier.defense * 100)}% Defense
            </div>
          )}
          {improvement.modifier.movement && (
            <div className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
              🚀 {improvement.modifier.movement > 0 ? '+' : ''}{improvement.modifier.movement} Movement
            </div>
          )}
        </div>

        <button
          type="button"
          className="px-3 py-1.5 rounded text-xs font-bold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            color: 'var(--panel-bg)',
            border: '1px solid rgba(88, 166, 255, 0.3)',
            boxShadow: '0 2px 4px rgba(88, 166, 255, 0.2)',
          }}
        >
          Build
        </button>
      </div>
    </div>
  );
}
