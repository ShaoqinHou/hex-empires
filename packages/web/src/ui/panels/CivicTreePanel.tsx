import { useMemo } from 'react';
import { useGame } from '../../providers/GameProvider';
import { ALL_ANTIQUITY_CIVICS } from '@hex/engine';
import type { CivicDef } from '@hex/engine';

/** Cell dimensions matching the CSS grid layout */
const CELL_WIDTH = 180;
const CELL_HEIGHT = 90;
const GAP = 12;

interface CivicTreePanelProps {
  onClose: () => void;
}

export function CivicTreePanel({ onClose }: CivicTreePanelProps) {
  const { state, dispatch } = useGame();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  // For now only antiquity civics are available
  const civics = ALL_ANTIQUITY_CIVICS;

  const researchedSet = new Set(player.researchedCivics);
  const currentCivic = player.currentCivic;

  const maxCol = Math.max(...civics.map(c => c.treePosition.col));
  const maxRow = Math.max(...civics.map(c => c.treePosition.row));

  return (
    <div className="absolute inset-x-0 top-12 bottom-14 overflow-auto"
      style={{ backgroundColor: 'rgba(46, 26, 46, 0.95)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-culture)' }}>
            {player.age.charAt(0).toUpperCase() + player.age.slice(1)} Age Civic Tree
          </h2>
          {currentCivic && (
            <span className="text-xs" style={{ color: 'var(--color-culture)' }}>
              Researching: {currentCivic} ({player.civicProgress})
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>
          X
        </button>
      </div>

      {/* Civic tree grid */}
      <div className="p-6">
        <div className="relative" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${maxCol + 1}, ${CELL_WIDTH}px)`,
          gridTemplateRows: `repeat(${maxRow + 1}, ${CELL_HEIGHT}px)`,
          gap: `${GAP}px`,
        }}>
          <PrerequisiteLines civics={civics} researchedSet={researchedSet} maxCol={maxCol} maxRow={maxRow} />
          {civics.map(civic => {
            const isResearched = researchedSet.has(civic.id);
            const isActive = currentCivic === civic.id;
            const prereqsMet = civic.prerequisites.every(p => researchedSet.has(p));
            const canResearch = !isResearched && prereqsMet;

            return (
              <CivicCard
                key={civic.id}
                civic={civic}
                isResearched={isResearched}
                isActive={isActive}
                canResearch={canResearch}
                prereqsMet={prereqsMet}
                onSelect={() => {
                  if (canResearch) {
                    dispatch({ type: 'SET_CIVIC', civicId: civic.id });
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CivicCard({
  civic,
  isResearched,
  isActive,
  canResearch,
  prereqsMet,
  onSelect,
}: {
  civic: CivicDef;
  isResearched: boolean;
  isActive: boolean;
  canResearch: boolean;
  prereqsMet: boolean;
  onSelect: () => void;
}) {
  const borderColor = isResearched
    ? 'var(--color-culture)'
    : isActive
    ? '#ffd54f'
    : prereqsMet
    ? 'var(--color-border)'
    : 'rgba(92, 42, 92, 0.5)';

  const bgColor = isResearched
    ? 'rgba(186, 104, 200, 0.15)'
    : isActive
    ? 'rgba(255, 213, 79, 0.1)'
    : 'var(--color-bg)';

  const opacity = prereqsMet || isResearched ? 1 : 0.4;

  return (
    <button
      className="rounded-lg p-2 text-left transition-all cursor-pointer"
      style={{
        gridColumn: civic.treePosition.col + 1,
        gridRow: civic.treePosition.row + 1,
        border: `2px solid ${borderColor}`,
        backgroundColor: bgColor,
        opacity,
      }}
      onClick={onSelect}
      disabled={isResearched || !prereqsMet}
    >
      <div className="text-xs font-bold truncate" style={{ color: isResearched ? 'var(--color-culture)' : 'var(--color-text)' }}>
        {civic.name}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
        Cost: {civic.cost} culture
      </div>
      <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
        {civic.unlocks.length > 0 ? `Unlocks: ${civic.unlocks.join(', ')}` : civic.description}
      </div>
      {isResearched && (
        <div className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--color-culture)' }}>
          COMPLETED
        </div>
      )}
      {isActive && (
        <div className="text-[10px] font-bold mt-0.5" style={{ color: '#ffd54f' }}>
          IN PROGRESS
        </div>
      )}
    </button>
  );
}

/** SVG overlay drawing prerequisite connection lines between civic cards */
function PrerequisiteLines({
  civics,
  researchedSet,
  maxCol,
  maxRow,
}: {
  civics: ReadonlyArray<CivicDef>;
  researchedSet: ReadonlySet<string>;
  maxCol: number;
  maxRow: number;
}) {
  const lines = useMemo(() => {
    const civicMap = new Map<string, CivicDef>();
    for (const c of civics) civicMap.set(c.id, c);

    const result: Array<{ x1: number; y1: number; x2: number; y2: number; researched: boolean }> = [];

    for (const civic of civics) {
      for (const prereqId of civic.prerequisites) {
        const prereq = civicMap.get(prereqId);
        if (!prereq) continue;

        // Right edge of prerequisite card
        const x1 = prereq.treePosition.col * (CELL_WIDTH + GAP) + CELL_WIDTH;
        const y1 = prereq.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        // Left edge of dependent card
        const x2 = civic.treePosition.col * (CELL_WIDTH + GAP);
        const y2 = civic.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        const researched = researchedSet.has(prereqId);
        result.push({ x1, y1, x2, y2, researched });
      }
    }
    return result;
  }, [civics, researchedSet]);

  const svgWidth = (maxCol + 1) * CELL_WIDTH + maxCol * GAP;
  const svgHeight = (maxRow + 1) * CELL_HEIGHT + maxRow * GAP;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={svgWidth}
      height={svgHeight}
      style={{ zIndex: 0 }}
    >
      {lines.map((line, i) => {
        const midX = (line.x1 + line.x2) / 2;
        const d = `M ${line.x1} ${line.y1} Q ${midX} ${line.y1}, ${midX} ${(line.y1 + line.y2) / 2} Q ${midX} ${line.y2}, ${line.x2} ${line.y2}`;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={line.researched ? 'var(--color-culture)' : 'var(--color-border)'}
            strokeWidth={2}
            opacity={line.researched ? 0.8 : 0.4}
          />
        );
      })}
    </svg>
  );
}
