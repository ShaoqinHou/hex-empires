/**
 * DramaModal — shared chrome wrapper for ceremony modals.
 *
 * Phase 4.5: Introduces a hero-forward, narrative-shaped shell distinct
 * from PanelShell. Used by AgeTransitionPanel, CrisisPanel, VictoryPanel,
 * and TurnSummaryPanel. Participates in PanelManager identically to
 * PanelShell(modal) — same data attributes, same z-index token, same
 * `data-dismissible` contract.
 *
 * Key differences from PanelShell:
 * - No close (X) button — dismissed only by resolving the ceremony.
 * - `onResolve` replaces `onClose` — semantically: closure = resolution.
 * - Hero slot (portrait / glyph / illustration) at top of the frame.
 * - Display-scale title (Cinzel 36px), optional subtitle.
 * - First-class `choices` prop for primary/secondary/danger CTAs.
 * - `tone` drives accent (triumph/crisis/passage/summary).
 * - `reveal="fade"` wired (animation CSS present); Phase 4.5 defaults
 *   to "instant" — fade implementation is deferred to Phase 6/7.
 *
 * Layout is stacked single-column at standard viewports (< 1920px) and
 * 2-column hero-left at wide/ultra (>= 1920px). useViewportClass() drives
 * the branch; CSS media queries handle token overrides (hero height, etc.).
 */

import type { CSSProperties, ReactNode } from 'react';
import type { PanelId } from './panelRegistry';
import { useViewportClass } from '../../hooks/useViewportClass';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import '../../styles/panel-tokens.css';
import './drama-modal.css';

export type DramaTone = 'triumph' | 'crisis' | 'passage' | 'summary';
export type DramaReveal = 'instant' | 'fade';

export type DramaChoice = {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly tone?: 'primary' | 'secondary' | 'danger';
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

export interface DramaModalProps {
  readonly id: PanelId;
  readonly title: string;
  readonly subtitle?: string;
  readonly hero?: ReactNode;
  /**
   * Override hero slot height in pixels. Defaults to `var(--drama-hero-height)`
   * (240px standard, 320px wide, 360px ultra via CSS @media).
   * Use for panels where the full hero height would feel like wasted real estate
   * (e.g. TurnSummaryPanel uses 120px per spec §11 Q1 recommendation).
   */
  readonly heroHeight?: number;
  readonly body?: ReactNode;
  readonly choices?: ReadonlyArray<DramaChoice>;
  readonly onResolve: () => void;
  readonly tone?: DramaTone;
  /**
   * reveal="fade" is the default from Phase 6.3 onward.
   * Pass reveal="instant" in tests that need synchronous rendering.
   */
  readonly reveal?: DramaReveal;
}

// ── Backdrop ──────────────────────────────────────────────────────────────────

const backdropBaseStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--drama-backdrop)',
  zIndex: 'var(--panel-z-modal)' as unknown as number,
};

// ── Container ─────────────────────────────────────────────────────────────────

function containerStyle(isWide: boolean): CSSProperties {
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: isWide ? 'min(960px, 92vw)' : 'min(720px, 92vw)',
    maxHeight: '90vh',
    overflow: 'hidden',
    backgroundColor: 'var(--panel-bg)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--drama-frame-shadow)',
    color: 'var(--panel-text-color)',
    zIndex: 'var(--panel-z-modal)' as unknown as number,
    display: 'flex',
    flexDirection: 'column',
  };
}

// ── Hero slot ─────────────────────────────────────────────────────────────────

function getHeroSlotStyle(heroHeight?: number): CSSProperties {
  return {
    position: 'relative',
    height: heroHeight !== undefined ? `${heroHeight}px` : 'var(--drama-hero-height)',
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--drama-hero-bg)',
  };
}


const heroVignetteStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--drama-hero-vignette)',
  pointerEvents: 'none',
};

// ── Title area ────────────────────────────────────────────────────────────────

const titleAreaStyle: CSSProperties = {
  padding: 'var(--panel-padding-lg)',
  paddingBottom: 'var(--panel-padding-md)',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  margin: 0,
  // Cinzel display — 36px per spec §3 typography
  fontFamily: 'Cinzel, Georgia, serif',
  fontWeight: 600,
  fontSize: '36px',
  lineHeight: 1.15,
  letterSpacing: '0.02em',
  color: 'var(--panel-title-color)',
};

const subtitleStyle: CSSProperties = {
  marginTop: '4px',
  fontFamily: 'Cinzel, Georgia, serif',
  fontWeight: 500,
  fontSize: '16px',
  color: 'var(--panel-muted-color)',
};

// ── Body ──────────────────────────────────────────────────────────────────────

