// Reusable horizontal progress bar with optional label.

interface ProgressBarProps {
  readonly value: number;       // 0–1
  readonly color?: string;      // CSS string, default var(--color-accent)
  readonly trackColor?: string; // default rgba(255,255,255,0.08)
  readonly height?: number;     // px, default 8
  readonly showLabel?: boolean; // show "N%" at right
  readonly label?: string;      // custom label text (overrides percentage)
}

export function ProgressBar({
  value,
  color = 'var(--color-accent)',
  trackColor = 'rgba(255,255,255,0.08)',
  height = 8,
  showLabel,
  label,
}: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, backgroundColor: trackColor }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span
          className="text-[10px] min-w-[2.5rem] text-right"
          style={{ color: 'var(--panel-muted-color)' }}
        >
          {label ?? `${pct}%`}
        </span>
      )}
    </div>
  );
}
