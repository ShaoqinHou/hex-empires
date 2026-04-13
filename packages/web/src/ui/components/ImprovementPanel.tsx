import { useGameState } from '../../providers/GameProvider';
import { coordToKey } from '@hex/engine';
import { ALL_IMPROVEMENTS } from '@hex/engine';
import type { ImprovementDef } from '@hex/engine';
import { useState, useMemo } from 'react';

interface ImprovementPanelProps {
  builderUnitId: string;
  onClose: () => void;
}

export function ImprovementPanel({ builderUnitId, onClose }: ImprovementPanelProps) {
  const { state, dispatch, selectedHex } = useGameState();
  const [selectedImprovement, setSelectedImprovement] = useState<string | null>(null);

  const builder = state.units.get(builderUnitId);
  const currentTile = selectedHex ? state.map.tiles.get(coordToKey(selectedHex)) : null;

  // Filter improvements that can be built on this tile
  const availableImprovements = useMemo(() => {
    if (!currentTile || !builder || !selectedHex) return [];

    const player = state.players.get(state.currentPlayerId);
    if (!player) return [];

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
  }, [currentTile, builder, state, state.currentPlayerId]);

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

  if (!builder || !currentTile) {
    return (
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-2xl p-6 z-50"
        style={{
          backgroundColor: 'var(--color-panel-bg)',
          border: '2px solid var(--color-border)',
          minWidth: '400px',
        }}
      >
        <div className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
          Build Improvement
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          No tile selected
        </div>
        <button
          className="mt-4 px-4 py-2 rounded text-sm font-bold cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, var(--color-text-muted) 0%, #6e7681 100%)',
            color: '#0d1117',
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-2xl p-6 z-50"
      style={{
        backgroundColor: 'var(--color-panel-bg)',
        border: '2px solid var(--color-border)',
        minWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            🏗️ Build Improvement
          </div>
          {selectedHex && (
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Location: ({selectedHex.q}, {selectedHex.r})
            </div>
          )}
        </div>
        <button
          className="text-2xl font-bold cursor-pointer hover:scale-110 transition-transform"
          style={{ color: 'var(--color-text-muted)' }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>

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
          <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
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

      <button
        className="mt-4 px-4 py-2 rounded text-sm font-bold cursor-pointer w-full"
        style={{
          background: 'linear-gradient(135deg, var(--color-text-muted) 0%, #6e7681 100%)',
          color: '#0d1117',
        }}
        onClick={onClose}
      >
        Cancel
      </button>
    </div>
  );
}

function ImprovementCard({ improvement, onBuild }: { improvement: any; onBuild: () => void }) {
  const getYieldDisplay = () => {
    const yields = [];
    if (improvement.yields.food) yields.push(`🌾 +${improvement.yields.food}`);
    if (improvement.yields.production) yields.push(`🔨 +${improvement.yields.production}`);
    if (improvement.yields.gold) yields.push(`💰 +${improvement.yields.gold}`);
    if (improvement.yields.science) yields.push(`🔬 +${improvement.yields.science}`);
    if (improvement.yields.culture) yields.push(`🎭 +${improvement.yields.culture}`);
    if (improvement.yields.faith) yields.push(`🙏 +${improvement.yields.faith}`);
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
            <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
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

          <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
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
          className="px-3 py-1.5 rounded text-xs font-bold transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            color: '#0d1117',
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
