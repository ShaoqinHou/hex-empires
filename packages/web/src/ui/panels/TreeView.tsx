import React, { useMemo } from 'react';

/** Cell dimensions matching the CSS grid layout */
const CELL_WIDTH = 192;
const CELL_HEIGHT = 108;
const GAP = 16;

// ── CSS keyframe — injected once at module level ──────────────────────────────
// Uses a CSS custom property --tree-pulse-accent so each card can drive its
// own accent colour without separate keyframes per tree type.
const PULSE_STYLE = `
@keyframes treeNodePulse {
  0%, 100% {
    box-shadow: 0 0 8px color-mix(in srgb, var(--tree-pulse-accent) 40%, transparent),
                inset 0 0 6px color-mix(in srgb, var(--tree-pulse-accent) 10%, transparent);
  }
  50% {
    box-shadow: 0 0 18px color-mix(in srgb, var(--tree-pulse-accent) 75%, transparent),
                inset 0 0 12px color-mix(in srgb, var(--tree-pulse-accent) 25%, transparent);
  }
}
`;

if (typeof document !== 'undefined') {
  const STYLE_ID = '__treeNodePulse';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = PULSE_STYLE;
    document.head.appendChild(s);
  }
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface TreeViewItem {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number;
  readonly prerequisites: ReadonlyArray<string>;
  readonly unlocks: ReadonlyArray<string>;
  readonly description: string;
  readonly treePosition: { readonly row: number; readonly col: number };
}

export interface TreeViewProps {
  readonly items: ReadonlyArray<TreeViewItem>;
  readonly researchedIds: ReadonlySet<string>;
  readonly activeId: string | null;
  readonly activeProgress: number;
  readonly masteredIds?: ReadonlySet<string>;
  readonly masteryActiveId?: string | null;
  readonly accentColor: string;   // 'var(--color-science)' or 'var(--color-culture)'
  readonly costIcon: string;      // '⚗' or '🎭'
  readonly onSelect: (id: string) => void;
  readonly onMasterySelect?: (id: string) => void;
}

// ── Unlock emoji helper ────────────────────────────────────────────────────────

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
  if (id.includes('policy') || id.includes('government') || id.includes('senate')
      || id.includes('democracy') || id.includes('republic')) return '🏛';
  if (id.includes('wonder') || id.includes('monument') || id.includes('palace')) return '🗿';
  return '🔓';
}

// ── Internal: UnlockBadge ──────────────────────────────────────────────────────

function UnlockBadge({ id }: { id: string }) {
  const label = id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const icon = unlockEmoji(id);
  return (
    <span
      title={label}
      className="inline-flex items-center gap-0.5 px-1 py-px rounded text-[9px] leading-none"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--panel-text-color) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--panel-text-color) 12%, transparent)',
        color: 'var(--panel-muted-color)',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      <span className="truncate max-w-[52px]">{label}</span>
    </span>
  );
}

// ── Internal: TreeNodeCard ────────────────────────────────────────────────────

interface TreeNodeCardProps {
  readonly item: TreeViewItem;
  readonly isResearched: boolean;
  readonly isActive: boolean;
  readonly canResearch: boolean;
  readonly prereqsMet: boolean;
  readonly progress: number;
  readonly isMastered: boolean;
  readonly isMasteryActive: boolean;
  readonly accentColor: string;
  readonly costIcon: string;
  readonly onSelect: () => void;
  readonly onMasterySelect?: () => void;
}

