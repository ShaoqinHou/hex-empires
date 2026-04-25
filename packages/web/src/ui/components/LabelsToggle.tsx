interface LabelsToggleProps {
  showLabels: boolean;
  onToggle: () => void;
}

/**
 * Floating toggle for unit-type text labels on the hex canvas.
 * When active, a small pill chip appears below each unit icon showing
 * the unit type name (e.g. "Warrior", "Settler") for readability.
 *
 * Sits below the YieldsToggle in the map controls column (left edge).
 * Registered in hudRegistry as 'labelsToggle'.
 */
export function LabelsToggle({ showLabels, onToggle }: LabelsToggleProps) {
  return (
    <div
      className="absolute left-2 hud-z-floating-control"
      style={{
        bottom: 'calc(var(--hud-floating-control-offset-bottom, 14rem) - 40px)',
        userSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      data-hud-id="labelsToggle"
    >
      <button
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold cursor-pointer"
        style={{
          backgroundColor: showLabels ? 'var(--color-accent)' : 'var(--color-surface)',
          color: showLabels ? 'var(--color-bg)' : 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          minHeight: '28px',
        }}
        onClick={onToggle}
        title="Toggle unit labels (L)"
        aria-label="Toggle unit type labels"
        aria-pressed={showLabels}
      >
        {/* Text/label icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="4" rx="1" />
          <rect x="3" y="11" width="12" height="4" rx="1" />
          <rect x="3" y="17" width="8" height="4" rx="1" />
        </svg>
        Labels
      </button>
    </div>
  );
}
