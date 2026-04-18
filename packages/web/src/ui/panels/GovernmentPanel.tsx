/**
 * GovernmentPanel — read-only display of the human player's government
 * state (M23 sibling of `ReligionPanel`, intentionally un-wired).
 *
 * Shows:
 *   • Current government — name + legacy-bonus description from
 *     `ALL_GOVERNMENTS` (if any), else a "No government adopted yet" hint.
 *   • Policy slots     — per-category slot counts from the current
 *     government's `policySlots`, with each slot rendered as either the
 *     slotted policy's name or "—" (empty).
 *   • Available policies — the subset of `ALL_POLICIES` whose
 *     `unlockCivic` appears in the human player's `researchedCivics`,
 *     so the player can see what they could slot next.
 *
 * NOT wired into App.tsx. This panel is intentionally un-integrated —
 * it will slot into a full Government picker UI in a later cycle.
 *
 * Data-import note: `ALL_GOVERNMENTS` and `ALL_POLICIES` ARE re-exported
 * from `@hex/engine` (see `packages/engine/src/index.ts`, the M12
 * Integration barrel block), so we look up the current government and
 * policy definitions directly. If a future state ever holds an id that
 * is NOT in the catalogue (older save, data drift), we fall back to a
 * humanized form of the id (e.g. `classical_republic` → `Classical
 * Republic`), mirroring the fallback `ReligionPanel` uses for belief
 * ids. This keeps the panel render-safe under stale references.
 */

import { useGameState } from '../../providers/GameProvider';
import type { PlayerState } from '@hex/engine';
import type { GovernmentDef, PolicyCategory, PolicyDef } from '@hex/engine';
import { PanelShell } from './PanelShell';

interface GovernmentPanelProps {
  readonly onClose: () => void;
}

// ── Helpers ──

/**
 * Pick the first human player in turn order. The Government UI only
 * ever shows the local human's state — AI government picks surface
 * elsewhere (diplomacy, event log).
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
 * Convert a snake_case government / policy id into a human-readable
 * name. Used only as the catalogue-lookup fallback described in the
 * file header.
 */
