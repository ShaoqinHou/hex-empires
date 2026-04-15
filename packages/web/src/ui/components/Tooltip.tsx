/**
 * TooltipContent — standardized body layout for game-element tooltips
 * (units, buildings, technologies, terrains, resources). Used by the
 * components in `tooltips/*` to render a title + subtitle + sectioned
 * stat list with consistent typography and spacing.
 *
 * Cycle (C8) of the post-HUD UI cleanup retired the legacy `Tooltip`
 * wrapper component that used to live alongside `TooltipContent` here.
 * That wrapper duplicated `TooltipShell` (positioning math, viewport
 * clamping) and registered its own window-level `keydown` listener for
 * Alt-tracking, both of which are now owned by the canonical HUD
 * foundation (`packages/web/src/ui/hud/TooltipShell.tsx`,
 * `packages/web/src/hooks/useAltKey.ts`). All real tooltip surfaces in
 * the tree now route through `TooltipShell`; this file is kept solely
 * for the body-layout helper that downstream `tooltips/*` modules still
 * compose.
 *
 * If you need a hover/floating tooltip surface, wrap your content in
 * `<TooltipShell>` and (optionally) compose `<TooltipContent>` inside
 * it for the standardized stat-list body layout.
 */
import React from 'react';

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
  icon?: string;
}

interface TooltipContentProps {
  title: string;
  subtitle?: string;
  sections?: TooltipSection[];
  children?: React.ReactNode;
}

/**
 * TooltipContent provides a standardized layout for tooltip body
 * content. Used by all game element tooltips inside `tooltips/*`. Pure
 * markup — owns no positioning, no keyboard listeners, no z-index.
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
