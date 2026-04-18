import { useGameState } from '../../providers/GameProvider';
import type { PlayerId, DiplomaticStatus, DiplomacyRelation } from '@hex/engine';
import { PanelShell } from './PanelShell';
import { RelationshipGauge } from '../components/RelationshipGauge';

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
  helpful:    'var(--panel-status-helpful)',
  friendly:   'var(--panel-status-friendly)',
  neutral:    'var(--panel-status-neutral)',
  unfriendly: 'var(--panel-status-unfriendly)',
  hostile:    'var(--panel-status-hostile)',
  war:        'var(--panel-status-war)',
};

export function DiplomacyPanel({ onClose }: DiplomacyPanelProps) {
  const { state, dispatch } = useGameState();
  const currentPlayerId = state.currentPlayerId;
  const otherPlayers = [...state.players.values()].filter(p => p.id !== currentPlayerId);

  return (
    <PanelShell id="diplomacy" title="Diplomacy" onClose={onClose} priority="info">
      {otherPlayers.length === 0 ? (
        <div className="py-6 text-center text-xs" style={{ color: 'var(--panel-muted-color)' }}>
          No other civilizations discovered yet.
        </div>
      ) : (
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

            // Get last 3 diplomacy events involving this player
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
                {/* ── Header: Leader + Civ + Status ── */}
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
                  {/* ── Relationship Gauge ── */}
                  <RelationshipGauge value={relationship} label="Diplomatic Relationship" />

                  {/* ── War Support (only when at war) ── */}
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

                  {/* ── Alliance / Friendship badges ── */}
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

                  {/* ── Action Palette (sectioned) ── */}
                  <div className="flex flex-col gap-1.5">
                    {/* Formalize section */}
                    {(canFriendship || canAlliance) && (
                      <div>
                        <div
                          className="text-[9px] uppercase tracking-wider mb-1"
                          style={{ color: 'var(--panel-muted-color)' }}
                        >
                          Formalize
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {canFriendship && (
                            <DiploPanelButton
                              label="Declare Friendship"
                              color="var(--color-food)"
                              onClick={() => dispatch({
                                type: 'PROPOSE_DIPLOMACY',
                                targetId: player.id,
                                proposal: { type: 'PROPOSE_FRIENDSHIP' },
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

                    {/* Confront section */}
                    {(canFormalWar || canSurpriseWar || canDenounce) && (
                      <div>
                        <div
                          className="text-[9px] uppercase tracking-wider mb-1"
                          style={{ color: 'var(--panel-muted-color)' }}
                        >
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

                    {/* Peace section */}
                    {canPeace && (
                      <div>
                        <div
                          className="text-[9px] uppercase tracking-wider mb-1"
                          style={{ color: 'var(--panel-muted-color)' }}
                        >
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

                  {/* ── Recent History ── */}
                  {recentEvents.length > 0 && (
                    <div
                      className="pt-2 mt-1"
                      style={{ borderTop: '1px solid var(--panel-border)' }}
                    >
                      <div
                        className="text-[9px] uppercase tracking-wider mb-1"
                        style={{ color: 'var(--panel-muted-color)' }}
                      >
                        Recent
                      </div>
                      {recentEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className="text-[10px] leading-snug"
                          style={{ color: 'var(--panel-muted-color)' }}
                        >
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
      )}
    </PanelShell>
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
