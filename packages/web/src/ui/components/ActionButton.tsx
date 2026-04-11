import React, { useState } from 'react';

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
 * When disabled, shows the reason on hover.
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

  return (
    <div className="relative">
      <button
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
        onMouseEnter={() => disabled && disabledReason && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={disabled ? disabledReason : undefined}
      >
        {label}
        {shortcut && <span className="opacity-50 text-[10px]">[{shortcut}]</span>}
      </button>

      {/* Tooltip for disabled state */}
      {showTooltip && disabledReason && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap z-50"
          style={{
            backgroundColor: 'var(--color-health-low)',
            color: 'var(--color-bg)',
          }}>
          {disabledReason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-health-low"
            style={{
              borderTopColor: 'var(--color-health-low)',
            }} />
        </div>
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
