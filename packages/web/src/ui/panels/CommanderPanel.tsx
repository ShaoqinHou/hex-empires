/**
 * CommanderPanel — read-only display of the human player's commanders.
 *
 * Shows, for every unit owned by the local human whose `typeId` is a
 * registered Commander archetype (`ALL_COMMANDERS`):
 *   • Name + role + age
 *   • Current level (derived from XP via `commanderLevelForXp`)
 *   • Current XP
 *   • Unspent promotion picks (`level - promotions.length`)
 *   • List of owned promotion ids (humanized fallback — if a future
 *     cycle widens `ALL_COMMANDER_PROMOTIONS` with display names, swap
 *     the humanizer for a lookup)
 *
 * NOT wired into App.tsx. This panel is intentionally un-integrated —
 * it will slot into a full Commander picker UI in a later cycle. It is
 * the sibling of `ReligionPanel` (M23) and `GovernmentPanel` (M24):
 * same right-anchored column, same token-driven styling, same empty-
 * state hint pattern.
 *
 * Data-import note: `ALL_COMMANDERS`, `ALL_COMMANDER_PROMOTIONS`, and
 * `commanderLevelForXp` are re-exported from `@hex/engine` (see the
 * engine barrel), so we look up archetype / promotion metadata via
 * the public barrel only — no deep `@hex/engine/data/...` reach-arounds.
 */

import { useGameState } from '../../providers/GameProvider';
import {
  ALL_COMMANDERS,
  ALL_COMMANDER_PROMOTIONS,
  commanderLevelForXp,
} from '@hex/engine';
import type { PlayerState, UnitState } from '@hex/engine';
import { PanelShell } from './PanelShell';

interface CommanderPanelProps {
  readonly onClose: () => void;
}

// ── Helpers ──

/**
 * Pick the first human player in turn order. The Commander UI only
 * ever shows the local human's commanders — AI commander picks surface
 * elsewhere (event log, unit tooltips).
 */
function findHumanPlayer(
  players: ReadonlyMap<string, PlayerState>,
): PlayerState | undefined {
  for (const p of players.values()) {
    if (p.isHuman) return p;
  }
  return undefined;
}

/**
 * Convert a snake_case id into a human-readable name — fallback for
 * promotion ids until `ALL_COMMANDER_PROMOTIONS` exposes a display name.
 */
