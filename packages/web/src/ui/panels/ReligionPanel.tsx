/**
 * ReligionPanel — read-only display of the human player's religion state.
 *
 * Shows:
 *   • Faith pool + Antiquity pantheon progress, when applicable.
 *   • Pantheon  — name + bonus description (if adopted), else an Antiquity-only
 *                 grid of available pantheons with cost badges.
 *   • Religion  — name, holy city, founder belief, follower belief (if any),
 *                 else an EmptyState prompt.
 */

import { useGameState } from '../../providers/GameProvider';
import type { PlayerState, CityId, RelicDef } from '@hex/engine';
import { PanelShell } from './PanelShell';
import { EmptyState } from '../components/EmptyState';
import { SectionHeader } from '../components/SectionHeader';
import { ProgressBar } from '../components/ProgressBar';

interface ReligionPanelProps {
  readonly onClose: () => void;
}

// Inline type for PantheonDef — not yet re-exported from @hex/engine barrel.
interface PantheonDefLike {
  readonly id: string;
  readonly name: string;
  readonly description: string;
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

function humanizeBeliefId(id: string): string {
  return id
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

function lookupCityName(
  cities: ReadonlyMap<CityId, { readonly name: string }>,
  id: CityId,
): string | null {
  const city = cities.get(id);
  return city?.name ?? null;
}

const DIVIDER: React.CSSProperties = { borderBottom: '1px solid var(--color-border)' };
const PANTHEON_COST = 25;

export function ReligionPanel({ onClose }: ReligionPanelProps) {
  const { state } = useGameState();

  const player = findHumanPlayer(state.players);
  const pantheonId = player?.pantheonId ?? null;
  const pantheon =
    pantheonId !== null
      ? (state.config.pantheons.get(pantheonId) as PantheonDefLike | undefined) ?? null
      : null;

  const religions = state.religion?.religions ?? [];
  const myReligion =
    player !== undefined
      ? religions.find((r) => r.founderPlayerId === player.id) ?? null
      : null;

  const holyCityName =
    myReligion !== null ? lookupCityName(state.cities, myReligion.holyCityId) : null;

  const faith = player?.faith ?? 0;

  // All pantheons from config (for the empty-state grid)
  const allPantheons: ReadonlyArray<PantheonDefLike> = [
    ...state.config.pantheons.values(),
  ] as ReadonlyArray<PantheonDefLike>;

  // Faith progress toward the Antiquity pantheon pick.
  const canStillAdoptPantheon = state.age.currentAge === 'antiquity' && pantheon === null;
  const faithMilestone = canStillAdoptPantheon ? PANTHEON_COST : null;
  const faithProgress =
    faithMilestone !== null ? Math.min(faith / faithMilestone, 1) : 1;

  // KK2 (F-09): Collect relic definitions for relics the player owns.
  const playerRelicIds: ReadonlyArray<string> = player?.relics ?? [];
  const relics: ReadonlyArray<RelicDef> = playerRelicIds
    .map((id) => state.config.relics?.get(id))
    .filter((r): r is RelicDef => r !== undefined);

  return (
    <PanelShell id="religion" title="Religion" onClose={onClose} priority="overlay">
      <div data-testid="religion-panel" className="flex flex-col gap-0">

        {/* ── Faith pool + progress ── */}
        <div className="py-2 mb-1" style={DIVIDER}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--panel-text-color)' }}>
              ✦ Faith
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: 'var(--color-faith, var(--color-culture))' }}
              data-testid="religion-panel-faith"
            >
              {faith}
            </span>
          </div>
          {faithMilestone !== null && (
            <div>
              <ProgressBar
                value={faithProgress}
                color="var(--color-faith, var(--color-culture))"
                height={6}
                showLabel
                label={`${faith} / ${faithMilestone}`}
              />
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--panel-muted-color)' }}>
                toward adopting a pantheon
              </div>
            </div>
          )}
        </div>

        {/* ── Pantheon section ── */}
        <section className="py-3" style={DIVIDER} data-testid="religion-panel-pantheon-section">
          <SectionHeader title="Pantheon" />
          {pantheon !== null ? (
            <div data-testid="religion-panel-pantheon" className="mt-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--panel-text-color)' }}>
                {pantheon.name}
              </div>
              <div className="text-xs leading-snug mt-1" style={{ color: 'var(--panel-text-color)' }}>
                {pantheon.description}
              </div>
            </div>
          ) : (
            <div data-testid="religion-panel-pantheon-empty" className="mt-1">
              <div className="text-sm" style={{ color: 'var(--panel-text-color)' }}>
                No pantheon adopted yet
              </div>
              <div
                className="text-xs leading-snug mt-0.5 mb-2"
                style={{ color: 'var(--panel-muted-color)' }}
              >
                {canStillAdoptPantheon
                  ? `Adopt one when you have ${PANTHEON_COST} faith.`
                  : 'Pantheons are only available during Antiquity.'}
              </div>
              {canStillAdoptPantheon && allPantheons.length > 0 && (
                <div
                  className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto"
                  aria-label="Available pantheons — choose one when you have 25 faith"
                >
                  {allPantheons.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded"
                      style={{
                        border: '1px solid var(--panel-border)',
                        backgroundColor:
                          'color-mix(in srgb, var(--panel-bg) 60%, transparent)',
                      }}
                    >
                      <div
                        className="text-[11px] font-semibold mb-0.5"
                        style={{ color: 'var(--panel-text-color)' }}
                      >
                        {p.name}
                      </div>
                      <div
                        className="text-[10px] leading-tight mb-1"
                        style={{ color: 'var(--panel-muted-color)' }}
                      >
                        {p.description}
                      </div>
                      <div
                        className="text-[9px] inline-block px-1"
                        style={{
                          border: '1px solid var(--panel-border)',
                          borderRadius: '2px',
                          color: 'var(--panel-muted-color)',
                        }}
                      >
                        {PANTHEON_COST} faith
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Religion section ── */}
        <section className="py-3" style={DIVIDER} data-testid="religion-panel-religion-section">
          <SectionHeader title="Religion" />
          {myReligion !== null ? (
            <div data-testid="religion-panel-religion" className="mt-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--panel-text-color)' }}>
                {myReligion.name}
              </div>
              <dl className="text-xs mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                <dt style={{ color: 'var(--panel-muted-color)' }}>Holy City</dt>
                <dd style={{ color: 'var(--panel-text-color)' }}>
                  {holyCityName ?? myReligion.holyCityId}
                </dd>
                <dt style={{ color: 'var(--panel-muted-color)' }}>Founder</dt>
                <dd
                  style={{ color: 'var(--panel-text-color)' }}
                  data-testid="religion-panel-founder-belief"
                >
                  {humanizeBeliefId(myReligion.founderBeliefId)}
                </dd>
                <dt style={{ color: 'var(--panel-muted-color)' }}>Follower</dt>
                <dd
                  style={{ color: 'var(--panel-text-color)' }}
                  data-testid="religion-panel-follower-belief"
                >
                  {humanizeBeliefId(myReligion.followerBeliefId)}
                </dd>
              </dl>
            </div>
          ) : (
            <div data-testid="religion-panel-religion-empty" className="mt-1">
              <EmptyState
                icon="☪"
                title="No religion founded yet"
                description="Research Piety and build a Temple to found a religion."
              />
            </div>
          )}
        </section>


        {/* -- Relics section (KK2 / F-09) -- */}
        <section className="py-3" data-testid="religion-panel-relics-section">
          <SectionHeader title="Relics" />
          {relics.length > 0 ? (
            <div className="flex flex-col gap-1.5 mt-1" data-testid="religion-panel-relics-list">
              {relics.map((relic) => (
                <div
                  key={relic.id}
                  className="p-2 rounded"
                  style={{
                    border: '1px solid var(--panel-border)',
                    backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)',
                  }}
                >
                  <div
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--panel-text-color)' }}
                  >
                    {relic.name}
                  </div>
                  <div
                    className="text-[10px] leading-tight mt-0.5"
                    style={{ color: 'var(--panel-muted-color)' }}
                  >
                    {relic.description}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span
                      className="text-[9px] inline-block px-1"
                      style={{
                        border: '1px solid var(--panel-border)',
                        borderRadius: '2px',
                        color: 'var(--color-faith, var(--color-culture))',
                      }}
                    >
                      +{relic.faithPerTurn} faith/turn
                    </span>
                    {relic.culturePerTurn > 0 && (
                      <span
                        className="text-[9px] inline-block px-1"
                        style={{
                          border: '1px solid var(--panel-border)',
                          borderRadius: '2px',
                          color: 'var(--color-culture)',
                        }}
                      >
                        +{relic.culturePerTurn} culture/turn
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div data-testid="religion-panel-relics-empty" className="mt-1">
              <div className="text-sm" style={{ color: 'var(--panel-muted-color)' }}>
                No relics collected yet
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--panel-muted-color)' }}>
                Found a religion or complete Mysticism to earn relics.
              </div>
            </div>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
