import { useGameState } from '../../providers/GameProvider';
import type { CrisisState } from '@hex/engine';
import { PanelShell } from './PanelShell';

export function CrisisPanel() {
  const { state, dispatch } = useGameState();

  // Find the first active (unresolved) crisis
  const activeCrisis: CrisisState | undefined = state.crises.find(c => c.active);

  if (!activeCrisis) return null;

  const handleChoice = (choiceId: string) => {
    dispatch({ type: 'RESOLVE_CRISIS', crisisId: activeCrisis.id, choice: choiceId });
  };

  // Crises must be resolved by picking a choice — there is no plain
  // dismissal. The shell still requires an `onClose`, so we pass a no-op.
  // Clicking the X / backdrop does nothing; only choice buttons advance.
  const handleClose = () => {
    /* no-op: crises require an explicit choice */
  };

  return (
    <PanelShell id="crisis" title={activeCrisis.name} onClose={handleClose} priority="modal">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-gold)' }}>
          {activeCrisis.name}
        </h1>

        <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {/* Use the name as a proxy; full description is in the def.
              We store the crisis name in CrisisState. The description from the def
              is used during creation — for the panel we show the choices. */}
          {getDescription(activeCrisis.id)}
        </p>

        <div className="space-y-3">
          {activeCrisis.choices.map(choice => (
            <button
              key={choice.id}
              className="w-full px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors text-left"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
              onClick={() => handleChoice(choice.id)}
            >
              {choice.text}
            </button>
          ))}
        </div>

        <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
          Turn {activeCrisis.turn}
        </p>
      </div>
    </PanelShell>
  );
}

/** Get description for a known crisis id */
function getDescription(crisisId: string): string {
  const descriptions: Record<string, string> = {
    plague: 'A devastating plague sweeps across your empire, threatening the lives of your citizens. Your advisors urge immediate action.',
    barbarian_invasion: 'Barbarian hordes have been spotted near your borders. They demand tribute or they will attack!',
    golden_age: 'Your civilization has achieved great intellectual progress! Scholars and artists flock to your cities. How will you harness this momentum?',
    trade_opportunity: 'A wealthy foreign trade caravan has arrived at your borders, offering valuable goods in exchange for passage and hospitality.',
    natural_disaster: 'Earthquakes and floods threaten your empire! Your people look to you for guidance in this time of crisis.',
  };
  return descriptions[crisisId] ?? 'A crisis requires your attention.';
}
