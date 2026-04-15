import { useMemo } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { ALL_ANTIQUITY_TECHS, ALL_EXPLORATION_TECHS, ALL_MODERN_TECHS } from '@hex/engine';
import type { TechnologyDef } from '@hex/engine';

/** Cell dimensions matching the CSS grid layout */
const CELL_WIDTH = 192;
const CELL_HEIGHT = 108;
const GAP = 16;

interface TechTreePanelProps {
  onClose: () => void;
}

export function TechTreePanel({ onClose }: TechTreePanelProps) {
  const { state, dispatch } = useGameState();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const currentAge = player.age;
  const techs = currentAge === 'antiquity' ? ALL_ANTIQUITY_TECHS
    : currentAge === 'exploration' ? ALL_EXPLORATION_TECHS
    : ALL_MODERN_TECHS;

  const researchedSet = new Set(player.researchedTechs);
  const currentResearch = player.currentResearch;

  // Look up the currently-researched tech for cost display
  const activeTech = currentResearch
    ? techs.find(t => t.id === currentResearch) ?? null
    : null;
  const progressPct = activeTech
    ? Math.min(100, Math.round((player.researchProgress / activeTech.cost) * 100))
    : 0;

  const maxCol = Math.max(...techs.map(t => t.treePosition.col));
  const maxRow = Math.max(...techs.map(t => t.treePosition.row));

  const ageLabel = currentAge.charAt(0).toUpperCase() + currentAge.slice(1);

  return (
    <div
      className="absolute inset-x-0 top-12 bottom-14 flex flex-col"
      style={{ backgroundColor: 'rgba(12, 16, 36, 0.97)' }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-lg font-bold tracking-wide" style={{ color: 'var(--color-text)' }}>
            {ageLabel} Age Technology Tree
          </h2>
          {activeTech && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--color-science)' }}>
                Researching:
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-science)' }}>
                {activeTech.name}
              </span>
              {/* Inline mini progress bar */}
              <div
                className="w-24 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'rgba(66,165,245,0.2)', border: '1px solid rgba(66,165,245,0.3)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progressPct}%`,
                    backgroundColor: 'var(--color-science)',
                    boxShadow: '0 0 6px var(--color-science)',
                  }}
                />
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--color-science)' }}>
                {player.researchProgress}/{activeTech.cost}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1 rounded cursor-pointer transition-opacity hover:opacity-75"
          style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
        >
          ✕
        </button>
      </div>

      {/* ── Scrollable tree (horizontal + vertical) ── */}
      <div className="overflow-auto flex-1 p-6">
        <div
          className="relative inline-block"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxCol + 1}, ${CELL_WIDTH}px)`,
            gridTemplateRows: `repeat(${maxRow + 1}, ${CELL_HEIGHT}px)`,
            gap: `${GAP}px`,
          }}
        >
          <PrerequisiteLines
            techs={techs}
            researchedSet={researchedSet}
            maxCol={maxCol}
            maxRow={maxRow}
          />
          {techs.map(tech => {
            const isResearched = researchedSet.has(tech.id);
            const isActive = currentResearch === tech.id;
            const prereqsMet = tech.prerequisites.every(p => researchedSet.has(p));
            const canResearch = !isResearched && !isActive && prereqsMet;

            return (
              <TechCard
                key={tech.id}
                tech={tech}
                isResearched={isResearched}
                isActive={isActive}
                canResearch={canResearch}
                prereqsMet={prereqsMet}
                researchProgress={isActive ? player.researchProgress : 0}
                onSelect={() => {
                  if (canResearch) {
                    dispatch({ type: 'SET_RESEARCH', techId: tech.id });
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div
        className="flex items-center gap-5 px-4 py-2 shrink-0 text-[10px]"
        style={{
          backgroundColor: 'rgba(12,16,36,0.9)',
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
      >
        <LegendItem color="#22c55e" label="Researched" solid />
        <LegendItem color="#3b82f6" label="In Progress" solid pulse />
        <LegendItem color="#f8fafc" label="Available" solid />
        <LegendItem color="#64748b" label="Locked" solid dim />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  solid,
  pulse,
  dim,
}: {
  color: string;
  label: string;
  solid?: boolean;
  pulse?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5" style={{ opacity: dim ? 0.5 : 1 }}>
      <div
        className="w-4 h-3 rounded-sm"
        style={{
          border: `2px solid ${color}`,
          background: `${color}22`,
          boxShadow: pulse ? `0 0 6px ${color}` : undefined,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

// ── Unlock icon map ──────────────────────────────────────────────────────────
// Best-effort category guessing from the unlock ID string.
function unlockEmoji(id: string): string {
  if (id.includes('warrior') || id.includes('swordsman') || id.includes('knight')
      || id.includes('rifleman') || id.includes('tank') || id.includes('legion')
      || id.includes('musketman') || id.includes('infantry')) return '⚔';
  if (id.includes('galley') || id.includes('ship') || id.includes('caravel')
      || id.includes('ironclad') || id.includes('naval')) return '⚓';
  if (id.includes('archer') || id.includes('crossbow') || id.includes('cannon')
      || id.includes('artillery') || id.includes('bomber')) return '🏹';
  if (id.includes('settler') || id.includes('worker') || id.includes('builder')) return '🏗';
  if (id.includes('granary') || id.includes('aqueduct') || id.includes('watermill')) return '🌾';
  if (id.includes('shrine') || id.includes('temple') || id.includes('cathedral')) return '⛪';
  if (id.includes('library') || id.includes('university') || id.includes('research')) return '📚';
  if (id.includes('market') || id.includes('bank') || id.includes('stock')) return '💰';
  if (id.includes('barracks') || id.includes('armory') || id.includes('military')) return '🛡';
  if (id.includes('harbor') || id.includes('lighthouse') || id.includes('shipyard')) return '🏛';
  if (id.includes('mine') || id.includes('quarry')) return '⛏';
  if (id.includes('farm') || id.includes('pasture') || id.includes('plantation')) return '🌱';
  if (id.includes('road') || id.includes('railroad')) return '🛤';
  return '🔓';
}

function UnlockBadge({ id }: { id: string }) {
  // Convert snake_case id to a short readable label
  const label = id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const icon = unlockEmoji(id);
  return (
    <span
      title={label}
      className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[9px] leading-none"
      style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'var(--color-text-muted)',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      <span className="truncate max-w-[52px]">{label}</span>
    </span>
  );
}

// ── TechCard ─────────────────────────────────────────────────────────────────

function TechCard({
  tech,
  isResearched,
  isActive,
  canResearch,
  prereqsMet,
  researchProgress,
  onSelect,
}: {
  tech: TechnologyDef;
  isResearched: boolean;
  isActive: boolean;
  canResearch: boolean;
  prereqsMet: boolean;
  researchProgress: number;
  onSelect: () => void;
}) {
  const progressPct = isActive
    ? Math.min(100, Math.round((researchProgress / tech.cost) * 100))
    : 0;

  // ── State-driven style tokens ──
  let borderColor: string;
  let bgColor: string;
  let glowShadow: string | undefined;
  let nameColor: string;

  if (isResearched) {
    borderColor = '#22c55e';
    bgColor = 'rgba(34,197,94,0.10)';
    glowShadow = undefined;
    nameColor = '#86efac';
  } else if (isActive) {
    borderColor = '#3b82f6';
    bgColor = 'rgba(59,130,246,0.12)';
    glowShadow = '0 0 10px rgba(59,130,246,0.55), inset 0 0 8px rgba(59,130,246,0.15)';
    nameColor = '#93c5fd';
  } else if (canResearch) {
    borderColor = '#f8fafc';
    bgColor = 'rgba(248,250,252,0.06)';
    glowShadow = undefined;
    nameColor = 'var(--color-text)';
  } else {
    borderColor = 'rgba(55,65,81,0.6)';
    bgColor = 'rgba(17,24,39,0.5)';
    glowShadow = undefined;
    nameColor = '#6b7280';
  }

  const opacity = prereqsMet || isResearched ? 1 : 0.45;

  return (
    <button
      type="button"
      className="rounded-lg p-2 text-left transition-all relative overflow-hidden"
      style={{
        gridColumn: tech.treePosition.col + 1,
        gridRow: tech.treePosition.row + 1,
        border: `2px solid ${borderColor}`,
        backgroundColor: bgColor,
        boxShadow: glowShadow,
        opacity,
        cursor: canResearch ? 'pointer' : 'default',
        animation: isActive ? 'techPulse 2s ease-in-out infinite' : undefined,
      }}
      onClick={onSelect}
      disabled={!canResearch}
    >
      {/* Researched checkmark overlay */}
      {isResearched && (
        <div
          className="absolute top-1 right-1.5 text-sm leading-none"
          style={{ color: '#22c55e', textShadow: '0 0 4px #22c55e' }}
        >
          ✓
        </div>
      )}

      {/* Tech name */}
      <div
        className="text-xs font-bold pr-4 leading-tight"
        style={{ color: nameColor }}
      >
        {tech.name}
      </div>

      {/* Cost */}
      <div className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
        <span style={{ color: 'var(--color-science)' }}>⚗</span> {tech.cost}
      </div>

      {/* Unlocks row */}
      {tech.unlocks.length > 0 ? (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {tech.unlocks.map(uid => (
            <UnlockBadge key={uid} id={uid} />
          ))}
        </div>
      ) : (
        <div
          className="text-[9px] mt-1 line-clamp-2"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {tech.description}
        </div>
      )}

      {/* In-progress bar */}
      {isActive && (
        <div className="mt-1.5">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{
              height: '4px',
              backgroundColor: 'rgba(59,130,246,0.20)',
              border: '1px solid rgba(59,130,246,0.35)',
            }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                backgroundColor: '#3b82f6',
                boxShadow: '0 0 4px #3b82f6',
              }}
            />
          </div>
          <div
            className="text-[9px] mt-0.5 text-right tabular-nums"
            style={{ color: '#93c5fd' }}
          >
            {progressPct}%
          </div>
        </div>
      )}
    </button>
  );
}

/** SVG overlay drawing prerequisite connection lines between tech cards */
function PrerequisiteLines({
  techs,
  researchedSet,
  maxCol,
  maxRow,
}: {
  techs: ReadonlyArray<TechnologyDef>;
  researchedSet: ReadonlySet<string>;
  maxCol: number;
  maxRow: number;
}) {
  const lines = useMemo(() => {
    const techMap = new Map<string, TechnologyDef>();
    for (const t of techs) techMap.set(t.id, t);

    const result: Array<{
      d: string;
      researched: boolean;
      /** true when BOTH source and destination have been researched */
      fullResearched: boolean;
    }> = [];

    for (const tech of techs) {
      for (const prereqId of tech.prerequisites) {
        const prereq = techMap.get(prereqId);
        if (!prereq) continue;

        // Right-centre of prerequisite card
        const x1 = prereq.treePosition.col * (CELL_WIDTH + GAP) + CELL_WIDTH;
        const y1 = prereq.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        // Left-centre of dependent card
        const x2 = tech.treePosition.col * (CELL_WIDTH + GAP);
        const y2 = tech.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        // Cubic Bézier: exit horizontally from source, arrive horizontally at target
        const cpOffset = Math.max(40, Math.abs(x2 - x1) * 0.45);
        const d = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`;

        const researched = researchedSet.has(prereqId);
        const fullResearched = researched && researchedSet.has(tech.id);
        result.push({ d, researched, fullResearched });
      }
    }
    return result;
  }, [techs, researchedSet]);

  const svgWidth = (maxCol + 1) * CELL_WIDTH + maxCol * GAP;
  const svgHeight = (maxRow + 1) * CELL_HEIGHT + maxRow * GAP;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={svgWidth}
      height={svgHeight}
      style={{ zIndex: 0 }}
    >
      <defs>
        {/* Glow filter for researched lines */}
        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Render un-researched (dim/dashed) first so they sit under researched lines */}
      {lines.filter(l => !l.fullResearched).map((line, i) => (
        <path
          key={`unresearched-${i}`}
          d={line.d}
          fill="none"
          stroke={line.researched ? 'rgba(34,197,94,0.35)' : 'rgba(100,116,139,0.30)'}
          strokeWidth={1.5}
          strokeDasharray={line.researched ? undefined : '5 4'}
          opacity={0.7}
        />
      ))}

      {/* Render fully-researched lines on top, brighter with glow */}
      {lines.filter(l => l.fullResearched).map((line, i) => (
        <path
          key={`researched-${i}`}
          d={line.d}
          fill="none"
          stroke="#22c55e"
          strokeWidth={2.5}
          opacity={0.9}
          filter="url(#lineGlow)"
        />
      ))}
    </svg>
  );
}

/*
  CSS keyframe for pulsing border — injected once via a style tag.
  Using a raw <style> inside the component tree is simplest since Tailwind v4
  has no built-in keyframe for this specific animation.
*/
const PULSE_STYLE = `
@keyframes techPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.4), inset 0 0 6px rgba(59,130,246,0.1); }
  50%       { box-shadow: 0 0 18px rgba(59,130,246,0.75), inset 0 0 12px rgba(59,130,246,0.25); }
}
`;

// Inject once at module level (idempotent — same <style> tag reused across renders)
if (typeof document !== 'undefined') {
  const STYLE_ID = '__techTreePulse';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = PULSE_STYLE;
    document.head.appendChild(s);
  }
}