const bodyStyle: CSSProperties = {
  padding: '0 var(--panel-padding-lg)',
  flex: 1,
  overflowY: 'auto',
  color: 'var(--panel-text-color)',
  maxWidth: '62ch',
};

// ── Choice stack ──────────────────────────────────────────────────────────────

const choiceStackStyle: CSSProperties = {
  padding: 'var(--panel-padding-md) var(--panel-padding-lg) var(--panel-padding-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--drama-choice-gap)',
  flexShrink: 0,
};

function choiceButtonStyle(tone: 'primary' | 'secondary' | 'danger'): CSSProperties {
  const base: CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    borderRadius: '6px',
    fontFamily: 'Cinzel, Georgia, serif',
    fontWeight: 500,
    fontSize: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'opacity 0.15s',
    border: '1px solid transparent',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };
  if (tone === 'primary') {
    return {
      ...base,
      backgroundColor: 'var(--panel-accent-gold)',
      color: 'var(--panel-turn-badge-text)',
      borderColor: 'var(--panel-accent-gold)',
    };
  }
  if (tone === 'danger') {
    return {
      ...base,
      backgroundColor: 'transparent',
      color: 'var(--panel-text-color)',
      borderColor: 'var(--color-danger)',
    };
  }
  // secondary (default)
  return {
    ...base,
    backgroundColor: 'transparent',
    color: 'var(--panel-text-color)',
    borderColor: 'var(--panel-border)',
  };
}

const choiceHintStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--panel-muted-color)',
  fontFamily: 'inherit',
  fontWeight: 400,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DramaModal({
  id,
  title,
  subtitle,
  hero,
  heroHeight,
  body,
  choices,
  onResolve,
  tone = 'passage',
  reveal = 'fade',
}: DramaModalProps) {
  const vc = useViewportClass();
  const isWide = vc === 'wide' || vc === 'ultra';
  const reducedMotion = useReducedMotion();

  // Suppress browser context menu on the chrome surface.
  const preventContextMenu = (e: React.MouseEvent) => e.preventDefault();

  // For 2-column layout (wide/ultra): hero sits left (CSS grid),
  // content (title + body + choices) on the right.
  // reveal="fade" applies CSS animation classes; reduced-motion data attr
  // lets tests assert that the hook result reaches the DOM.
  const revealClass = reveal === 'fade' ? 'drama-modal-reveal' : '';
  const backdropRevealClass = reveal === 'fade' ? 'drama-backdrop-reveal' : '';

  const heroNode = hero !== undefined && hero !== null ? (
    <div style={getHeroSlotStyle(heroHeight)} className="drama-hero-slot" aria-hidden="true">
      {hero}
      <div style={heroVignetteStyle} />
    </div>
  ) : null;

  const contentNode = (
    <div
      className="drama-content-col"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    >
      {/* Title + subtitle */}
      <div style={titleAreaStyle}>
        <h2 style={titleStyle}>{title}</h2>
        {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
      </div>

      {/* Narrative body */}
      {body !== undefined && body !== null && (
        <div style={bodyStyle}>{body}</div>
      )}

      {/* Choice stack */}
      {choices && choices.length > 0 && (
        <div style={choiceStackStyle}>
          {choices.map(choice => (
            <button
              key={choice.id}
              type="button"
              disabled={choice.disabled}
              style={{
                ...choiceButtonStyle(choice.tone ?? 'secondary'),
                opacity: choice.disabled ? 0.5 : 1,
              }}
              onClick={choice.onSelect}
              onContextMenu={preventContextMenu}
            >
              <span>{choice.label}</span>
              {choice.hint && (
                <span style={choiceHintStyle}>{choice.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop — same z-index as container; rendered first (behind). */}
      <div
        data-testid={`panel-backdrop-${id}`}
        className={backdropRevealClass}
        style={backdropBaseStyle}
        aria-hidden="true"
        onContextMenu={preventContextMenu}
      />

      {/* Modal container */}
      <div
        data-testid={`panel-shell-${id}`}
        data-panel-id={id}
        data-panel-priority="modal"
        data-panel-tone={tone}
        data-dismissible="false"
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
        role="dialog"
        aria-label={title}
        className={`drama-modal ${revealClass}`}
        style={containerStyle(isWide)}
        onContextMenu={preventContextMenu}
      >
        {isWide ? (
          // 2-column layout for wide/ultra
          <div
            className="drama-modal-layout-2col"
            style={{ flex: 1, overflow: 'hidden', display: 'grid' }}
          >
            {heroNode}
            {contentNode}
          </div>
        ) : (
          // Stacked single-column for standard
          <>
            {heroNode}
            {contentNode}
          </>
        )}
      </div>
    </>
  );
}