function humanizeId(id: string): string {
  return id
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * Describe an `EffectDef` as a short human-readable string. The engine
 * has no central formatter for `EffectDef`, so we render a best-effort
 * summary — enough for a read-only "what does this government give me"
 * line without reaching into yield-calc internals.
 */
function describeLegacyBonus(g: GovernmentDef): string {
  const e = g.legacyBonus;
  switch (e.type) {
    case 'MODIFY_YIELD':
      return `+${e.value} ${e.yield} per ${e.target}`;
    case 'MODIFY_COMBAT':
      return `+${e.value} Combat Strength to ${e.target}`;
    case 'DISCOUNT_PRODUCTION':
      return `-${e.percent}% Production cost of ${e.target}`;
    case 'MODIFY_MOVEMENT':
      return `+${e.value} Movement to ${e.target}`;
    default:
      return g.description;
  }
}

const CATEGORIES: ReadonlyArray<PolicyCategory> = [
  'military',
  'economic',
  'diplomatic',
  'wildcard',
];

/** Fixed-order display title for a policy category. */
function categoryLabel(cat: PolicyCategory): string {
  switch (cat) {
    case 'military':
      return 'Military';
    case 'economic':
      return 'Economic';
    case 'diplomatic':
      return 'Diplomatic';
    case 'wildcard':
      return 'Wildcard';
  }
}

/** Resolve a slotted policy id to its display name, with fallback. */
function policyName(id: string, policies: ReadonlyMap<string, PolicyDef>): string {
  const def = policies.get(id);
  return def?.name ?? humanizeId(id);
}

/** Resolve a government id to its def, or `null` if unknown. */
function findGovernment(id: string | null | undefined, governments: ReadonlyMap<string, GovernmentDef>): GovernmentDef | null {
  if (id === null || id === undefined) return null;
  return governments.get(id) ?? null;
}

/**
 * Read the slot-array for a given category from the player's
 * `slottedPolicies` map, padded/truncated to `slotCount`. Missing
 * entries become `null` (empty slot).
 */
function slotArrayFor(
  player: PlayerState | undefined,
  cat: PolicyCategory,
  slotCount: number,
): ReadonlyArray<string | null> {
  const source = player?.slottedPolicies?.get(cat) ?? [];
  const out: Array<string | null> = [];
  for (let i = 0; i < slotCount; i++) {
    out.push(source[i] ?? null);
  }
  return out;
}

// Section style tokens — chrome (container/title/close) is provided by
// PanelShell. We retain only the per-section inner divider styling.
const SECTION_CLASSES = 'py-3';
const SECTION_STYLE: React.CSSProperties = {
  borderBottom: '1px solid var(--color-border)',
};

export function GovernmentPanel({ onClose }: GovernmentPanelProps) {
  const { state } = useGameState();

  const player = findHumanPlayer(state.players);
  const government = findGovernment(player?.governmentId, state.config.governments);
  const researched = new Set<string>(player?.researchedCivics ?? []);

  // Available-to-slot policies: `unlockCivic` already researched.
  const availablePolicies: ReadonlyArray<PolicyDef> = [...state.config.policies.values()].filter((p) =>
    researched.has(p.unlockCivic),
  );

  const lookupPolicyName = (id: string) => policyName(id, state.config.policies);

  return (
    <PanelShell id="government" title="Government" onClose={onClose} priority="overlay">
      <div data-testid="government-panel">
        {/* Current government section */}
        <section
          className={SECTION_CLASSES}
          style={SECTION_STYLE}
          data-testid="government-panel-current-section"
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Current Government
          </h3>
          {government !== null ? (
            <div data-testid="government-panel-current">
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {government.name}
              </div>
              <div
                className="text-xs leading-snug mt-1"
                style={{ color: 'var(--color-text)' }}
              >
                {government.description}
              </div>
              <div
                className="text-xs leading-snug mt-1"
                style={{ color: 'var(--color-text-muted)' }}
                data-testid="government-panel-legacy-bonus"
              >
                Legacy bonus: {describeLegacyBonus(government)}
              </div>
            </div>
          ) : (
            <div data-testid="government-panel-current-empty">
              <div
                className="text-sm"
                style={{ color: 'var(--color-text)' }}
              >
                No government adopted yet
              </div>
              <div
                className="text-xs leading-snug mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Research a gating civic (Code of Laws, Mysticism, etc.)
                to adopt your first government.
              </div>
            </div>
          )}
        </section>

        {/* Policy slots section */}
        <section
          className={SECTION_CLASSES}
          style={SECTION_STYLE}
          data-testid="government-panel-slots-section"
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Policy Slots
          </h3>
          {government !== null ? (
            <div className="flex flex-col gap-2">
              {CATEGORIES.map((cat) => {
                const count = government.policySlots[cat];
                const slots = slotArrayFor(player, cat, count);
                return (
                  <div
                    key={cat}
                    data-testid={`government-panel-slot-row-${cat}`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--color-text)' }}
                      >
                        {categoryLabel(cat)}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--color-text-muted)' }}
                        data-testid={`government-panel-slot-count-${cat}`}
                      >
                        {count} slot{count === 1 ? '' : 's'}
                      </span>
                    </div>
                    {count === 0 ? (
                      <div
                        className="text-[10px] italic"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        (none)
                      </div>
                    ) : (
                      <ul className="mt-0.5 flex flex-col gap-0.5">
                        {slots.map((slot, idx) => (
                          <li
                            key={`${cat}-${idx}`}
                            className="text-xs"
                            style={{ color: 'var(--color-text)' }}
                            data-testid={`government-panel-slot-${cat}-${idx}`}
                          >
                            {slot !== null ? lookupPolicyName(slot) : '—'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
              data-testid="government-panel-slots-empty"
            >
              Adopt a government to unlock policy slots.
            </div>
          )}
        </section>

        {/* Available policies section */}
        <section
          className={SECTION_CLASSES}
          data-testid="government-panel-available-section"
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Available Policies
          </h3>
          {availablePolicies.length === 0 ? (
            <div
              className="text-xs"
              style={{ color: 'var(--color-text-muted)' }}
              data-testid="government-panel-available-empty"
            >
              Research more civics to unlock policies.
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {availablePolicies.map((p) => (
                <li
                  key={p.id}
                  className="flex items-baseline justify-between text-xs"
                  data-testid={`government-panel-available-${p.id}`}
                >
                  <span style={{ color: 'var(--color-text)' }}>{p.name}</span>
                  <span
                    className="text-[10px] uppercase tracking-wider px-1"
                    style={{
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '2px',
                    }}
                  >
                    {p.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
