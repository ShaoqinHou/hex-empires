import { useMemo } from 'react';
import { useGame } from '../../providers/GameProvider';
import { ALL_ANTIQUITY_TECHS, ALL_EXPLORATION_TECHS, ALL_MODERN_TECHS } from '@hex/engine';
import type { TechnologyDef } from '@hex/engine';

/** Cell dimensions matching the CSS grid layout */
const CELL_WIDTH = 180;
const CELL_HEIGHT = 90;
const GAP = 12;

interface TechTreePanelProps {
  onClose: () => void;
}

export function TechTreePanel({ onClose }: TechTreePanelProps) {
  const { state, dispatch } = useGame();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const currentAge = player.age;
  const techs = currentAge === 'antiquity' ? ALL_ANTIQUITY_TECHS
    : currentAge === 'exploration' ? ALL_EXPLORATION_TECHS
    : ALL_MODERN_TECHS;

  const researchedSet = new Set(player.researchedTechs);
  const currentResearch = player.currentResearch;

  // Group techs by column for layout
  const maxCol = Math.max(...techs.map(t => t.treePosition.col));
  const maxRow = Math.max(...techs.map(t => t.treePosition.row));

  return (
    <div className="absolute inset-x-0 top-12 bottom-14 overflow-auto"
      style={{ backgroundColor: 'rgba(26, 26, 46, 0.95)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">{currentAge.charAt(0).toUpperCase() + currentAge.slice(1)} Age Technology Tree</h2>
          {currentResearch && (
            <span className="text-xs" style={{ color: 'var(--color-science)' }}>
              Researching: {currentResearch} ({player.researchProgress})
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>
          X
        </button>
      </div>

      {/* Tech tree grid */}
      <div className="p-6">
        <div className="relative" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${maxCol + 1}, ${CELL_WIDTH}px)`,
          gridTemplateRows: `repeat(${maxRow + 1}, ${CELL_HEIGHT}px)`,
          gap: `${GAP}px`,
        }}>
          <PrerequisiteLines techs={techs} researchedSet={researchedSet} maxCol={maxCol} maxRow={maxRow} />
          {techs.map(tech => {
            const isResearched = researchedSet.has(tech.id);
            const isActive = currentResearch === tech.id;
            const prereqsMet = tech.prerequisites.every(p => researchedSet.has(p));
            const canResearch = !isResearched && prereqsMet;

            return (
              <TechCard
                key={tech.id}
                tech={tech}
                isResearched={isResearched}
                isActive={isActive}
                canResearch={canResearch}
                prereqsMet={prereqsMet}
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
    </div>
  );
}

function TechCard({
  tech,
  isResearched,
  isActive,
  canResearch,
  prereqsMet,
  onSelect,
}: {
  tech: TechnologyDef;
  isResearched: boolean;
  isActive: boolean;
  canResearch: boolean;
  prereqsMet: boolean;
  onSelect: () => void;
}) {
  const borderColor = isResearched
    ? 'var(--color-science)'
    : isActive
    ? '#ffd54f'
    : prereqsMet
    ? 'var(--color-border)'
    : 'rgba(42, 58, 92, 0.5)';

  const bgColor = isResearched
    ? 'rgba(66, 165, 245, 0.15)'
    : isActive
    ? 'rgba(255, 213, 79, 0.1)'
    : 'var(--color-bg)';

  const opacity = prereqsMet || isResearched ? 1 : 0.4;

  return (
    <button
      className="rounded-lg p-2 text-left transition-all cursor-pointer"
      style={{
        gridColumn: tech.treePosition.col + 1,
        gridRow: tech.treePosition.row + 1,
        border: `2px solid ${borderColor}`,
        backgroundColor: bgColor,
        opacity,
      }}
      onClick={onSelect}
      disabled={isResearched || !prereqsMet}
    >
      <div className="text-xs font-bold truncate" style={{ color: isResearched ? 'var(--color-science)' : 'var(--color-text)' }}>
        {tech.name}
      </div>
      <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
        Cost: {tech.cost}
      </div>
      <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
        {tech.unlocks.length > 0 ? `Unlocks: ${tech.unlocks.join(', ')}` : tech.description}
      </div>
      {isResearched && (
        <div className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--color-science)' }}>
          RESEARCHED
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

    const result: Array<{ x1: number; y1: number; x2: number; y2: number; researched: boolean }> = [];

    for (const tech of techs) {
      for (const prereqId of tech.prerequisites) {
        const prereq = techMap.get(prereqId);
        if (!prereq) continue;

        // Right edge of prerequisite card
        const x1 = prereq.treePosition.col * (CELL_WIDTH + GAP) + CELL_WIDTH;
        const y1 = prereq.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        // Left edge of dependent card
        const x2 = tech.treePosition.col * (CELL_WIDTH + GAP);
        const y2 = tech.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        const researched = researchedSet.has(prereqId);
        result.push({ x1, y1, x2, y2, researched });
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
      {lines.map((line, i) => {
        const midX = (line.x1 + line.x2) / 2;
        const d = `M ${line.x1} ${line.y1} Q ${midX} ${line.y1}, ${midX} ${(line.y1 + line.y2) / 2} Q ${midX} ${line.y2}, ${line.x2} ${line.y2}`;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={line.researched ? 'var(--color-science)' : 'var(--color-border)'}
            strokeWidth={2}
            opacity={line.researched ? 0.8 : 0.4}
          />
        );
      })}
    </svg>
  );
}
