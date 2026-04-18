import { useGameState } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';
import { TreeView } from './TreeView';

interface TechTreePanelProps {
  readonly onClose: () => void;
}

export function TechTreePanel({ onClose }: TechTreePanelProps) {
  const { state, dispatch } = useGameState();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const techs = [...state.config.technologies.values()]
    .filter(t => t.age === player.age);

  const ageLabel = player.age.charAt(0).toUpperCase() + player.age.slice(1);

  return (
    <PanelShell id="tech" title={`${ageLabel} Age Technology Tree`} onClose={onClose} priority="overlay" width="full">
      <TreeView
        items={techs}
        researchedIds={new Set(player.researchedTechs)}
        activeId={player.currentResearch}
        activeProgress={player.researchProgress}
        accentColor="var(--color-science)"
        costIcon="⚗"
        onSelect={(techId) => dispatch({ type: 'SET_RESEARCH', techId })}
      />
    </PanelShell>
  );
}
