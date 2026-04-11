import React, { useState, useRef } from 'react';

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface TooltipSection {
  title?: string;
  items: TooltipItem[];
}

export interface TooltipItem {
  label: string;
  value: string | number;
  color?: string;
}

export interface TooltipProps {
  children: React.ReactElement;
  content: TooltipSection[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ children, content, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setCoords({ x: rect.left + rect.width / 2, y: rect.top });
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      })}
      {isVisible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${coords.x}px`,
            top: `${coords.y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <TooltipContent sections={content} />
        </div>
      )}
    </>
  );
}

export function TooltipContent({ sections }: { sections: TooltipSection[] }) {
  return (
    <div
      className="rounded p-3 shadow-lg"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        maxWidth: '300px',
      }}
    >
      {sections.map((section, idx) => (
        <div key={idx} className={idx > 0 ? 'mt-2' : ''}>
          {section.title && (
            <div
              className="text-xs font-semibold mb-1 uppercase tracking-wide"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {section.title}
            </div>
          )}
          <div className="space-y-1">
            {section.items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex justify-between gap-4 text-sm">
                <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                <span className="font-semibold" style={{ color: item.color || 'var(--color-text)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
