/**
 * KeyBadge — small keyboard-shortcut indicator badge rendered at the
 * top-right corner of a button. Positioned via `position: absolute` so the
 * parent button must be `position: relative`.
 *
 * Uses token-only chrome — no raw hex colors.
 */

interface KeyBadgeProps {
  readonly letter: string;
}

export function KeyBadge({ letter }: KeyBadgeProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '-2px',
        right: '-2px',
        color: 'var(--panel-muted-color)',
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        fontSize: '10px',
        lineHeight: '1',
        padding: '0 4px',
        borderRadius: 'var(--panel-radius)',
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: 'monospace',
        fontWeight: 500,
      }}
    >
      {letter.toUpperCase()}
    </span>
  );
}
