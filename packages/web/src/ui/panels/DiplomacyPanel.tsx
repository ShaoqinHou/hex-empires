import { useGameState } from '../../providers/GameProvider';
import { ALL_CIVILIZATIONS, ALL_LEADERS } from '@hex/engine';
import type { PlayerId, DiplomaticStatus, DiplomacyProposal, DiplomacyRelation } from '@hex/engine';
import { PanelShell } from './PanelShell';

interface DiplomacyPanelProps {
  onClose: () => void;
}

function getRelationKey(a: PlayerId, b: PlayerId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

const STATUS_LABELS: Record<DiplomaticStatus, string> = {
  helpful: 'Helpful',
  friendly: 'Friendly',
  neutral: 'Neutral',
  unfriendly: 'Unfriendly',
  hostile: 'Hostile',
  war: 'At War',
};

const STATUS_COLORS: Record<DiplomaticStatus, string> = {
  helpful: 'var(--panel-status-helpful)',
  friendly: 'var(--panel-status-friendly)',
  neutral: 'var(--panel-status-neutral)',
  unfriendly: 'var(--panel-status-unfriendly)',
  hostile: 'var(--panel-status-hostile)',
  war: 'var(--panel-status-war)',
};

export function DiplomacyPanel({ onClose }: DiplomacyPanelProps) {
  const { state, dispatch } = useGameState();
  const currentPlayerId = state.currentPlayerId;
  const otherPlayers = [...state.players.values()].filter(p => p.id !== currentPlayerId);

  return (
    <PanelShell id="diplomacy" title="Diplomacy" onClose={onClose} priority="info">
      {/* Player list */}
      {otherPlayers.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          No other civilizations discovered.
        </div>
      ) : (
        otherPlayers.map(player => {
          const key = getRelationKey(currentPlayerId, player.id);
          const relation: DiplomacyRelation | undefined = state.diplomacy.relations.get(key);
          const status: DiplomaticStatus = relation?.status ?? 'neutral';
          const relationship = relation?.relationship ?? 0;
          const warSupport = relation?.warSupport ?? 0;
          const hasAlliance = relation?.hasAlliance ?? false;
          const hasFriendship = relation?.hasFriendship ?? false;

          const civ = ALL_CIVILIZATIONS.find(c => c.id === player.civilizationId);
          const leader = ALL_LEADERS.find(l => l.id === player.leaderId);

          const isAtWar = status === 'war';
          const canFormalWar = !isAtWar && relationship <= -60;
          const canSurpriseWar = !isAtWar;
          const canPeace = isAtWar;
          const canFriendship = !isAtWar && !hasFriendship && relationship >= -20;
          const canAlliance = !isAtWar && !hasAlliance && relationship > 60;
          const canDenounce = !isAtWar;

          return (
            <div key={player.id} className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              {/* Player info */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {player.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {civ?.name ?? player.civilizationId} &middot; {leader?.name ?? player.leaderId}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold px-2 py-0.5 rounded block"
                    style={{
                      color: STATUS_COLORS[status],
                      backgroundColor: 'var(--color-bg)',
                    }}>
                    {STATUS_LABELS[status]}
                  </span>
                  {hasAlliance && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded mt-0.5 block"
                      style={{ color: 'var(--panel-accent-info)', backgroundColor: 'var(--color-bg)' }}>
                      Allied
                    </span>
                  )}
                  {hasFriendship && !hasAlliance && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded mt-0.5 block"
                      style={{ color: 'var(--panel-accent-success)', backgroundColor: 'var(--color-bg)' }}>
                      Friends
                    </span>
                  )}
                </div>
              </div>

              {/* Relationship bar */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}>
                  Relationship
                </span>
                <RelationshipBar value={relationship} />
                <span className="text-[10px] font-mono"
                  style={{ color: STATUS_COLORS[status] }}>
                  {relationship > 0 ? '+' : ''}{relationship}
                </span>
              </div>

              {/* War Support (shown during wars) */}
              {isAtWar && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wide"
                    style={{ color: 'var(--color-text-muted)' }}>
                    War Support
                  </span>
                  <WarSupportBar value={warSupport} />
                  <span className="text-[10px] font-mono"
                    style={{
                      color: warSupport > 0 ? '#4ade80' : warSupport < 0 ? '#ef4444' : '#9ca3af',
                    }}>
                    {warSupport > 0 ? '+' : ''}{warSupport}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-1">
                {/* Formal War */}
                <ActionButton
                  label="Formal War"
                  color="#dc2626"
                  disabled={!canFormalWar}
                  tooltip={!canFormalWar && !isAtWar ? 'Requires hostile relationship (< -60)' : undefined}
                  onClick={() => dispatch({
                    type: 'PROPOSE_DIPLOMACY',
                    targetId: player.id,
                    proposal: { type: 'DECLARE_WAR', warType: 'formal' },
                  })}
                />
                {/* Surprise War */}
                <ActionButton
                  label="Surprise War"
                  color="#f97316"
                  disabled={!canSurpriseWar}
                  tooltip="Gives defender +50 war support"
                  onClick={() => dispatch({
                    type: 'PROPOSE_DIPLOMACY',
                    targetId: player.id,
                    proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
                  })}
                />
                {/* Peace */}
                <ActionButton
                  label="Propose Peace"
                  color="#4ade80"
                  disabled={!canPeace}
                  onClick={() => dispatch({
                    type: 'PROPOSE_DIPLOMACY',
                    targetId: player.id,
                    proposal: { type: 'PROPOSE_PEACE' },
                  })}
                />
                {/* Friendship */}
                <ActionButton
                  label="Friendship"
                  color="var(--color-gold)"
                  disabled={!canFriendship}
                  onClick={() => dispatch({
                    type: 'PROPOSE_DIPLOMACY',
                    targetId: player.id,
                    proposal: { type: 'PROPOSE_FRIENDSHIP' },
                  })}
                />
                {/* Alliance */}
                <ActionButton
                  label="Alliance"
                  color="#60a5fa"
                  disabled={!canAlliance}
                  tooltip={!canAlliance && !isAtWar ? 'Requires helpful status (> 60)' : undefined}
                  onClick={() => dispatch({
                    type: 'PROPOSE_DIPLOMACY',
                    targetId: player.id,
                    proposal: { type: 'PROPOSE_ALLIANCE' },
                  })}
                />
                {/* Denounce */}
                <ActionButton
                  label="Denounce"
                  color="#fb923c"
                  disabled={!canDenounce}
                  onClick={() => dispatch({
                    type: 'PROPOSE_DIPLOMACY',
                    targetId: player.id,
                    proposal: { type: 'DENOUNCE' },
                  })}
                />
              </div>
            </div>
          );
        })
      )}
    </PanelShell>
  );
}

function ActionButton({ label, color, disabled, tooltip, onClick }: {
  label: string;
  color: string;
  disabled: boolean;
  tooltip?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
      style={{
        backgroundColor: disabled ? 'var(--color-bg)' : color,
        color: disabled ? 'var(--color-border)' : 'var(--color-bg)',
        opacity: disabled ? 0.4 : 1,
      }}
      disabled={disabled}
      title={tooltip}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function RelationshipBar({ value }: { value: number }) {
  // Map -100..+100 to 0..100% for display
  const pct = (value + 100) / 2; // 0=far left, 50=center, 100=far right
  const color = value > 60 ? '#4ade80'
    : value > 20 ? '#60a5fa'
    : value >= -20 ? '#9ca3af'
    : value >= -60 ? '#fb923c'
    : '#ef4444';

  return (
    <div className="flex-1 h-1.5 rounded-full relative" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Center marker */}
      <div className="absolute top-0 bottom-0 w-px" style={{ left: '50%', backgroundColor: 'var(--color-border)' }} />
      {/* Value indicator */}
      <div className="absolute top-0 h-full rounded-full transition-all"
        style={{
          left: `${Math.min(pct, 50)}%`,
          width: `${Math.abs(pct - 50)}%`,
          backgroundColor: color,
        }} />
    </div>
  );
}

function WarSupportBar({ value }: { value: number }) {
  // Map -100..+100 to 0..100%
  const pct = (value + 100) / 2;
  const color = value > 0 ? '#4ade80' : value < 0 ? '#ef4444' : '#9ca3af';

  return (
    <div className="flex-1 h-1.5 rounded-full relative" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="absolute top-0 bottom-0 w-px" style={{ left: '50%', backgroundColor: 'var(--color-border)' }} />
      <div className="absolute top-0 h-full rounded-full transition-all"
        style={{
          left: `${Math.min(pct, 50)}%`,
          width: `${Math.abs(pct - 50)}%`,
          backgroundColor: color,
        }} />
    </div>
  );
}
