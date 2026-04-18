import { useGameState } from '../../providers/GameProvider';
import type { CrisisState } from '@hex/engine';
import { DramaModal } from './DramaModal';
import type { DramaChoice } from './DramaModal';

interface CrisisPanelProps {
  readonly onResolve: () => void;
}

export function CrisisPanel({ onResolve }: CrisisPanelProps) {
  const { state, dispatch } = useGameState();
  const activeCrisis: CrisisState | undefined = state.crises.find(c => c.active);

  // Safety guard: if the panel is rendered but no active crisis exists
  // (e.g. state updated between the useEffect and render), render nothing.
  if (!activeCrisis) return null;

  const handleChoice = (choiceId: string) => {
    dispatch({ type: 'RESOLVE_CRISIS', crisisId: activeCrisis.id, choice: choiceId });
    // Close the panel after resolution — the engine will clear the active
    // crisis; the useEffect in App.tsx will not re-open since the list is
    // now empty.
    onResolve();
  };

  // Map choices to DramaChoice[] — all secondary tone (player picks one option).
  const dramaChoices: ReadonlyArray<DramaChoice> = activeCrisis.choices.map(c => ({
    id: c.id,
    label: c.text,
    tone: 'secondary' as const,
    onSelect: () => handleChoice(c.id),
  }));

  // Hero glyph — picks a contextual emoji per crisis id.
  const heroGlyph = getCrisisGlyph(activeCrisis.id);
  const heroNode = (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '80px', lineHeight: 1.1 }}>{heroGlyph}</div>
    </div>
  );

  // Body — flavor description text.
  const bodyNode = (
    <p style={{ color: 'var(--panel-muted-color)', lineHeight: 1.6 }}>
      {getDescription(activeCrisis.id)}
    </p>
  );

  return (
    <DramaModal
      id="crisis"
      title={activeCrisis.name}
      subtitle={`Turn ${activeCrisis.turn}`}
      hero={heroNode}
      body={bodyNode}
      choices={dramaChoices}
      onResolve={onResolve}
      tone="crisis"
    />
  );
}

/** Pick a contextual glyph for a known crisis id */
function getCrisisGlyph(crisisId: string): string {
  const glyphs: Record<string, string> = {
    plague:            '🦠',
    barbarian_invasion:'⚔️',
    golden_age:        '✨',
    trade_opportunity: '🤝',
    natural_disaster:  '🌊',
  };
  return glyphs[crisisId] ?? '⚠️';
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