function TreeNodeCard({
  item,
  isResearched,
  isActive,
  canResearch,
  prereqsMet,
  progress,
  isMastered,
  isMasteryActive,
  accentColor,
  costIcon,
  onSelect,
  onMasterySelect,
}: TreeNodeCardProps) {
  const progressPct = isActive
    ? Math.min(100, Math.round((progress / item.cost) * 100))
    : 0;

  // ── State-driven style tokens ──
  let borderColor: string;
  let bgColor: string;
  let glowShadow: string | undefined;
  let nameColor: string;
  let animation: string | undefined;

  if (isResearched) {
    borderColor = 'var(--tech-state-researched)';
    bgColor = 'color-mix(in srgb, var(--tech-state-researched) 10%, transparent)';
    nameColor = 'color-mix(in srgb, var(--tech-state-researched) 50%, white)';
    glowShadow = undefined;
    animation = undefined;
  } else if (isActive) {
    borderColor = accentColor;
    bgColor = `color-mix(in srgb, ${accentColor} 12%, transparent)`;
    nameColor = `color-mix(in srgb, ${accentColor} 55%, white)`;
    glowShadow = `0 0 10px color-mix(in srgb, ${accentColor} 55%, transparent), inset 0 0 8px color-mix(in srgb, ${accentColor} 15%, transparent)`;
    animation = 'treeNodePulse 2s ease-in-out infinite';
  } else if (canResearch) {
    borderColor = 'var(--panel-text-color)';
    bgColor = 'color-mix(in srgb, var(--panel-text-color) 6%, transparent)';
    nameColor = 'var(--panel-text-color)';
    glowShadow = undefined;
    animation = undefined;
  } else {
    borderColor = 'var(--tech-state-locked)';
    bgColor = 'color-mix(in srgb, var(--panel-bg) 50%, transparent)';
    nameColor = 'var(--panel-muted-color)';
    glowShadow = undefined;
    animation = undefined;
  }

  const opacity = prereqsMet || isResearched ? 1 : 0.45;

  return (
    <button
      type="button"
      className="rounded-lg p-2 text-left transition-all relative overflow-hidden"
      style={{
        gridColumn: item.treePosition.col + 1,
        gridRow: item.treePosition.row + 1,
        border: `2px solid ${borderColor}`,
        backgroundColor: bgColor,
        boxShadow: glowShadow,
        opacity,
        cursor: canResearch ? 'pointer' : 'default',
        animation,
        ['--tree-pulse-accent' as string]: isActive ? accentColor : undefined,
      }}
      onClick={onSelect}
      disabled={!canResearch}
    >
      {/* Researched checkmark overlay */}
      {isResearched && !isMastered && (
        <div
          className="absolute top-1 right-1.5 text-sm leading-none"
          style={{ color: 'var(--tech-state-researched)', textShadow: '0 0 4px var(--tech-state-researched)' }}
        >
          ✓
        </div>
      )}

      {/* Mastery chip — ★ for mastered, clickable for mastery-eligible */}
      {isResearched && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onMasterySelect && !isMastered) onMasterySelect();
          }}
          disabled={isMastered}
          className="absolute top-1 right-1.5 text-sm leading-none"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: isMastered ? 'default' : 'pointer',
            padding: 0,
            color: isMastered
              ? 'var(--panel-accent-gold)'
              : isMasteryActive
                ? accentColor
                : 'var(--panel-muted-color)',
            textShadow: isMastered
              ? '0 0 6px color-mix(in srgb, var(--panel-accent-gold) 50%, transparent)'
              : undefined,
            fontSize: isMastered ? '14px' : '11px',
          }}
          title={isMastered ? 'Mastered' : isMasteryActive ? 'Mastering...' : 'Click to master'}
        >
          {isMastered ? '★' : isMasteryActive ? '☆' : '★'}
        </button>
      )}

      {/* Item name */}
      <div
        className="text-xs font-bold pr-4 leading-tight"
        style={{ color: nameColor }}
      >
        {item.name}
      </div>

      {/* Cost */}
      <div className="text-[9px] mt-0.5" style={{ color: 'var(--panel-muted-color)' }}>
        <span style={{ color: accentColor }}>{costIcon}</span> {item.cost}
      </div>

      {/* Unlocks row */}
      {item.unlocks.length > 0 ? (
        <div className="flex flex-wrap gap-0.5 mt-1">
          {item.unlocks.map(uid => (
            <UnlockBadge key={uid} id={uid} />
          ))}
        </div>
      ) : (
        <div
          className="text-[9px] mt-1 line-clamp-2"
          style={{ color: 'var(--panel-muted-color)' }}
        >
          {item.description}
        </div>
      )}

      {/* In-progress bar */}
      {isActive && (
        <div className="mt-1.5">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{
              height: '4px',
              backgroundColor: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
            }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progressPct}%`,
                backgroundColor: accentColor,
                boxShadow: `0 0 4px ${accentColor}`,
              }}
            />
          </div>
          <div
            className="text-[9px] mt-0.5 text-right tabular-nums"
            style={{ color: accentColor }}
          >
            {progressPct}%
          </div>
        </div>
      )}
    </button>
  );
}

// ── Internal: TreeProgressHeader ──────────────────────────────────────────────

interface TreeProgressHeaderProps {
  readonly activeItem: TreeViewItem;
  readonly progress: number;
  readonly accentColor: string;
}

function TreeProgressHeader({ activeItem, progress, accentColor }: TreeProgressHeaderProps) {
  const progressPct = Math.min(100, Math.round((progress / activeItem.cost) * 100));
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <span className="text-xs" style={{ color: accentColor }}>
        Researching:
      </span>
      <span className="text-xs font-semibold" style={{ color: accentColor }}>
        {activeItem.name}
      </span>
      <div
        className="w-24 h-2 rounded-full overflow-hidden"
        style={{
          backgroundColor: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
        }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progressPct}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 6px ${accentColor}`,
          }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color: accentColor }}>
        {progress}/{activeItem.cost}
      </span>
    </div>
  );
}

