import type { BuildingDef } from '@hex/engine';

interface BuildingCardProps {
  building: BuildingDef;
  isActive?: boolean;
  isBuilt?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

const YIELD_ICONS: Record<string, { icon: string; color: string }> = {
  food: { icon: '\u{1F33E}', color: 'var(--color-food)' },
  production: { icon: '\u2692', color: 'var(--color-production)' },
  gold: { icon: '\u{1F4B0}', color: 'var(--color-gold)' },
  science: { icon: '\u{1F52C}', color: 'var(--color-science)' },
  culture: { icon: '\u{1F3AD}', color: 'var(--color-culture)' },
  faith: { icon: '\u26EA', color: 'var(--color-faith)' },
};

export function BuildingCard({ building, isActive, isBuilt, compact, onClick }: BuildingCardProps) {
  const yieldEntries = Object.entries(building.yields).filter(([, v]) => v && v > 0);

  if (compact) {
    const isWonder = building.isWonder === true;
    return (
      <button
        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all text-left w-full ${
          isWonder ? 'shadow-md' : ''
        }`}
        style={{
          backgroundColor: isActive
            ? 'var(--color-accent)'
            : isWonder
            ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)'
            : isBuilt
            ? 'rgba(66, 165, 245, 0.1)'
            : 'var(--color-bg)',
          color: isActive
            ? 'var(--color-bg)'
            : isWonder
            ? 'var(--panel-accent-gold)'
            : 'var(--color-text)',
          border: isWonder
            ? '2px solid var(--panel-accent-gold)'
            : `1px solid ${isActive ? 'var(--color-accent)' : isBuilt ? 'var(--color-science)' : 'var(--color-border)'}`,
          opacity: isBuilt && !isActive ? 0.7 : 1,
          boxShadow: isWonder ? '0 2px 8px rgba(251, 191, 36, 0.3)' : 'none',
        }}
        onClick={onClick}
        disabled={isBuilt}
      >
        <span className="text-sm">{isWonder ? '🏆' : '🏛️'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate">
            {building.name}
            {isBuilt && <span className="ml-1 text-[9px] font-normal" style={{ color: 'var(--color-science)' }}>BUILT</span>}
          </div>
          <div className="text-[10px] flex gap-2" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
            <span>{building.cost} prod</span>
            {yieldEntries.map(([key, val]) => (
              <span key={key} style={{ color: isActive ? undefined : YIELD_ICONS[key]?.color }}>
                +{val} {key}
              </span>
            ))}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className="rounded-lg p-3 cursor-pointer transition-all"
      style={{
        backgroundColor: isActive ? 'var(--color-accent)' : isBuilt ? 'rgba(66, 165, 245, 0.1)' : 'var(--color-bg)',
        color: isActive ? 'var(--color-bg)' : 'var(--color-text)',
        border: `1px solid ${isActive ? 'var(--color-accent)' : isBuilt ? 'var(--color-science)' : 'var(--color-border)'}`,
      }}
      onClick={isBuilt ? undefined : onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{'\u{1F3DB}'}</span>
        <div>
          <div className="text-sm font-bold">
            {building.name}
            {isBuilt && <span className="ml-1 text-[9px] font-normal" style={{ color: 'var(--color-science)' }}>BUILT</span>}
          </div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
            {building.age} · Cost: {building.cost}
            {building.maintenance > 0 && ` · ${building.maintenance}g/turn`}
          </div>
        </div>
      </div>

      {/* Yields */}
      {yieldEntries.length > 0 && (
        <div className="flex gap-2 mt-2">
          {yieldEntries.map(([key, val]) => {
            const yi = YIELD_ICONS[key];
            return (
              <div key={key} className="flex items-center gap-1 text-xs">
                <span>{yi?.icon}</span>
                <span style={{ color: isActive ? 'var(--panel-text-bright)' : yi?.color }}>+{val}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Effects */}
      {building.effects.length > 0 && (
        <div className="mt-1 text-[10px]" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
          {building.effects.join(', ')}
        </div>
      )}

      {/* Requires tech */}
      {building.requiredTech && (
        <div className="mt-1 text-[10px]" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
          Requires: {building.requiredTech.replace(/_/g, ' ')}
        </div>
      )}
    </div>
  );
}
