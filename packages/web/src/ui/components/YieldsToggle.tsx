interface YieldsToggleProps {
  showYields: boolean;
  onToggle: () => void;
}

export function YieldsToggle({ showYields, onToggle }: YieldsToggleProps) {
  return (
    <div className="absolute left-2 select-none" style={{ bottom: '14rem', zIndex: 20 }}>
      <button
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer"
        style={{
          backgroundColor: showYields ? 'var(--color-accent)' : 'var(--color-surface)',
          color: showYields ? 'var(--color-bg)' : 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
        }}
        onClick={onToggle}
        title="Toggle yield display (Y)"
      >
        {/* Lens/eye icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Yields
      </button>
    </div>
  );
}
