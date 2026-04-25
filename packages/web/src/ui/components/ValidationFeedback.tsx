import { useEffect, type CSSProperties } from 'react';
import type { ValidationResult } from '@hex/engine';
import { useHUDManager } from '../hud/HUDManager';
import { TooltipShell } from '../hud/TooltipShell';

// Derived locally — the engine exports `ValidationResult` but not the
// category union. Keep in sync with
// `packages/engine/src/types/GameState.ts::ValidationErrorCategory`.
type ValidationErrorCategory = Exclude<ValidationResult, { valid: true }>['category'];

interface ValidationFeedbackProps {
  readonly validation: ValidationResult | null;
  readonly onAnimationEnd?: () => void;
}

/**
 * ValidationFeedback displays visual feedback when an action is invalid.
 * Shows a toast bubble through `TooltipShell` (HUD chrome), a shake
 * animation tint overlay, and plays an error sound.
 *
 * HUD cycle (h-1): migrated from hand-rolled Tailwind gradients to
 * `<TooltipShell>` + `var(--hud-validation-*)` tokens. The current
 * `ValidationResult` payload carries no spatial info (no tile, no
 * screen coords), so the shell uses `position="fixed-corner"` — the
 * overlay pins to a fixed screen corner rather than floating near the
 * failed action's anchor.
 *
 * Phase 6d UI-C-VF1: visibility derives from `HUDManager.isActive` —
 * the manager's registration map is the single source of truth.
 * Previously the component shadowed this with a local
 * `useState<boolean>(isVisible)` toggled by a separate `useEffect`,
 * the exact antipattern documented in `.claude/rules/ui-overlays.md`
 * and the one the blind-eval J-shortcut agent copied (review finding
 * F-1196b755). Cleaning the exemplar here removes the transmission
 * vector so future HUD agents don't inherit the drift. The shake
 * animation's lifetime is identical to the toast's, so it's also
 * derived from `isActive` — no second visibility state.
 *
 * TODO(hud-cycle-later): enrich `ValidationResult` with an optional
 * `anchor: HexCoord | ScreenCoord` field so the shell can use
 * `position="floating"` and render next to the actual tile / button
 * that rejected the action.
 */
export function ValidationFeedback({ validation, onAnimationEnd }: ValidationFeedbackProps) {
  const { register, dismiss, isActive } = useHUDManager();
  // Single source of truth for visibility: HUDManager registration.
  const isVisible = isActive('validationFeedback');

  useEffect(() => {
    if (!validation || validation.valid) return undefined;

    // Register as sticky so ESC dismisses via the manager's precedence
    // chain (panels first, then sticky overlays). When ESC fires and
    // the manager calls dismiss(), it stops propagation so the canvas
    // ESC-deselect handler does not fire — preserving the player's
    // unit selection. Non-ESC auto-hide is handled by the timer below.
    const unregister = register('validationFeedback', { sticky: true });
    playErrorSound();

    // Auto-hide after 3 seconds. Calling dismiss() is the one thing
    // that flips isVisible (through the registration map); there is
    // no second `setIsVisible` to keep in sync.
    const timer = setTimeout(() => {
      dismiss('validationFeedback');
      onAnimationEnd?.();
    }, 3000);

    return () => {
      clearTimeout(timer);
      unregister();
    };
  }, [validation, register, dismiss, onAnimationEnd]);

  if (!validation || !isVisible || validation.valid) {
    return null;
  }

  // The shake tint overlay has the same lifetime as the toast body,
  // so it's gated on isVisible too rather than a second animation flag.
  const isAnimating = isVisible;

  const icon = CATEGORY_ICONS[validation.category];
  const accentVar = CATEGORY_ACCENT_VARS[validation.category];

  const bubbleStyle: CSSProperties = {
    backgroundColor: 'var(--hud-validation-bg)',
    border: '1px solid var(--hud-validation-border)',
    borderLeft: `4px solid ${accentVar}`,
    color: 'var(--hud-validation-text)',
    borderRadius: 'var(--hud-radius)',
    boxShadow: 'var(--hud-shadow)',
    minWidth: '300px',
    maxWidth: '28rem',
  };

  return (
    <>
      {/* Toast bubble via TooltipShell — `fixed-corner` because the
          validation payload has no anchor coords yet (see TODO above). */}
      <TooltipShell
        id="validationFeedback"
        anchor={{ kind: 'screen', x: 0, y: 0 }}
        position="fixed-corner"
        tier="detailed"
        sticky
      >
        <div
          data-testid="validation-feedback-bubble"
          className={`flex items-center gap-3 px-4 py-3 ${isAnimating ? 'animate-slide-down' : ''}`}
          style={bubbleStyle}
          role="alert"
          aria-live="assertive"
        >
          <span className="text-2xl" style={{ color: accentVar }} aria-hidden="true">
            {icon}
          </span>
          <div className="flex-1">
            <div
              className="font-semibold text-sm uppercase tracking-wide"
              style={{ color: 'var(--hud-validation-text-muted)' }}
            >
              {validation.category} Error
            </div>
            <div
              className="text-base font-medium mt-1"
              style={{ color: 'var(--hud-validation-text)' }}
            >
              {validation.reason}
            </div>
          </div>
        </div>
      </TooltipShell>

      {/* Shake animation tint overlay — a full-viewport red wash. Kept
          outside the shell because it's a screen-wide effect, not a
          cursor-anchored tooltip. */}
      {isAnimating && (
        <div
          data-testid="validation-feedback-shake"
          className="fixed inset-0 pointer-events-none animate-shake"
          style={{ zIndex: 'var(--hud-z-fixed-corner)' }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'var(--hud-validation-shake-tint)' }}
          />
        </div>
      )}
    </>
  );
}

const CATEGORY_ICONS: Readonly<Record<ValidationErrorCategory, string>> = {
  movement: '🚶',
  combat: '⚔️',
  production: '🔨',
  general: '⚠️',
};

const CATEGORY_ACCENT_VARS: Readonly<Record<ValidationErrorCategory, string>> = {
  movement: 'var(--hud-validation-icon-warn)',
  combat: 'var(--hud-validation-icon-error)',
  production: 'var(--hud-validation-icon-production)',
  general: 'var(--hud-validation-icon-general)',
};

/**
 * Play a short error beep sound using Web Audio API
 */
function playErrorSound(): void {
  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const audioContext = new AudioCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 200; // Low tone for error
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Silently fail if audio is not supported or blocked
  }
}
