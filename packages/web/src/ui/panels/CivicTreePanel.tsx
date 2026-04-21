import { useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';
import { TreeView } from './TreeView';

type CivicTab = 'shared' | 'unique';

interface CivicTreePanelProps {
  readonly onClose: () => void;
}

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: 'var(--panel-padding-sm) var(--panel-padding-md)',
  border: 'none',
  borderBottom: active ? '2px solid var(--color-culture)' : '2px solid transparent',
  background: 'none',
  color: active ? 'var(--panel-text-color)' : 'var(--panel-muted-color)',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: active ? 600 : 400,
});

export function CivicTreePanel({ onClose }: CivicTreePanelProps) {
  const { state, dispatch } = useGameState();
  const [tab, setTab] = useState<CivicTab>('shared');
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const allAgeCivics = [...state.config.civics.values()]
    .filter(c => c.age === player.age);

  const sharedCivics = allAgeCivics.filter(c => c.civId === undefined);
  const uniqueCivics = allAgeCivics.filter(c => c.civId === player.civilizationId);

  const activeCivics = tab === 'shared' ? sharedCivics : uniqueCivics;
  const hasUnique = uniqueCivics.length > 0;

  const ageLabel = player.age.charAt(0).toUpperCase() + player.age.slice(1);

  return (
    <PanelShell id="civics" title={`${ageLabel} Age Civic Tree`} onClose={onClose} priority="overlay" width="full">
      {hasUnique && (
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--panel-border)', marginBottom: 'var(--panel-padding-sm)' }}>
          <button
            style={TAB_STYLE(tab === 'shared')}
            onClick={() => setTab('shared')}
            data-testid="civic-tab-shared"
          >
            Shared
          </button>
          <button
            style={TAB_STYLE(tab === 'unique')}
            onClick={() => setTab('unique')}
            data-testid="civic-tab-unique"
          >
            {player.civilizationId}
          </button>
        </div>
      )}
      <TreeView
        items={activeCivics}
        researchedIds={new Set(player.researchedCivics)}
        activeId={player.currentCivic}
        activeProgress={player.civicProgress}
        accentColor="var(--color-culture)"
        costIcon="🎭"
        onSelect={(civicId) => dispatch({ type: 'SET_CIVIC', civicId })}
      />
    </PanelShell>
  );
}
