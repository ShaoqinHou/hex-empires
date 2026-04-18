/**
 * ReligionPanel — read-only display of the human player's religion state.
 *
 * Shows:
 *   • Pantheon  — name + bonus description from ALL_PANTHEONS (if any),
 *                 else a "not yet adopted" hint with cost.
 *   • Religion  — name, holy city, founder belief, follower belief
 *                 (if this player founded a religion in state.religion),
 *                 else a "not yet founded" hint with cost.
 *   • Faith     — the player's current Faith pool.
 *
 * NOT wired into App.tsx. This panel is intentionally un-integrated —
 * it will slot into a full Religion picker UI in a later cycle.
 *
 * Data-import note: `ALL_PANTHEONS` is re-exported from `@hex/engine`
 * and used directly here. The sibling `ALL_FOUNDER_BELIEFS` /
 * `ALL_FOLLOWER_BELIEFS` catalogues are NOT yet re-exported from the
 * engine barrel (see packages/engine/src/data/religion/index.ts — the
 * system is un-wired until cycle C), and the web tsconfig/workspace
 * package.json do not declare deep-subpath `exports`, so deep
 * `@hex/engine/data/...` imports would not typecheck. Rather than reach
 * across the package boundary with a relative import, we render
 * founder/follower beliefs by formatting the raw belief-id stored on
 * the `ReligionRecord` (e.g. "world_church" → "World Church"). When the
 * barrel widens in a later cycle, swap `humanizeBeliefId` for a lookup.
 */

import { useGameState } from '../../providers/GameProvider';
import type { PlayerState, CityId } from '@hex/engine';
import { PanelShell } from './PanelShell';

interface ReligionPanelProps {
  readonly onClose: () => void;
}

// ── Helpers ──

/**
 * Pick the first human player in turn order. The Religion UI only ever
 * shows the local human's state — AI pantheon/religion picks surface
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
 * Convert a snake_case belief / pantheon id into a human-readable name.
 * Used only as the belief-lookup fallback described in the file header.
 */
function humanizeBeliefId(id: string): string {
  return id
    .split('_')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

// Section style tokens — chrome (container/title/close) is provided by
// PanelShell. We retain only the per-section inner divider styling.
const SECTION_CLASSES = 'py-3';
const SECTION_STYLE: React.CSSProperties = {
  borderBottom: '1px solid var(--color-border)',
};

export function ReligionPanel({ onClose }: ReligionPanelProps) {
  const { state } = useGameState();

  const player = findHumanPlayer(state.players);
  const pantheonId = player?.pantheonId ?? null;
  const pantheon = pantheonId !== null ? (state.config.pantheons.get(pantheonId) ?? null) : null;

  // Find a religion in state.religion?.religions founded by this player.
  const religions = state.religion?.religions ?? [];
  const myReligion =
    player !== undefined
      ? religions.find((r) => r.founderPlayerId === player.id) ?? null
      : null;

  const holyCityName =
    myReligion !== null ? lookupCityName(state.cities, myReligion.holyCityId) : null;

  const faith = player?.faith ?? 0;

  return (
    <PanelShell id="religion" title="Religion" onClose={onClose} priority="overlay">
      <div data-testid="religion-panel">
        {/* Faith subtitle (was inline in the old header) */}
        <div
          className="text-xs mb-2"
          style={{ color: 'var(--color-text-muted)' }}
          data-testid="religion-panel-faith"
        >
          ✦ {faith} Faith
        </div>
        {/* Pantheon section */}
        <section
          className={SECTION_CLASSES}
          style={SECTION_STYLE}
          data-testid="religion-panel-pantheon-section"
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Pantheon
          </h3>
          {pantheon !== null ? (
            <div data-testid="religion-panel-pantheon">
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {pantheon.name}
              </div>
              <div
                className="text-xs leading-snug mt-1"
                style={{ color: 'var(--color-text)' }}
              >
                {pantheon.description}
              </div>
            </div>
          ) : (
            <div data-testid="religion-panel-pantheon-empty">
              <div
                className="text-sm"
                style={{ color: 'var(--color-text)' }}
              >
                No pantheon adopted yet
              </div>
              <div
                className="text-xs leading-snug mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Cost: 25 faith. Adopt the first available pantheon when
                you have enough.
              </div>
            </div>
          )}
        </section>

        {/* Religion section */}
        <section
          className={SECTION_CLASSES}
          style={SECTION_STYLE}
          data-testid="religion-panel-religion-section"
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Religion
          </h3>
          {myReligion !== null ? (
            <div data-testid="religion-panel-religion">
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {myReligion.name}
              </div>
              <dl className="text-xs mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                <dt style={{ color: 'var(--color-text-muted)' }}>Holy City</dt>
                <dd style={{ color: 'var(--color-text)' }}>
                  {holyCityName ?? myReligion.holyCityId}
                </dd>
                <dt style={{ color: 'var(--color-text-muted)' }}>Founder</dt>
                <dd
                  style={{ color: 'var(--color-text)' }}
                  data-testid="religion-panel-founder-belief"
                >
                  {humanizeBeliefId(myReligion.founderBeliefId)}
                </dd>
                <dt style={{ color: 'var(--color-text-muted)' }}>Follower</dt>
                <dd
                  style={{ color: 'var(--color-text)' }}
                  data-testid="religion-panel-follower-belief"
                >
                  {humanizeBeliefId(myReligion.followerBeliefId)}
                </dd>
              </dl>
            </div>
          ) : (
            <div data-testid="religion-panel-religion-empty">
              <div
                className="text-sm"
                style={{ color: 'var(--color-text)' }}
              >
                No religion founded yet
              </div>
              <div
                className="text-xs leading-snug mt-1"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Cost: 200 faith + own a pantheon first.
              </div>
            </div>
          )}
        </section>

        {/* Faith summary line — already shown in header, repeated here for
            symmetry with the two main sections. */}
        <section
          className={SECTION_CLASSES}
          data-testid="religion-panel-faith-section"
        >
          <h3
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Faith
          </h3>
          <div
            className="text-sm"
            style={{ color: 'var(--color-text)' }}
          >
            {faith} Faith
          </div>
        </section>
      </div>
    </PanelShell>
  );
}

// ── Local helpers ──

/**
 * Look up a city name from the cities map by id, returning `null` if the
 * reference is stale (e.g. holy city razed — state systems will
 * eventually clean this up, but render-time code must cope).
 */
function lookupCityName(
  cities: ReadonlyMap<CityId, { readonly name: string }>,
  id: CityId,
): string | null {
  const city = cities.get(id);
  return city?.name ?? null;
}
