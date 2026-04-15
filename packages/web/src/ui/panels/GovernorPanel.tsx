import { useGameState } from '../../providers/GameProvider';
import type { Governor, GovernorDef, GovernorAbility } from '@hex/engine';
import { PanelShell } from './PanelShell';

interface GovernorPanelProps {
  onClose: () => void;
}

const SPECIALIZATION_ICONS: Record<string, string> = {
  economic: '💰',
  military: '⚔️',
  scientific: '🔬',
  cultural: '🎭',
  religious: '⛪',
  diplomatic: '🤝',
};

// TODO(panel-manager-audit GovernorPanel.tsx:17–24): swap raw hex
// specialization colors for `var(--color-*)` tokens once
// panel-tokens.css exposes a specialization palette. Migration to
// PanelShell did not introduce these tokens to keep scope narrow.
const SPECIALIZATION_COLORS: Record<string, string> = {
  economic: '#fbbf24',
  military: '#ef4444',
  scientific: '#3b82f6',
  cultural: '#a855f7',
  religious: '#f59e0b',
  diplomatic: '#10b981',
};

export function GovernorPanel({ onClose }: GovernorPanelProps) {
  const { state, dispatch } = useGameState();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const recruitedGovernors = player.governors
    .map(id => state.governors.get(id))
    .filter((g): g is Governor => g !== undefined);

  const availableToRecruit = [...state.config.governors.values()]
    .filter(def => !state.governors.has(def.id));

  const playerCities = [...state.cities.values()].filter(c => c.owner === state.currentPlayerId);

  return (
    <PanelShell id="governors" title="👑 Governors" onClose={onClose} priority="info">
      {/* Recruited Governors */}
      <div className="py-2">
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Recruited ({recruitedGovernors.length}/4)
        </h3>
        {recruitedGovernors.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No governors recruited yet. Recruit one below.
          </p>
        )}
        {recruitedGovernors.map(gov => (
          <GovernorCard
            key={gov.id}
            governor={gov}
            def={state.config.governors.get(gov.id)}
            cities={playerCities}
            onAssign={(cityId) => dispatch({ type: 'ASSIGN_GOVERNOR', governorId: gov.id, cityId })}
            onUnassign={() => dispatch({ type: 'UNASSIGN_GOVERNOR', governorId: gov.id })}
            onPromote={(abilityId) => dispatch({ type: 'PROMOTE_GOVERNOR', governorId: gov.id, abilityId })}
            state={state}
          />
        ))}
      </div>

      {/* Available to Recruit */}
      {recruitedGovernors.length < 4 && availableToRecruit.length > 0 && (
        <div className="py-2 mt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Available to Recruit
          </h3>
          <div className="space-y-2">
            {availableToRecruit.map(def => (
              <div key={def.id} className="p-3 rounded-lg flex items-start justify-between"
                style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{SPECIALIZATION_ICONS[def.specialization] ?? '👤'}</span>
                    <span className="font-semibold">{def.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: SPECIALIZATION_COLORS[def.specialization] + '22',
                        color: SPECIALIZATION_COLORS[def.specialization],
                      }}>
                      {def.specialization}
                    </span>
                  </div>
                  {def.baseAbilities[0] && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {def.baseAbilities[0].description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dispatch({ type: 'RECRUIT_GOVERNOR', governorId: def.id })}
                  className="text-xs px-3 py-1.5 rounded cursor-pointer font-semibold"
                  style={{ backgroundColor: '#22c55e', color: '#000' }}>
                  Recruit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </PanelShell>
  );
}

interface GovernorCardProps {
  governor: Governor;
  def: GovernorDef | undefined;
  cities: Array<{ id: string; name: string }>;
  onAssign: (cityId: string) => void;
  onUnassign: () => void;
  onPromote: (abilityId: string) => void;
  state: { cities: ReadonlyMap<string, { name: string }> };
}

function GovernorCard({ governor, def, cities, onAssign, onUnassign, onPromote, state }: GovernorCardProps) {
  const assignedCityName = governor.assignedCity
    ? state.cities.get(governor.assignedCity)?.name ?? 'Unknown'
    : null;

  // Find promotable abilities (unlockable, level met, not yet promoted)
  const promotableAbilities = def?.unlockableAbilities.filter(
    (a: GovernorAbility) => a.requiredLevel <= governor.level && !governor.promotions.includes(a.id)
  ) ?? [];

  return (
    <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface-elevated)' }}>
      {/* Name and specialization */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span>{SPECIALIZATION_ICONS[governor.specialization] ?? '👤'}</span>
          <span className="font-semibold">{governor.name}</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Lv.{governor.level}
        </span>
      </div>

      {/* XP bar */}
      <div className="h-1 rounded-full mb-2" style={{ backgroundColor: 'var(--color-border)' }}>
        <div className="h-full rounded-full"
          style={{
            width: `${Math.min(100, (governor.experience / governor.experienceToNextLevel) * 100)}%`,
            backgroundColor: SPECIALIZATION_COLORS[governor.specialization] ?? '#666',
          }}
        />
      </div>

      {/* Assignment */}
      <div className="flex items-center gap-2 mb-2">
        {assignedCityName ? (
          <>
            <span className="text-xs">📍 {assignedCityName}</span>
            <button onClick={onUnassign}
              className="text-xs px-2 py-0.5 rounded cursor-pointer"
              style={{ backgroundColor: '#ef444433', color: '#ef4444' }}>
              Recall
            </button>
          </>
        ) : (
          <select
            className="text-xs px-2 py-1 rounded cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            value=""
            onChange={(e) => { if (e.target.value) onAssign(e.target.value); }}>
            <option value="">Assign to city...</option>
            {cities.map(city => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Active abilities */}
      {governor.abilities.length > 0 && (
        <div className="mb-2">
          {governor.abilities.map((a: GovernorAbility) => (
            <div key={a.id} className="text-xs py-0.5" style={{ color: 'var(--color-text-muted)' }}>
              ✓ {a.name}: {a.description}
            </div>
          ))}
        </div>
      )}

      {/* Promotable abilities */}
      {promotableAbilities.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>Available Promotions:</p>
          {promotableAbilities.map((a: GovernorAbility) => (
            <div key={a.id} className="flex items-center justify-between py-0.5">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {a.name}
              </span>
              <button
                onClick={() => onPromote(a.id)}
                className="text-xs px-2 py-0.5 rounded cursor-pointer"
                style={{ backgroundColor: '#fbbf2433', color: '#fbbf24' }}>
                Unlock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