function humanizeId(id: string): string {
  return id
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

/** Fixed-order display title for a commander role. */
function roleLabel(role: 'ground' | 'naval' | 'air'): string {
  switch (role) {
    case 'ground':
      return 'Ground';
    case 'naval':
      return 'Naval';
    case 'air':
      return 'Air';
  }
}

/** Fixed-order display title for an age id. */
function ageLabel(age: 'antiquity' | 'exploration' | 'modern'): string {
  switch (age) {
    case 'antiquity':
      return 'Antiquity';
    case 'exploration':
      return 'Exploration';
    case 'modern':
      return 'Modern';
  }
}

// Index commander archetypes by id so we can render role/age/name
// without repeatedly scanning `ALL_COMMANDERS`.
const COMMANDER_INDEX: ReadonlyMap<string, (typeof ALL_COMMANDERS)[number]> =
  new Map(ALL_COMMANDERS.map((c) => [c.id, c]));

// Index promotion defs by id. `ALL_COMMANDER_PROMOTIONS` is a flat
// array of `CommanderPromotionDef` rows — we use `.id` to key the map
// and `.name` as the display label.
const PROMOTION_INDEX: ReadonlyMap<
  string,
  (typeof ALL_COMMANDER_PROMOTIONS)[number]
> = new Map(ALL_COMMANDER_PROMOTIONS.map((p) => [p.id, p]));

/**
 * Resolve a promotion id into a display label. Uses the catalogue
 * `name` when the id is known; falls back to a humanized id for
 * stale save data.
 */
function promotionLabel(id: string): string {
  const def = PROMOTION_INDEX.get(id);
  return def?.name ?? humanizeId(id);
}

// Section style tokens — chrome (container/title/close) is provided by
// PanelShell. We retain only the per-section inner divider styling.
const SECTION_CLASSES = 'py-3';
const SECTION_STYLE: React.CSSProperties = {
  borderBottom: '1px solid var(--color-border)',
};

export function CommanderPanel({ onClose }: CommanderPanelProps) {
  const { state } = useGameState();

  const player = findHumanPlayer(state.players);

  // Filter state.units to commanders owned by the human player.
  const commanders: ReadonlyArray<UnitState> =
    player === undefined
      ? []
      : [...state.units.values()].filter(
          (u) => u.owner === player.id && COMMANDER_INDEX.has(u.typeId),
        );

  return (
    <PanelShell id="commanders" title="Commanders" onClose={onClose} priority="overlay">
      <div data-testid="commander-panel">
        {/* Count subtitle (was inline in the old header) */}
        <div
          className="text-xs mb-2"
          style={{ color: 'var(--color-text-muted)' }}
          data-testid="commander-panel-count"
        >
          {commanders.length} in play
        </div>
        {commanders.length === 0 ? (
          <section
            className={SECTION_CLASSES}
            data-testid="commander-panel-empty"
          >
            <div
              className="text-sm"
              style={{ color: 'var(--color-text)' }}
            >
              No commanders in play yet.
            </div>
            <div
              className="text-xs leading-snug mt-1"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Train a Captain (Antiquity), General/Admiral (Exploration),
              or Marshal+ (Modern).
            </div>
          </section>
        ) : (
          commanders.map((unit) => {
            const def = COMMANDER_INDEX.get(unit.typeId)!;
            const xp = unit.experience;
            const level = commanderLevelForXp(xp);
            const picked = unit.promotions;
            const unspent = Math.max(0, level - picked.length);
            return (
              <section
                key={unit.id}
                className={SECTION_CLASSES}
                style={SECTION_STYLE}
                data-testid={`commander-panel-row-${unit.id}`}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--color-text)' }}
                    data-testid={`commander-panel-name-${unit.id}`}
                  >
                    {def.name}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wider px-1"
                    style={{
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '2px',
                    }}
                  >
                    {roleLabel(def.role)} · {ageLabel(def.age)}
                  </span>
                </div>
                <dl className="text-xs mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                  <dt style={{ color: 'var(--color-text-muted)' }}>Level</dt>
                  <dd
                    style={{ color: 'var(--color-text)' }}
                    data-testid={`commander-panel-level-${unit.id}`}
                  >
                    {level}
                  </dd>
                  <dt style={{ color: 'var(--color-text-muted)' }}>XP</dt>
                  <dd
                    style={{ color: 'var(--color-text)' }}
                    data-testid={`commander-panel-xp-${unit.id}`}
                  >
                    {xp}
                  </dd>
                  <dt style={{ color: 'var(--color-text-muted)' }}>Picks</dt>
                  <dd
                    style={{ color: 'var(--color-text)' }}
                    data-testid={`commander-panel-picks-${unit.id}`}
                  >
                    {unspent} pick{unspent === 1 ? '' : 's'} available
                  </dd>
                </dl>
                {picked.length > 0 ? (
                  <ul
                    className="mt-1 flex flex-col gap-0.5"
                    data-testid={`commander-panel-promotions-${unit.id}`}
                  >
                    {picked.map((pid) => (
                      <li
                        key={`${unit.id}-${pid}`}
                        className="text-xs"
                        style={{ color: 'var(--color-text)' }}
                        data-testid={`commander-panel-promotion-${unit.id}-${pid}`}
                      >
                        • {promotionLabel(pid)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div
                    className="text-[10px] italic mt-1"
                    style={{ color: 'var(--color-text-muted)' }}
                    data-testid={`commander-panel-promotions-empty-${unit.id}`}
                  >
                    (no promotions picked)
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </PanelShell>
  );
}