// ── Internal: TreePrerequisiteLines ───────────────────────────────────────────

interface TreePrerequisiteLinesProps {
  readonly items: ReadonlyArray<TreeViewItem>;
  readonly researchedIds: ReadonlySet<string>;
  readonly maxCol: number;
  readonly maxRow: number;
  readonly filterId: string;
}

function TreePrerequisiteLines({
  items,
  researchedIds,
  maxCol,
  maxRow,
  filterId,
}: TreePrerequisiteLinesProps) {
  const lines = useMemo(() => {
    const itemMap = new Map<string, TreeViewItem>();
    for (const item of items) itemMap.set(item.id, item);

    const result: Array<{
      d: string;
      researched: boolean;
      fullResearched: boolean;
    }> = [];

    for (const item of items) {
      for (const prereqId of item.prerequisites) {
        const prereq = itemMap.get(prereqId);
        if (!prereq) continue;

        // Right-centre of prerequisite card
        const x1 = prereq.treePosition.col * (CELL_WIDTH + GAP) + CELL_WIDTH;
        const y1 = prereq.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        // Left-centre of dependent card
        const x2 = item.treePosition.col * (CELL_WIDTH + GAP);
        const y2 = item.treePosition.row * (CELL_HEIGHT + GAP) + CELL_HEIGHT / 2;

        // Cubic Bézier: exit horizontally from source, arrive horizontally at target
        const cpOffset = Math.max(40, Math.abs(x2 - x1) * 0.45);
        const d = `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`;

        const researched = researchedIds.has(prereqId);
        const fullResearched = researched && researchedIds.has(item.id);
        result.push({ d, researched, fullResearched });
      }
    }
    return result;
  }, [items, researchedIds]);

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
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Un-researched lines (dim/dashed) below fully-researched */}
      {lines.filter(l => !l.fullResearched).map((line, i) => (
        <path
          key={`unresearched-${i}`}
          d={line.d}
          fill="none"
          stroke={
            line.researched
              ? 'color-mix(in srgb, var(--tech-state-researched) 35%, transparent)'
              : 'color-mix(in srgb, var(--panel-muted-color) 30%, transparent)'
          }
          strokeWidth={1.5}
          strokeDasharray={line.researched ? undefined : '5 4'}
          opacity={0.7}
        />
      ))}

      {/* Fully-researched lines on top with glow */}
      {lines.filter(l => l.fullResearched).map((line, i) => (
        <path
          key={`researched-${i}`}
          d={line.d}
          fill="none"
          stroke="var(--tech-state-researched)"
          strokeWidth={2.5}
          opacity={0.9}
          filter={`url(#${filterId})`}
        />
      ))}
    </svg>
  );
}

