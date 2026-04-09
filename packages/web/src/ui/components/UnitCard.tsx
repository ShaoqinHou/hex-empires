import type { UnitDef } from '@hex/engine';

interface UnitCardProps {
  unit: UnitDef;
  isActive?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  melee: '\u2694',     // crossed swords
  ranged: '\u{1F3F9}', // bow
  cavalry: '\u{1F40E}', // horse
  siege: '\u{1F4A3}',  // bomb
  naval: '\u26F5',     // sailboat
  civilian: '\u{1F3E0}', // house
  religious: '\u2721', // star of david
};

const CATEGORY_COLORS: Record<string, string> = {
  melee: '#e53935',
  ranged: '#42a5f5',
  cavalry: '#ff9800',
  siege: '#78909c',
  naval: '#26c6da',
  civilian: '#66bb6a',
  religious: '#ab47bc',
};

export function UnitCard({ unit, isActive, compact, onClick }: UnitCardProps) {
  const catColor = CATEGORY_COLORS[unit.category] ?? '#999';
  const catIcon = CATEGORY_ICONS[unit.category] ?? '?';

  if (compact) {
    return (
      <button
        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all text-left w-full"
        style={{
          backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg)',
          color: isActive ? 'var(--color-bg)' : 'var(--color-text)',
          border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
        }}
        onClick={onClick}
      >
        <span className="text-sm" style={{ color: isActive ? 'var(--color-bg)' : catColor }}>{catIcon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate">{unit.name}</div>
          <div className="text-[10px] flex gap-2" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
            <span>{unit.cost} prod</span>
            {unit.combat > 0 && <span style={{ color: isActive ? undefined : 'var(--color-production)' }}>Str {unit.combat}</span>}
            {unit.rangedCombat > 0 && <span style={{ color: isActive ? undefined : 'var(--color-science)' }}>Rng {unit.rangedCombat}</span>}
            <span>Move {unit.movement}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className="rounded-lg p-3 cursor-pointer transition-all"
      style={{
        backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg)',
        color: isActive ? 'var(--color-bg)' : 'var(--color-text)',
        border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg" style={{ color: isActive ? 'var(--color-bg)' : catColor }}>{catIcon}</span>
        <div>
          <div className="text-sm font-bold">{unit.name}</div>
          <div className="text-[10px] uppercase tracking-wide" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
            {unit.category} · {unit.age}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1 mt-2">
        <StatBadge label="Cost" value={unit.cost} color="var(--color-production)" active={isActive} />
        {unit.combat > 0 && <StatBadge label="Str" value={unit.combat} color="var(--color-production)" active={isActive} />}
        {unit.rangedCombat > 0 && <StatBadge label="Rng" value={unit.rangedCombat} color="var(--color-science)" active={isActive} />}
        {unit.range > 0 && <StatBadge label="Range" value={unit.range} color="var(--color-science)" active={isActive} />}
        <StatBadge label="Move" value={unit.movement} color="var(--color-accent)" active={isActive} />
      </div>

      {/* Abilities */}
      {unit.abilities.length > 0 && (
        <div className="mt-2 text-[10px]" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
          {unit.abilities.map(a => a.replace(/_/g, ' ')).join(', ')}
        </div>
      )}

      {/* Requires tech */}
      {unit.requiredTech && (
        <div className="mt-1 text-[10px]" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)' }}>
          Requires: {unit.requiredTech.replace(/_/g, ' ')}
        </div>
      )}

      {/* Upgrade path */}
      {unit.upgradesTo && (
        <div className="mt-1 text-[10px]" style={{ color: isActive ? 'var(--color-bg)' : 'var(--color-accent)' }}>
          Upgrades to: {unit.upgradesTo.replace(/_/g, ' ')}
        </div>
      )}
    </div>
  );
}

function StatBadge({ label, value, color, active }: { label: string; value: number; color: string; active?: boolean }) {
  return (
    <div className="text-center rounded px-1 py-0.5"
      style={{ backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)' }}>
      <div className="text-[9px]" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)' }}>{label}</div>
      <div className="text-xs font-bold" style={{ color: active ? '#fff' : color }}>{value}</div>
    </div>
  );
}
