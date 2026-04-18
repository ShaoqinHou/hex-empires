import { useGameState } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';
import { TreeView } from './TreeView';

interface CivicTreePanelProps {
  readonly onClose: () => void;
}

export function CivicTreePanel({ onClose }: CivicTreePanelProps) {
  const { state, dispatch } = useGameState();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const civics = [...state.config.civics.values()]
    .filter(c => c.age === player.age);

  const ageLabel = player.age.charAt(0).toUpperCase() + player.age.slice(1);

  return (
    <PanelShell id="civics" title={`${ageLabel} Age Civic Tree`} onClose={onClose} priority="overlay" width="full">
      <TreeView
        items={civics}
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
