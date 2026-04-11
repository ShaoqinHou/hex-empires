import type { ResourceChangeSummary } from '@hex/engine';

interface ResourceChangeBadgeProps {
  label: string;
  value: number;
  color: string;
  showPlus?: boolean;
  showWarning?: boolean;
}

export function ResourceChangeBadge({ label, value, color, showPlus = true, showWarning = false }: ResourceChangeBadgeProps) {
  const isNegative = value < 0;
  const displayValue = isNegative ? value : (showPlus ? `+${value}` : value);

  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-mono text-xs" style={{ color: isNegative ? 'var(--color-health-low)' : color }}>
        {displayValue}
      </span>
      {showWarning && isNegative && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-health-low)' }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
    </div>
  );
}

interface ResourceChangeSummaryProps {
  summary: ResourceChangeSummary;
  compact?: boolean;
}

export function ResourceChangeSummaryDisplay({ summary, compact = false }: ResourceChangeSummaryProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        <ResourceChangeBadge label="Gold" value={summary.goldPerTurn} color="var(--color-gold)" showWarning={summary.goldPerTurn < -5} />
        <ResourceChangeBadge label="Science" value={summary.sciencePerTurn} color="var(--color-science)" showPlus={false} />
        <ResourceChangeBadge label="Culture" value={summary.culturePerTurn} color="var(--color-culture)" showPlus={false} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <ResourceChangeBadge label="Gold" value={summary.goldPerTurn} color="var(--color-gold)" showWarning={summary.goldPerTurn < -5} />
      <ResourceChangeBadge label="Science" value={summary.sciencePerTurn} color="var(--color-science)" showPlus={false} />
      <ResourceChangeBadge label="Culture" value={summary.culturePerTurn} color="var(--color-culture)" showPlus={false} />
      <ResourceChangeBadge label="Faith" value={summary.faithPerTurn} color="var(--color-faith)" showPlus={false} />
    </div>
  );
}

interface WarningIndicatorProps {
  summary: ResourceChangeSummary;
}

export function WarningIndicator({ summary }: WarningIndicatorProps) {
  const warnings: string[] = [];

  if (summary.starvingCities.length > 0) {
    warnings.push(`${summary.starvingCities.length} starving ${summary.starvingCities.length === 1 ? 'city' : 'cities'}`);
  }

  if (summary.goldPerTurn < -10) {
    warnings.push('Critical gold deficit');
  } else if (summary.goldPerTurn < 0) {
    warnings.push('Gold deficit');
  }

  if (summary.unhappyCities > 0) {
    warnings.push(`${summary.unhappyCities} unhappy ${summary.unhappyCities === 1 ? 'city' : 'cities'}`);
  }

  if (warnings.length === 0) return null;

  const isCritical = summary.starvingCities.length > 0 || summary.goldPerTurn < -10;

  return (
    <div className="flex items-center gap-1.5" title={warnings.join(', ')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: isCritical ? 'var(--color-health-low)' : 'var(--color-gold)' }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <span className="text-xs font-bold" style={{ color: isCritical ? 'var(--color-health-low)' : 'var(--color-gold)' }}>
        {warnings.length}
      </span>
    </div>
  );
}
