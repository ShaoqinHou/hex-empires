// Reusable empty-state card with optional icon, title, description, and CTA.

interface EmptyStateProps {
  readonly icon?: string;
  readonly title: string;
  readonly description?: string;
  readonly ctaLabel?: string;
  readonly onCtaClick?: () => void;
}

export function EmptyState({ icon, title, description, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div
      className="py-5 px-3 rounded text-center flex flex-col items-center gap-2"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)',
        border: '1px dashed var(--panel-border)',
      }}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      <div className="text-xs font-semibold" style={{ color: 'var(--panel-text-color)' }}>
        {title}
      </div>
      {description && (
        <div className="text-[11px] leading-snug" style={{ color: 'var(--panel-muted-color)' }}>
          {description}
        </div>
      )}
      {ctaLabel && onCtaClick && (
        <button
          onClick={onCtaClick}
          className="mt-1 px-3 py-1 rounded text-xs transition-colors"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
            border: '1px solid var(--color-accent)',
            color: 'var(--color-accent)',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
