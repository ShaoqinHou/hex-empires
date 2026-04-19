/**
 * NarrativeEventPanel — presents pending narrative events (W3-05).
 *
 * F-07 stub: uses DramaModal for narrative ceremony shape (no-close modal,
 * hero glyph per category, vignette text, choice buttons).
 *
 * Full polish (illustrations, audio, detailed effect previews) is deferred.
 * Registration: panelRegistry id = 'narrativeEvent', priority = 'modal'.
 */

import { useGameState } from '../../providers/GameProvider';
import { DramaModal } from './DramaModal';
import type { DramaChoice } from './DramaModal';

interface NarrativeEventPanelProps {
  readonly onResolve: () => void;
}

/** Return a hero glyph for the event category. */
function getCategoryGlyph(category: string): string {
  switch (category) {
    case 'discovery':  return '🗺️';
    case 'diplomacy':  return '🕊️';
    case 'battle':     return '⚔️';
    case 'religion':   return '⛩️';
    default:           return '📜';
  }
}

export function NarrativeEventPanel({ onResolve }: NarrativeEventPanelProps) {
  const { state, dispatch } = useGameState();

  // Surface the first pending event
  const queue = state.pendingNarrativeEvents ?? [];
  const eventId = queue[0];

  const def = eventId ? state.config.narrativeEvents?.get(eventId) : undefined;

  // Safety guard: if nothing is pending, render nothing
  if (!def) return null;

  const handleChoice = (choiceIndex: number) => {
    dispatch({ type: 'RESOLVE_NARRATIVE_EVENT', eventId: def.id, choiceIndex });
    // Close panel if no more events in queue after this one
    if (queue.length <= 1) {
      onResolve();
    }
  };

  const dramaChoices: ReadonlyArray<DramaChoice> = def.choices.map((c, i) => ({
    id: `choice-${i}`,
    label: c.label,
    tone: 'secondary' as const,
    onSelect: () => handleChoice(i),
  }));

  const heroGlyph = getCategoryGlyph(def.category);
  const heroNode = (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '80px', lineHeight: 1.1 }}>{heroGlyph}</div>
    </div>
  );

  const bodyNode = (
    <p style={{ color: 'var(--panel-muted-color)', lineHeight: 1.6 }}>
      {def.vignette}
    </p>
  );

  return (
    <DramaModal
      id="narrativeEvent"
      title={def.title}
      hero={heroNode}
      body={bodyNode}
      choices={dramaChoices}
      onResolve={onResolve}
      tone="passage"
    />
  );
}
