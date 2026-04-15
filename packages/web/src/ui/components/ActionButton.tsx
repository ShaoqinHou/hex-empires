import React, { useRef, useState } from 'react';
import { TooltipShell } from '../hud/TooltipShell';

interface ActionButtonProps {
  label: string;
  shortcut?: string;
  color: string;
  textColor?: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

/**
 * ActionButton with built-in disabled state feedback and tooltip.
 * When disabled, shows the reason on hover. The disabled-reason tooltip
 * is rendered through `TooltipShell` (id: `tooltip`) so positioning,
 * z-index, and chrome tokens are owned by the canonical HUD shell —
 * no per-component magic offsets / raw colors / `z-50`.
 */
export function ActionButton({
  label,
  shortcut,
  color,
  textColor,
  disabled = false,
  disabledReason,
  onClick,
}: ActionButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const updateAnchor = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Anchor at the button's horizontal center, near its top edge — the
    // shell decides the diagonal offset and viewport clamping.
    setAnchor({ x: rect.left + rect.width / 2, y: rect.top });
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className={`px-3 py-1 text-xs rounded font-bold cursor-pointer flex items-center gap-1 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          backgroundColor: disabled ? 'var(--color-text-muted)' : color,
          color: textColor ?? 'var(--color-bg)',
        }}
        onClick={() => {
          if (!disabled) {
            onClick();
          }
        }}
        onMouseEnter={() => {
          if (!disabled || !disabledReason) return;
          updateAnchor();
          setShowTooltip(true);
        }}
        onMouseLeave={() => setShowTooltip(false)}
        title={disabled ? disabledReason : undefined}
      >
        {label}
        {shortcut && <span className="opacity-50 text-[10px]">[{shortcut}]</span>}
      </button>

      {/* Disabled-state tooltip. Goes through TooltipShell so positioning,
          viewport clamping, and chrome tokens are shared with every other
          tooltip-shaped overlay. */}
      {showTooltip && disabledReason && anchor && (
        <TooltipShell
          id="tooltip"
          anchor={{ kind: 'screen', x: anchor.x, y: anchor.y }}
          position="floating"
          tier="compact"
          offset="small"
        >
          {disabledReason}
        </TooltipShell>
      )}
    </div>
  );
}

interface ActionButtonGroupProps {
  actions: Array<{
    label: string;
    shortcut?: string;
    color: string;
    textColor?: string;
    disabled?: boolean;
    disabledReason?: string;
    onClick: () => void;
  }>;
}

/**
 * ActionButtonGroup renders multiple action buttons in a row.
 */
export function ActionButtonGroup({ actions }: ActionButtonGroupProps) {
  return (
    <div className="flex gap-1.5">
      {actions.map((action, index) => (
        <ActionButton key={index} {...action} />
      ))}
    </div>
  );
}
