import { useGame } from '../../providers/GameProvider';
import { ALL_CIVILIZATIONS, ALL_LEADERS } from '@hex/engine';
import type { PlayerId, DiplomaticStatus, DiplomacyProposal } from '@hex/engine';

interface DiplomacyPanelProps {
  onClose: () => void;
}

function getRelationKey(a: PlayerId, b: PlayerId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

const STATUS_LABELS: Record<DiplomaticStatus, string> = {
  peace: 'Peace',
  war: 'At War',
  alliance: 'Alliance',
  friendship: 'Friendship',
  denounced: 'Denounced',
};

const STATUS_COLORS: Record<DiplomaticStatus, string> = {
  peace: 'var(--color-text-muted)',
  war: 'var(--color-health-low)',
  alliance: 'var(--color-science)',
  friendship: 'var(--color-food)',
  denounced: 'var(--color-production)',
};

interface DiplomacyAction {
  readonly label: string;
  readonly proposal: DiplomacyProposal;
  readonly color: string;
  readonly disabledWhen?: ReadonlyArray<DiplomaticStatus>;
}

const DIPLOMACY_ACTIONS: ReadonlyArray<DiplomacyAction> = [
  { label: 'Declare War', proposal: { type: 'DECLARE_WAR' }, color: 'var(--color-health-low)', disabledWhen: ['war'] },
  { label: 'Propose Peace', proposal: { type: 'PROPOSE_PEACE' }, color: 'var(--color-food)', disabledWhen: ['peace', 'friendship', 'alliance'] },
  { label: 'Friendship', proposal: { type: 'PROPOSE_FRIENDSHIP' }, color: 'var(--color-gold)', disabledWhen: ['war', 'friendship', 'alliance', 'denounced'] },
  { label: 'Alliance', proposal: { type: 'PROPOSE_ALLIANCE' }, color: 'var(--color-science)', disabledWhen: ['war', 'alliance', 'denounced'] },
  { label: 'Denounce', proposal: { type: 'DENOUNCE' }, color: 'var(--color-production)', disabledWhen: ['war', 'denounced'] },
];

export function DiplomacyPanel({ onClose }: DiplomacyPanelProps) {
  const { state, dispatch } = useGame();
  const currentPlayerId = state.currentPlayerId;
  const otherPlayers = [...state.players.values()].filter(p => p.id !== currentPlayerId);

  return (
    <div className="absolute right-0 top-12 bottom-14 w-80 overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h2 className="text-lg font-bold">Diplomacy</h2>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>
          X
        </button>
      </div>

      {/* Player list */}
      {otherPlayers.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          No other civilizations discovered.
        </div>
      ) : (
        otherPlayers.map(player => {
          const key = getRelationKey(currentPlayerId, player.id);
          const relation = state.diplomacy.relations.get(key);
          const status: DiplomaticStatus = relation?.status ?? 'peace';
          const grievances = relation?.grievances ?? 0;

          const civ = ALL_CIVILIZATIONS.find(c => c.id === player.civilizationId);
          const leader = ALL_LEADERS.find(l => l.id === player.leaderId);

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
                <span className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    color: STATUS_COLORS[status],
                    backgroundColor: 'var(--color-bg)',
                  }}>
                  {STATUS_LABELS[status]}
                </span>
              </div>

              {/* Grievances */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}>
                  Grievances
                </span>
                <GrievanceBar value={grievances} />
                <span className="text-[10px] font-mono"
                  style={{ color: grievances > 50 ? 'var(--color-health-low)' : 'var(--color-text-muted)' }}>
                  {grievances}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-1">
                {DIPLOMACY_ACTIONS.map(action => {
                  const disabled = action.disabledWhen?.includes(status) ?? false;
                  return (
                    <button
                      key={action.proposal.type}
                      className="text-[10px] px-2 py-1 rounded cursor-pointer transition-colors"
                      style={{
                        backgroundColor: disabled ? 'var(--color-bg)' : action.color,
                        color: disabled ? 'var(--color-border)' : 'var(--color-bg)',
                        opacity: disabled ? 0.4 : 1,
                      }}
                      disabled={disabled}
                      onClick={() => {
                        dispatch({
                          type: 'PROPOSE_DIPLOMACY',
                          targetId: player.id,
                          proposal: action.proposal,
                        });
                      }}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function GrievanceBar({ value }: { value: number }) {
  const pct = Math.min(100, value);
  const color = pct > 75 ? 'var(--color-health-low)'
    : pct > 40 ? 'var(--color-gold)'
    : 'var(--color-food)';

  return (
    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
