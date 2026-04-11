import React, { useState, useRef, useEffect } from 'react';

export interface TooltipPosition {
  x: number;
  y: number;
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'cursor';
  delay?: number; // ms before showing tooltip
  disabled?: boolean;
  showOnAltOnly?: boolean; // Only show when Alt key is pressed
  className?: string;
}

/**
 * Rich tooltip component following Civ VII style.
 * Shows content on hover with optional delay and Alt-key requirement.
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 500,
  disabled = false,
  showOnAltOnly = false,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ x: 0, y: 0 });
  const [isAltPressed, setIsAltPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(true);
        // If Alt is pressed and we're hovering, show immediately
        if (isVisible && showOnAltOnly) {
          showTooltip();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        setIsAltPressed(false);
        if (showOnAltOnly) {
          hideTooltip();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isVisible, showOnAltOnly]);

  const showTooltip = () => {
    if (disabled) return;
    if (showOnAltOnly && !isAltPressed) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom;
        break;
      case 'left':
        x = rect.left;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right;
        y = rect.top + rect.height / 2;
        break;
      case 'cursor':
        x = rect.left + rect.width / 2;
        y = rect.bottom + 10;
        break;
    }

    setTooltipPos({ x, y });
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;

    if (showOnAltOnly && !isAltPressed) {
      // Just mark as ready to show, don't show yet
      return;
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(showTooltip, delay);
    } else {
      showTooltip();
    }
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (position === 'cursor' && isVisible) {
      setTooltipPos({ x: e.clientX, y: e.clientY + 15 });
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        className={className}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      {isVisible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: position === 'top' || position === 'bottom'
              ? 'translateX(-50%) translateY(-100%)'
              : position === 'left'
              ? 'translateX(-100%) translateY(-50%)'
              : position === 'right'
              ? 'translateY(-50%)'
              : 'translateX(-50%)',
            marginTop: position === 'top' ? '-8px' : position === 'bottom' ? '8px' : '0',
            marginLeft: position === 'left' ? '-8px' : position === 'right' ? '8px' : '0',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

interface TooltipContentProps {
  title: string;
  subtitle?: string;
  sections?: TooltipSection[];
  children?: React.ReactNode;
}

export interface TooltipSection {
  title?: string;
  items: TooltipItem[];
}

export interface TooltipItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

/**
 * TooltipContent provides a standardized layout for tooltip content.
 * Used by all game element tooltips.
 */
export function TooltipContent({ title, subtitle, sections, children }: TooltipContentProps) {
  return (
    <div
      className="px-3 py-2 rounded-lg shadow-xl border max-w-xs"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Title */}
      <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--color-text)' }}>
        {title}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {subtitle}
        </div>
      )}

      {/* Sections */}
      {sections?.map((section, idx) => (
        <div key={idx} className={idx > 0 ? 'mt-2 pt-2' : ''} style={{ borderTop: idx > 0 ? '1px solid var(--color-border)' : undefined }}>
          {section.title && (
            <div className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
              {section.title}
            </div>
          )}
          <div className="space-y-0.5">
            {section.items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                <span className="flex items-center gap-1" style={{ color: item.color || 'var(--color-text)' }}>
                  {item.icon && <span>{item.icon}</span>}
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Custom content */}
      {children}
    </div>
  );
}
