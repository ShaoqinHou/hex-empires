import { useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import type { PlayerId, DiplomaticStatus, DiplomacyRelation, IndependentPowerState, OpinionModifier } from '@hex/engine';
import { PanelShell } from './PanelShell';
import { RelationshipGauge } from '../components/RelationshipGauge';

interface DiplomacyPanelProps {
  onClose: () => void;
}

type DiplomacyTab = 'players' | 'ip' | 'leaders';

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
  helpful:    'var(--panel-status-helpful)',
  friendly:   'var(--panel-status-friendly)',
  neutral:    'var(--panel-status-neutral)',
  unfriendly: 'var(--panel-status-unfriendly)',
  hostile:    'var(--panel-status-hostile)',
  war:        'var(--panel-status-war)',
};

export function DiplomacyPanel({ onClose }: DiplomacyPanelProps) {
  const { state, dispatch } = useGameState();
  const [activeTab, setActiveTab] = useState<DiplomacyTab>('players');

  const currentPlayerId = state.currentPlayerId;

  return (
    <PanelShell id="diplomacy" title="Diplomacy" onClose={onClose} priority="info">
      {/* ── Tab bar ── */}
      <div
        className="flex gap-1 mb-3"
        style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: 'var(--panel-padding-sm)' }}
      >
        {(['players', 'ip', 'leaders'] as DiplomacyTab[]).map(tab => {
          const labels: Record<DiplomacyTab, string> = {
            players: 'Relations',
            ip: 'Ind. Powers',
            leaders: 'Leaders',
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-3 py-1 rounded text-xs"
              style={{
                backgroundColor: activeTab === tab ? 'var(--panel-accent-gold)' : 'transparent',
                color: activeTab === tab ? 'var(--panel-bg)' : 'var(--panel-muted-color)',
                border: activeTab === tab ? 'none' : '1px solid var(--panel-border)',
                fontWeight: activeTab === tab ? 700 : 400,
                cursor: 'pointer',
              }}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {activeTab === 'players' && (
        <PlayersTab currentPlayerId={currentPlayerId} dispatch={dispatch} />
      )}
      {activeTab === 'ip' && (
        <IPTab currentPlayerId={currentPlayerId} dispatch={dispatch} />
      )}
      {activeTab === 'leaders' && (
        <LeadersTab currentPlayerId={currentPlayerId} />
      )}
    </PanelShell>
  );
}

// ── Relations tab (original player-vs-player content) ────────────────────────

interface PlayersTabProps {
  readonly currentPlayerId: string;
  readonly dispatch: (action: import('@hex/engine').GameAction) => void;
}

function PlayersTab({ currentPlayerId, dispatch }: PlayersTabProps) {
  const { state } = useGameState();
  const otherPlayers = [...state.players.values()].filter(p => p.id !== currentPlayerId);

  if (otherPlayers.length === 0) {
    return (
      <div className="py-6 text-center text-xs" style={{ color: 'var(--panel-muted-color)' }}>
        No other civilizations discovered yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {otherPlayers.map(player => {
        const key = getRelationKey(currentPlayerId, player.id);
        const relation: DiplomacyRelation | undefined = state.diplomacy.relations.get(key);
        const status: DiplomaticStatus = relation?.status ?? 'neutral';
        const relationship = relation?.relationship ?? 0;
        const warSupport = relation?.warSupport ?? 0;
        const hasAlliance = relation?.hasAlliance ?? false;
        const hasFriendship = relation?.hasFriendship ?? false;

        const civ = state.config.civilizations.get(player.civilizationId);
        const leader = state.config.leaders.get(player.leaderId);

        const isAtWar = status === 'war';
        const canFormalWar = !isAtWar && relationship <= -60;
        const canSurpriseWar = !isAtWar;
        const canPeace = isAtWar;
        const canFriendship = !isAtWar && !hasFriendship && relationship >= -20;
        const canAlliance = !isAtWar && !hasAlliance && relationship > 60;
        const canDenounce = !isAtWar;

        const recentEvents = state.log
          .filter(e =>
            e.type === 'diplomacy' &&
            (e.playerId === player.id || e.playerId === currentPlayerId)
          )
          .slice(-3)
          .reverse();

        return (
          <div
            key={player.id}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--panel-border)' }}
          >
            {/* Header: Leader + Civ + Status */}
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 70%, transparent)' }}
            >
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--panel-text-color)' }}>
                  {leader?.name ?? player.leaderId}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--panel-muted-color)' }}>
                  {civ?.name ?? player.civilizationId} · {player.name}
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[status]} 20%, transparent)`,
                  border: `1px solid ${STATUS_COLORS[status]}`,
                  color: STATUS_COLORS[status],
                }}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>

            <div className="px-3 py-2 flex flex-col gap-2">
              <RelationshipGauge value={relationship} label="Diplomatic Relationship" />

              {isAtWar && (
                <div>
                  <div className="text-[10px] mb-1" style={{ color: 'var(--panel-muted-color)' }}>
                    War Support: {Math.round(warSupport * 100)}%
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--panel-border) 40%, transparent)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, Math.round(warSupport * 100))}%`,
                        backgroundColor: 'var(--color-danger, var(--color-health-low))',
                      }}
                    />
                  </div>
                </div>
              )}

              {(hasAlliance || hasFriendship) && (
                <div className="flex gap-1">
                  {hasFriendship && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-food) 15%, transparent)',
                        border: '1px solid var(--color-food)',
                        color: 'var(--color-food)',
                      }}
                    >
                      ✓ Friendship
                    </span>
                  )}
                  {hasAlliance && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--color-science) 15%, transparent)',
                        border: '1px solid var(--color-science)',
                        color: 'var(--color-science)',
                      }}
                    >
                      ✓ Alliance
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {(canFriendship || canAlliance) && (
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--panel-muted-color)' }}>
                      Formalize
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {canFriendship && (
                        <DiploPanelButton
                          label="Declare Friendship"
                          color="var(--color-food)"
                          onClick={() => dispatch({
                            type: 'DECLARE_FRIENDSHIP',
                            targetPlayerId: player.id,
                          })}
                        />
                      )}
                      {canAlliance && (
                        <DiploPanelButton
                          label="Form Alliance"
                          color="var(--color-science)"
                          onClick={() => dispatch({
                            type: 'PROPOSE_DIPLOMACY',
                            targetId: player.id,
                            proposal: { type: 'PROPOSE_ALLIANCE' },
                          })}
                        />
                      )}
                    </div>
                  </div>
                )}

                {(canFormalWar || canSurpriseWar || canDenounce) && (
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--panel-muted-color)' }}>
                      Confront
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {canFormalWar && (
                        <DiploPanelButton
                          label="Declare War"
                          color="var(--panel-status-war)"
                          onClick={() => dispatch({
                            type: 'PROPOSE_DIPLOMACY',
                            targetId: player.id,
                            proposal: { type: 'DECLARE_WAR', warType: 'formal' },
                          })}
                        />
                      )}
                      {canSurpriseWar && (
                        <DiploPanelButton
                          label="Surprise War"
                          color="var(--panel-status-hostile)"
                          onClick={() => dispatch({
                            type: 'PROPOSE_DIPLOMACY',
                            targetId: player.id,
                            proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
                          })}
                        />
                      )}
                      {canDenounce && (
                        <DiploPanelButton
                          label="Denounce"
                          color="var(--panel-status-unfriendly)"
                          onClick={() => dispatch({
                            type: 'PROPOSE_DIPLOMACY',
                            targetId: player.id,
                            proposal: { type: 'DENOUNCE' },
                          })}
                        />
                      )}
                    </div>
                  </div>
                )}

                {canPeace && (
                  <div>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--panel-muted-color)' }}>
                      Peace
                    </div>
                    <DiploPanelButton
                      label="Propose Peace"
                      color="var(--panel-status-neutral)"
                      onClick={() => dispatch({
                        type: 'PROPOSE_DIPLOMACY',
                        targetId: player.id,
                        proposal: { type: 'PROPOSE_PEACE' },
                      })}
                    />
                  </div>
                )}
              </div>

              {/* F-11: Diplomatic Ledger */}
              {relation?.ledger && relation.ledger.length > 0 && (
                <LedgerSection ledger={relation.ledger} />
              )}

              {/* Fallback: recent log events when no ledger entries exist */}
              {(!relation?.ledger || relation.ledger.length === 0) && recentEvents.length > 0 && (
                <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--panel-border)' }}>
                  <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--panel-muted-color)' }}>
                    Recent
                  </div>
                  {recentEvents.map((event, idx) => (
                    <div key={idx} className="text-[10px] leading-snug" style={{ color: 'var(--panel-muted-color)' }}>
                      T{event.turn}: {event.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Independent Powers tab (F-07) ────────────────────────────────────────────

const IP_ATTITUDE_COLORS: Record<IndependentPowerState['attitude'], string> = {
  neutral:  'var(--panel-status-neutral)',
  friendly: 'var(--panel-status-friendly)',
  hostile:  'var(--panel-status-hostile)',
};

const IP_ATTITUDE_LABELS: Record<IndependentPowerState['attitude'], string> = {
  neutral:  'Neutral',
  friendly: 'Friendly',
  hostile:  'Hostile',
};

const IP_TYPE_ICONS: Record<IndependentPowerState['type'], string> = {
  militaristic: '⚔️',
  cultural:     '🎭',
  scientific:   '🔬',
  economic:     '💰',
  diplomatic:   '🕊️',
  expansionist: '🗺️',
};

interface IPTabProps {
  readonly currentPlayerId: string;
  readonly dispatch: (action: import('@hex/engine').GameAction) => void;
}

function IPTab({ currentPlayerId, dispatch }: IPTabProps) {
  const { state } = useGameState();
  const ips = [...(state.independentPowers?.values() ?? [])].filter(ip => !ip.isIncorporated);

  if (ips.length === 0) {
    return (
      <div className="py-6 text-center text-xs" style={{ color: 'var(--panel-muted-color)' }}>
        No independent powers on the map.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {ips.map(ip => {
        const isSuzerain = ip.suzerainPlayerId === currentPlayerId;
        const isPlayerHighestInfluence = isSuzerain; // simplified check: suzerain === highest
        const progressPct = Math.min(100, Math.round((ip.befriendProgress / 60) * 100));

        return (
          <div
            key={ip.id}
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--panel-border)' }}
          >
            {/* Header */}
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 70%, transparent)' }}
            >
              <div className="flex items-center gap-2">
                <span>{IP_TYPE_ICONS[ip.type]}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--panel-text-color)' }}>
                    {ip.id}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--panel-muted-color)' }}>
                    {ip.type} · ({ip.position.q}, {ip.position.r})
                  </div>
                </div>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, ${IP_ATTITUDE_COLORS[ip.attitude]} 20%, transparent)`,
                  border: `1px solid ${IP_ATTITUDE_COLORS[ip.attitude]}`,
                  color: IP_ATTITUDE_COLORS[ip.attitude],
                }}
              >
                {IP_ATTITUDE_LABELS[ip.attitude]}
              </span>
            </div>

            <div className="px-3 py-2 flex flex-col gap-2">
              {/* Suzerain badge */}
              {isSuzerain && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded w-fit"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--panel-accent-gold) 15%, transparent)',
                    border: '1px solid var(--panel-accent-gold)',
                    color: 'var(--panel-accent-gold)',
                  }}
                >
                  ★ You are Suzerain
                </span>
              )}

              {/* Befriend progress */}
              <div>
                <div className="text-[10px] mb-1" style={{ color: 'var(--panel-muted-color)' }}>
                  Influence: {Math.round(ip.befriendProgress)} / 60
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--panel-border) 40%, transparent)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: 'var(--panel-accent-gold)',
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-wrap">
                <DiploPanelButton
                  label="Befriend (20 Inf)"
                  color="var(--color-food)"
                  onClick={() => dispatch({ type: 'BEFRIEND_INDEPENDENT', ipId: ip.id, influenceSpent: 20 })}
                />
                {isPlayerHighestInfluence && (
                  <DiploPanelButton
                    label="Suzerain Bonus"
                    color="var(--panel-accent-gold)"
                    onClick={() => dispatch({ type: 'SUZERAIN_BONUS_SELECTED', ipId: ip.id, bonusId: ip.bonusPool[0] ?? '' })}
                    disabled={!ip.bonusPool.length}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Leaders tab (F-15 stub) ───────────────────────────────────────────────────

interface LeadersTabProps {
  readonly currentPlayerId: string;
}

function LeadersTab({ currentPlayerId }: LeadersTabProps) {
  const { state } = useGameState();
  const [discussTarget, setDiscussTarget] = useState<string | null>(null);

  const aiPlayers = [...state.players.values()].filter(
    p => !p.isHuman && p.id !== currentPlayerId,
  );

  if (aiPlayers.length === 0) {
    return (
      <div className="py-6 text-center text-xs" style={{ color: 'var(--panel-muted-color)' }}>
        No AI leaders discovered yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {aiPlayers.map(player => {
        const leader = state.config.leaders.get(player.leaderId);
        const civ = state.config.civilizations.get(player.civilizationId);

        return (
          <div
            key={player.id}
            className="rounded-lg p-3"
            style={{ border: '1px solid var(--panel-border)' }}
          >
            <div className="flex items-center justify-between">
              {/* Leader portrait placeholder + info */}
              <div className="flex items-center gap-3">
                <div
                  className="rounded-full flex items-center justify-center text-lg"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: 'color-mix(in srgb, var(--panel-border) 30%, var(--panel-bg))',
                    border: '1px solid var(--panel-border)',
                    fontSize: '20px',
                    flexShrink: 0,
                  }}
                  aria-label={`${leader?.name ?? player.leaderId} portrait`}
                >
                  👤
                </div>
                <div>
                  <div
                    style={{ color: 'var(--panel-text-color)', fontSize: '13px', fontWeight: 600 }}
                  >
                    {leader?.name ?? player.leaderId}
                  </div>
                  <div style={{ color: 'var(--panel-muted-color)', fontSize: '11px' }}>
                    {civ?.name ?? player.civilizationId} · {player.name}
                  </div>
                </div>
              </div>

              <DiploPanelButton
                label="Discuss"
                color="var(--panel-button-diplomacy, var(--color-influence))"
                onClick={() => setDiscussTarget(player.leaderId)}
              />
            </div>

            {/* Inline discussion modal placeholder */}
            {discussTarget === player.leaderId && (
              <div
                className="mt-3 p-3 rounded text-xs"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--panel-border) 20%, var(--panel-bg))',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--panel-muted-color)',
                }}
              >
                <div style={{ color: 'var(--panel-text-color)', fontWeight: 600, marginBottom: 4 }}>
                  Diplomatic discussion with {leader?.name ?? player.leaderId}
                </div>
                <div>Feature in development — full leader interaction screen coming in a future update.</div>
                <button
                  className="mt-2 text-[10px] px-2 py-0.5 rounded"
                  style={{
                    border: '1px solid var(--panel-border)',
                    color: 'var(--panel-muted-color)',
                    cursor: 'pointer',
                  }}
                  onClick={() => setDiscussTarget(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── F-11: Diplomatic Ledger section ──────────────────────────────────────────
interface LedgerSectionProps {
  readonly ledger: ReadonlyArray<OpinionModifier>;
}

function LedgerSection({ ledger }: LedgerSectionProps) {
  // Show most recent entries first; cap display at 8 for readability
  const visible = [...ledger].reverse().slice(0, 8);

  return (
    <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--panel-border)' }}>
      <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--panel-muted-color)' }}>
        Diplomatic Ledger
      </div>
      <div className="flex flex-col gap-0.5">
        {visible.map((entry, idx) => (
          <div
            key={`${entry.id}-${entry.turnApplied}-${idx}`}
            className="flex items-center justify-between text-[10px]"
          >
            <span style={{ color: 'var(--panel-muted-color)' }}>
              T{entry.turnApplied}: {entry.reason}
              {entry.turnExpires !== undefined && (
                <span style={{ color: 'var(--panel-muted-color)', opacity: 0.6 }}>
                  {' '}(expires T{entry.turnExpires})
                </span>
              )}
            </span>
            <span
              style={{
                fontWeight: 700,
                minWidth: '2.5rem',
                textAlign: 'right',
                color: entry.value >= 0
                  ? 'var(--color-food, #4ade80)'
                  : 'var(--color-danger, var(--color-health-low, #f87171))',
              }}
            >
              {entry.value >= 0 ? '+' : ''}{entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Local action button (scoped to DiplomacyPanel) ───────────────────────────
interface DiploPanelButtonProps {
  readonly label: string;
  readonly color: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

function DiploPanelButton({ label, color, onClick, disabled }: DiploPanelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[10px] px-2 py-1 rounded transition-colors"
      style={{
        backgroundColor: disabled
          ? 'transparent'
          : `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid ${disabled ? 'var(--panel-border)' : color}`,
        color: disabled ? 'var(--panel-muted-color)' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