// ── Internal: TreeLegend ──────────────────────────────────────────────────────

interface TreeLegendProps {
  readonly accentColor: string;
}

function TreeLegend({ accentColor }: TreeLegendProps) {
  return (
    <div
      className="flex items-center gap-5 mt-3 pt-2 text-[10px]"
      style={{
        borderTop: '1px solid var(--panel-border)',
        color: 'var(--panel-muted-color)',
      }}
    >
      <LegendItem
        borderColor="var(--tech-state-researched)"
        bgColor="color-mix(in srgb, var(--tech-state-researched) 13%, transparent)"
        label="Researched"
      />
      <LegendItem
        borderColor={accentColor}
        bgColor={`color-mix(in srgb, ${accentColor} 13%, transparent)`}
        label="In Progress"
        glow={`0 0 6px color-mix(in srgb, ${accentColor} 55%, transparent)`}
      />
      <LegendItem
        borderColor="var(--panel-text-color)"
        bgColor="color-mix(in srgb, var(--panel-text-color) 6%, transparent)"
        label="Available"
      />
      <LegendItem
        borderColor="var(--tech-state-locked)"
        bgColor="color-mix(in srgb, var(--panel-bg) 50%, transparent)"
        label="Locked"
        dim
      />
    </div>
  );
}

function LegendItem({
  borderColor,
  bgColor,
  label,
  glow,
  dim,
}: {
  borderColor: string;
  bgColor: string;
  label: string;
  glow?: string;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5" style={{ opacity: dim ? 0.5 : 1 }}>
      <div
        className="w-4 h-3 rounded-sm"
        style={{
          border: `2px solid ${borderColor}`,
          background: bgColor,
          boxShadow: glow,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

// ── Public: TreeView ──────────────────────────────────────────────────────────

export function TreeView({
  items,
  researchedIds,
  activeId,
  activeProgress,
  masteredIds,
  masteryActiveId,
  accentColor,
  costIcon,
  onSelect,
  onMasterySelect,
}: TreeViewProps): React.ReactElement {
  const activeItem = activeId ? (items.find(i => i.id === activeId) ?? null) : null;

  const maxCol = items.length > 0 ? Math.max(...items.map(i => i.treePosition.col)) : 0;
  const maxRow = items.length > 0 ? Math.max(...items.map(i => i.treePosition.row)) : 0;

  return (
    <>
      {activeItem && (
        <TreeProgressHeader
          activeItem={activeItem}
          progress={activeProgress}
          accentColor={accentColor}
        />
      )}

      {/* ── Scrollable tree (horizontal + vertical) ── */}
      <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
        <div
          className="relative inline-block"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${maxCol + 1}, ${CELL_WIDTH}px)`,
            gridTemplateRows: `repeat(${maxRow + 1}, ${CELL_HEIGHT}px)`,
            gap: `${GAP}px`,
          }}
        >
          <TreePrerequisiteLines
            items={items}
            researchedIds={researchedIds}
            maxCol={maxCol}
            maxRow={maxRow}
            filterId={`${accentColor.replace(/[^a-zA-Z]/g, '')}LineGlow`}
          />
          {items.map(item => {
            const isResearched = researchedIds.has(item.id);
            const isActive = activeId === item.id;
            const prereqsMet = item.prerequisites.every(p => researchedIds.has(p));
            const canResearch = !isResearched && !isActive && prereqsMet;

            return (
              <TreeNodeCard
                key={item.id}
                item={item}
                isResearched={isResearched}
                isActive={isActive}
                canResearch={canResearch}
                prereqsMet={prereqsMet}
                progress={isActive ? activeProgress : 0}
                isMastered={masteredIds?.has(item.id) ?? false}
                isMasteryActive={masteryActiveId === item.id}
                accentColor={accentColor}
                costIcon={costIcon}
                onSelect={() => {
                  if (canResearch) onSelect(item.id);
                }}
                onMasterySelect={onMasterySelect ? () => onMasterySelect(item.id) : undefined}
              />
            );
          })}
        </div>
      </div>

      <TreeLegend accentColor={accentColor} />
    </>
  );
}
