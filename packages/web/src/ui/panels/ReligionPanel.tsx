/**
 * ReligionPanel — read-only display of the human player's religion state.
 *
 * Shows:
 *   • Faith pool + progress bar toward the next milestone (pantheon or religion).
 *   • Pantheon  — name + bonus description (if adopted), else a read-only
 *                 grid of available pantheons with cost badges.
 *   • Religion  — name, holy city, founder belief, follower belief (if any),
 *                 else an EmptyState prompt.
 *
 * NOT wired into App.tsx. This panel is intentionally un-integrated.
 */

import { useGameState } from '../../providers/GameProvider';
import type { PlayerState, CityId } from '@hex/engine';
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
const RELIGION_COST = 200;

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

  // Faith progress toward next milestone
  const faithMilestone =
    pantheon === null ? PANTHEON_COST : myReligion === null ? RELIGION_COST : null;
  const faithProgress =
    faithMilestone !== null ? Math.min(faith / faithMilestone, 1) : 1;

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
                {pantheon === null ? 'toward adopting a pantheon' : 'toward founding a religion'}
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
                Adopt one when you have {PANTHEON_COST} faith.
              </div>
              {allPantheons.length > 0 && (
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
        <section className="py-3" data-testid="religion-panel-religion-section">
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
                description="Adopt a pantheon first, then accumulate 200 faith to found your religion."
              />
            </div>
          )}
        </section>
      </div>
    </PanelShell>
  );
}
