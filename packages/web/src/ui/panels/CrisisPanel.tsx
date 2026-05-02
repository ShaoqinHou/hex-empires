/**
 * CrisisPanel — persistent 3-stage slot-filling panel (F-06).
 *
 * Wraps PanelShell with priority="modal". Stays open while the current
 * player's crisisPhase is stage1 / stage2 / stage3. The close button is
 * disabled until the player has filled all required policy slots; once
 * filled, the panel auto-closes on the next render (engine sets
 * crisisPhase to 'resolved' after END_TURN).
 *
 * Policy cards come from `state.config.policies`. On click, the panel
 * dispatches FORCE_CRISIS_POLICY.
 */

import type { CSSProperties } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';

interface CrisisPanelProps {
  readonly onClose: () => void;
}

/** Stage → human-readable label + numeric index */
const STAGE_META: Record<string, { readonly label: string; readonly index: number }> = {
  stage1: { label: 'Stage 1', index: 1 },
  stage2: { label: 'Stage 2', index: 2 },
  stage3: { label: 'Stage 3', index: 3 },
};

export function CrisisPanel({ onClose }: CrisisPanelProps) {
  const { state, dispatch } = useGameState();

  const player = state.players.get(state.currentPlayerId);
  const phase = player?.crisisPhase ?? 'none';

  // Panel should not render if there is no active crisis phase.
  if (phase === 'none' || phase === 'resolved') return null;

  const filledCount = (player?.crisisPolicies ?? []).length;
  const requiredSlots = player?.crisisPolicySlots ?? 0;
  const selectedPolicies = new Set(player?.crisisPolicies ?? []);
  const pendingGovernmentChoice = player?.pendingGovernmentChoice ?? null;
  const governmentOptions = (pendingGovernmentChoice?.options ?? []).map(id => {
    const gov = state.config.governments?.get(id);
    return {
      id,
      name: gov?.name ?? id,
      description: gov?.description ?? '',
    };
  });
  const hasPendingGovernmentChoice = governmentOptions.length > 0;
  const allFilled = filledCount >= requiredSlots && !hasPendingGovernmentChoice;

  // Crisis type lookup via age.activeCrisisType → config.crises
  const activeCrisisType = state.age.activeCrisisType;
  const crisisDef = activeCrisisType
    ? state.config.crises.find(c => c.crisisType === activeCrisisType || c.id === activeCrisisType)
    : undefined;
  const crisisName = crisisDef?.name ?? 'Crisis';
  const crisisGlyph = getCrisisGlyph(activeCrisisType ?? '');
  const crisisDescription = crisisDef?.description ?? getDescription(activeCrisisType ?? '');

  const stageMeta = STAGE_META[phase] ?? { label: phase, index: 0 };

  const handlePolicyClick = (policyId: string) => {
    dispatch({ type: 'FORCE_CRISIS_POLICY', policyId });
  };

  const handleGovernmentClick = (governmentId: string) => {
    dispatch({ type: 'SET_GOVERNMENT', playerId: state.currentPlayerId, governmentId });
  };

  // Collect all policies from config
  const allPolicies = [...(state.config.policies?.values() ?? [])];

  return (
    <PanelShell
      id="crisis"
      title={crisisName}
      onClose={onClose}
      priority="modal"
      width="wide"
      dismissible={allFilled}
    >
      {/* Hero glyph */}
      <div style={heroStyle}>
        <span style={{ fontSize: '56px', lineHeight: 1 }}>{crisisGlyph}</span>
      </div>

      {/* Description */}
      <p style={descriptionStyle}>{crisisDescription}</p>

      {/* Stage indicator */}
      <div style={stageRowStyle}>
        <span style={stageLabelStyle}>
          {stageMeta.label}
        </span>
        <span style={slotProgressStyle}>
          {filledCount} / {requiredSlots} policies filled
        </span>
      </div>

      {/* Stage progress dots */}
      <div style={dotsRowStyle}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              ...dotStyle,
              backgroundColor: i <= stageMeta.index
                ? 'var(--panel-accent-gold)'
                : 'var(--panel-muted-bg)',
            }}
          />
        ))}
      </div>

      {hasPendingGovernmentChoice && (
        <div style={governmentChoiceStyle}>
          <div style={sectionTitleStyle}>Revolutionary Government</div>
          <div style={gridStyle}>
            {governmentOptions.map(gov => (
              <button
                key={gov.id}
                type="button"
                onClick={() => handleGovernmentClick(gov.id)}
                style={cardStyle}
                data-testid={`crisis-government-${gov.id}`}
              >
                <div style={cardTitleStyle}>{gov.name}</div>
                <div style={cardDescStyle}>{gov.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Policy card grid */}
      <div style={gridStyle}>
        {allPolicies.map(policy => {
          const isSelected = selectedPolicies.has(policy.id);
          const isFull = !isSelected && filledCount >= requiredSlots;
          return (
            <button
              key={policy.id}
              type="button"
              disabled={isFull}
              onClick={() => handlePolicyClick(policy.id)}
              style={{
                ...cardStyle,
                borderColor: isSelected
                  ? 'var(--panel-accent-gold)'
                  : 'var(--panel-border)',
                opacity: isFull ? 0.4 : 1,
                cursor: isFull ? 'not-allowed' : 'pointer',
              }}
              data-testid={`crisis-policy-${policy.id}`}
            >
              <div style={cardTitleStyle}>{policy.name}</div>
              <div style={cardDescStyle}>{policy.description}</div>
              {isSelected && (
                <div style={selectedBadgeStyle}>✓</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Status hint when not all slots filled */}
      {!hasPendingGovernmentChoice && !allFilled && (
        <p style={hintStyle}>
          Select {requiredSlots - filledCount} more {requiredSlots - filledCount === 1 ? 'policy' : 'policies'} to resolve this crisis stage.
        </p>
      )}
    </PanelShell>
  );
}

// ── Styles (all token-based) ──

const heroStyle: CSSProperties = {
  textAlign: 'center',
  padding: 'var(--panel-padding-md) 0',
};

const descriptionStyle: CSSProperties = {
  color: 'var(--panel-muted-color)',
  lineHeight: 1.6,
  margin: '0 0 var(--panel-padding-md) 0',
  fontSize: '14px',
};

const stageRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 'var(--panel-padding-sm) 0',
  borderTop: '1px solid var(--panel-border)',
  borderBottom: '1px solid var(--panel-border)',
  marginBottom: 'var(--panel-padding-sm)',
};

const stageLabelStyle: CSSProperties = {
  font: 'var(--type-heading)',
  color: 'var(--panel-accent-gold)',
  fontSize: '15px',
};

const slotProgressStyle: CSSProperties = {
  color: 'var(--panel-text-color)',
  fontSize: '14px',
};

const dotsRowStyle: CSSProperties = {
  display: 'flex',
  gap: '6px',
  justifyContent: 'center',
  marginBottom: 'var(--panel-padding-md)',
};

const governmentChoiceStyle: CSSProperties = {
  borderBottom: '1px solid var(--panel-border)',
  marginBottom: 'var(--panel-padding-md)',
  paddingBottom: 'var(--panel-padding-md)',
};

const sectionTitleStyle: CSSProperties = {
  font: 'var(--type-heading)',
  color: 'var(--panel-text-color)',
  fontSize: '14px',
  marginBottom: 'var(--panel-padding-sm)',
};

const dotStyle: CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  transition: 'background-color 0.2s',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 'var(--panel-padding-sm)',
  marginBottom: 'var(--panel-padding-md)',
};

const cardStyle: CSSProperties = {
  background: 'var(--panel-muted-bg-soft)',
  border: '1px solid var(--panel-border)',
  borderRadius: 'var(--panel-radius)',
  padding: 'var(--panel-padding-sm) var(--panel-padding-md)',
  textAlign: 'left',
  position: 'relative',
  transition: 'border-color 0.15s, opacity 0.15s',
};

const cardTitleStyle: CSSProperties = {
  font: 'var(--type-heading)',
  color: 'var(--panel-text-color)',
  fontSize: '13px',
  marginBottom: '2px',
};

const cardDescStyle: CSSProperties = {
  color: 'var(--panel-muted-color)',
  fontSize: '12px',
  lineHeight: 1.4,
};

const selectedBadgeStyle: CSSProperties = {
  position: 'absolute',
  top: 4,
  right: 8,
  color: 'var(--panel-accent-gold)',
  fontWeight: 700,
  fontSize: '14px',
};

const hintStyle: CSSProperties = {
  color: 'var(--panel-muted-color)',
  fontSize: '13px',
  textAlign: 'center',
  margin: 0,
};

/** Pick a contextual glyph for a known crisis type or id */
function getCrisisGlyph(crisisTypeOrId: string): string {
  const glyphs: Record<string, string> = {
    plague:            '🦠',
    barbarian_invasion:'⚔️',
    golden_age:        '✨',
    trade_opportunity: '🤝',
    natural_disaster:  '🌊',
    revolt:            '🔥',
    invasion:          '⚔️',
    revolution:        '🏴',
    wars_of_religion:  '⛪',
  };
  return glyphs[crisisTypeOrId] ?? '⚠️';
}

/** Get description for a known crisis type or id */
function getDescription(crisisTypeOrId: string): string {
  const descriptions: Record<string, string> = {
    plague: 'A devastating plague sweeps across your empire, threatening the lives of your citizens. Your advisors urge immediate action.',
    barbarian_invasion: 'Barbarian hordes have been spotted near your borders. They demand tribute or they will attack!',
    golden_age: 'Your civilization has achieved great intellectual progress! Scholars and artists flock to your cities.',
    trade_opportunity: 'A wealthy foreign trade caravan has arrived at your borders, offering valuable goods in exchange for passage.',
    natural_disaster: 'Earthquakes and floods threaten your empire! Your people look to you for guidance in this time of crisis.',
    revolt: 'Civil unrest threatens to tear your empire apart. Your advisors urge immediate action to restore order.',
    invasion: 'Hostile forces amass at your borders. You must respond before they breach your defenses.',
    revolution: 'Revolutionary fervor sweeps through your cities. The old order is crumbling.',
    wars_of_religion: 'Religious tensions have ignited conflict across your empire. Faith and diplomacy must guide your hand.',
  };
  return descriptions[crisisTypeOrId] ?? 'A crisis requires your attention. Select policies to mitigate the damage.';
}
