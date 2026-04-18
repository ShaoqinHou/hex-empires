/**
 * GovernmentPanel — read-only display of the human player's government
 * state (M23 sibling of `ReligionPanel`, intentionally un-wired).
 *
 * Shows:
 *   • Current government — name + legacy-bonus description (if any),
 *     else an EmptyState with a CTA to open the Civics Tree.
 *   • Policy slots     — per-category slot counts from the current
 *     government's `policySlots`, with each slot rendered as either a
 *     filled card or a dashed-border empty placeholder.
 *   • Available policies — the subset of policies whose `unlockCivic`
 *     appears in the human player's `researchedCivics`.
 *
 * NOT wired into App.tsx. This panel is intentionally un-integrated —
 * it will slot into a full Government picker UI in a later cycle.
 */

import { usePanelManager } from './PanelManager';
import { useGameState } from '../../providers/GameProvider';
import type { PlayerState } from '@hex/engine';
import type { GovernmentDef, PolicyCategory, PolicyDef } from '@hex/engine';
import { PanelShell } from './PanelShell';
import { EmptyState } from '../components/EmptyState';
import { SectionHeader } from '../components/SectionHeader';

interface GovernmentPanelProps {
  readonly onClose: () => void;
}

// ── Helpers ──

function findHumanPlayer(
  players: ReadonlyMap<string, PlayerState>,
): PlayerState | undefined {
  for (const p of players.values()) {
    if (p.isHuman) return p;
  }
  return undefined;
}

function humanizeId(id: string): string {
  return id
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

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

function policyName(id: string, policies: ReadonlyMap<string, PolicyDef>): string {
  const def = policies.get(id);
  return def?.name ?? humanizeId(id);
}

function findGovernment(
  id: string | null | undefined,
  governments: ReadonlyMap<string, GovernmentDef>,
): GovernmentDef | null {
  if (id === null || id === undefined) return null;
  return governments.get(id) ?? null;
}

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

const DIVIDER: React.CSSProperties = { borderBottom: '1px solid var(--color-border)' };

export function GovernmentPanel({ onClose }: GovernmentPanelProps) {
  const { state } = useGameState();
  const { openPanel } = usePanelManager();

  const player = findHumanPlayer(state.players);
  const government = findGovernment(player?.governmentId, state.config.governments);
  const researched = new Set<string>(player?.researchedCivics ?? []);

  const availablePolicies: ReadonlyArray<PolicyDef> = [...state.config.policies.values()].filter(
    (p) => researched.has(p.unlockCivic),
  );

  const lookupPolicyName = (id: string) => policyName(id, state.config.policies);

  return (
    <PanelShell id="government" title="Government" onClose={onClose} priority="overlay">
      <div data-testid="government-panel" className="flex flex-col gap-0">

        {/* ── Current Government ── */}
        <section className="py-3" style={DIVIDER} data-testid="government-panel-current-section">
          <SectionHeader title="Current Government" />
          {government !== null ? (
            <div data-testid="government-panel-current" className="mt-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--panel-text-color)' }}>
                {government.name}
              </div>
              <div className="text-xs leading-snug mt-1" style={{ color: 'var(--panel-text-color)' }}>
                {government.description}
              </div>
              <div
                className="text-xs leading-snug mt-1"
                style={{ color: 'var(--panel-muted-color)' }}
                data-testid="government-panel-legacy-bonus"
              >
                Legacy bonus: {describeLegacyBonus(government)}
              </div>
            </div>
          ) : (
            <div className="mt-1" data-testid="government-panel-current-empty">
              <EmptyState
                icon="⚖️"
                title="No government adopted yet"
                description="Research civic techs such as Code of Laws or Mysticism to unlock your first government form."
                ctaLabel="Open Civics Tree"
                onCtaClick={() => openPanel('civics')}
              />
            </div>
          )}
        </section>

        {/* ── Policy Slots ── */}
        <section className="py-3" style={DIVIDER} data-testid="government-panel-slots-section">
          <SectionHeader title="Policy Slots" />
          {government !== null ? (
            <div className="flex flex-col gap-2 mt-1">
              {CATEGORIES.map((cat) => {
                const count = government.policySlots[cat];
                const slots = slotArrayFor(player, cat, count);
                return (
                  <div key={cat} data-testid={`government-panel-slot-row-${cat}`}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--panel-text-color)' }}>
                        {categoryLabel(cat)}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--panel-muted-color)' }}
                        data-testid={`government-panel-slot-count-${cat}`}
                      >
                        {count} slot{count === 1 ? '' : 's'}
                      </span>
                    </div>
                    {count === 0 ? (
                      <div className="text-[10px] italic" style={{ color: 'var(--panel-muted-color)' }}>
                        (none)
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {slots.map((slot, idx) =>
                          slot !== null ? (
                            <div
                              key={`${cat}-${idx}`}
                              className="flex items-center justify-between px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
                                border: '1px solid var(--color-accent)',
                              }}
                              data-testid={`government-panel-slot-${cat}-${idx}`}
                            >
                              <span style={{ color: 'var(--panel-text-color)' }}>
                                {lookupPolicyName(slot)}
                              </span>
                              <span
                                className="text-[9px] uppercase tracking-wider px-1 ml-1"
                                style={{
                                  color: 'var(--panel-muted-color)',
                                  border: '1px solid var(--panel-border)',
                                  borderRadius: '2px',
                                }}
                              >
                                {cat}
                              </span>
                            </div>
                          ) : (
                            <div
                              key={`${cat}-${idx}-empty`}
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                border: '1px dashed var(--panel-border)',
                                color: 'var(--panel-muted-color)',
                              }}
                              data-testid={`government-panel-slot-${cat}-${idx}`}
                            >
                              —
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="text-xs mt-1"
              style={{ color: 'var(--panel-muted-color)' }}
              data-testid="government-panel-slots-empty"
            >
              Adopt a government to unlock policy slots.
            </div>
          )}
        </section>

        {/* ── Available Policies ── */}
        <section className="py-3" data-testid="government-panel-available-section">
          <SectionHeader title="Available Policies" />
          {availablePolicies.length === 0 ? (
            <div
              className="text-xs mt-1"
              style={{ color: 'var(--panel-muted-color)' }}
              data-testid="government-panel-available-empty"
            >
              Research more civics to unlock policies.
            </div>
          ) : (
            <ul className="flex flex-col gap-1 mt-1">
              {availablePolicies.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 50%, transparent)' }}
                  data-testid={`government-panel-available-${p.id}`}
                >
                  <span style={{ color: 'var(--panel-text-color)' }}>{p.name}</span>
                  <span
                    className="text-[9px] uppercase tracking-wider px-1 ml-2"
                    style={{
                      color: 'var(--panel-muted-color)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '2px',
                      whiteSpace: 'nowrap',
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
