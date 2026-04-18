interface RelationshipGaugeProps {
  readonly value: number;    // -100 to 100
  readonly label?: string;   // optional label above
  readonly compact?: boolean; // if true, no label text below zones
}

export function RelationshipGauge({ value, label, compact }: RelationshipGaugeProps) {
  // Clamp value
  const clamped = Math.max(-100, Math.min(100, value));
  // Map -100..100 to 0..100%
  const pct = ((clamped + 100) / 200) * 100;

  // Determine current zone
  let zoneLabel: string;
  let markerColor: string;
  if (clamped <= -60) {
    zoneLabel = 'Hostile';
    markerColor = 'var(--color-danger, var(--color-health-low))';
  } else if (clamped <= -20) {
    zoneLabel = 'Unfriendly';
    markerColor = 'var(--color-production)';
  } else if (clamped < 20) {
    zoneLabel = 'Neutral';
    markerColor = 'var(--panel-muted-color)';
  } else if (clamped < 60) {
    zoneLabel = 'Friendly';
    markerColor = 'var(--color-food)';
  } else {
    zoneLabel = 'Helpful';
    markerColor = 'var(--color-science)';
  }

  return (
    <div>
      {label && (
        <div className="text-[10px] mb-1" style={{ color: 'var(--panel-muted-color)' }}>
          {label}
        </div>
      )}
      {/* Zone bar (5 color segments) */}
      <div className="relative h-2 rounded-full overflow-hidden flex" style={{ gap: 1 }}>
        <div
          className="flex-1 rounded-l"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger, var(--color-health-low)) 60%, transparent)' }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-production) 50%, transparent)' }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: 'color-mix(in srgb, var(--panel-border) 80%, transparent)' }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-food) 50%, transparent)' }}
        />
        <div
          className="flex-1 rounded-r"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-science) 60%, transparent)' }}
        />
        {/* Marker */}
        <div
          className="absolute top-0 h-2 w-0.5 rounded"
          style={{
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            backgroundColor: markerColor,
            boxShadow: `0 0 4px ${markerColor}`,
          }}
        />
      </div>
      {/* Value + zone label */}
      {!compact && (
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px]" style={{ color: 'var(--panel-muted-color)' }}>
            {clamped > 0 ? '+' : ''}{clamped}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: markerColor }}>
            {zoneLabel}
          </span>
        </div>
      )}
    </div>
  );
}
