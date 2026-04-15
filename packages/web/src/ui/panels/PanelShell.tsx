/**
 * PanelShell — shared chrome wrapper for every migrated panel.
 *
 * Renders:
 *   - A positioned container (centered for modal, right column for
 *     overlay/info) using tokens from panel-tokens.css,
 *   - A title bar with close button (×),
 *   - A scrollable body slot for the panel's contents,
 *   - An optional backdrop for modal priority.
 *
 * The shell uses ONLY the CSS custom properties defined in
 * panel-tokens.css for its chrome. Child content can render whatever it
 * wants (Tailwind, raw hex) — PanelShell doesn't enforce that.
 *
 * Close logic is a pure `onClose` callback — the shell holds no state.
 * It's the caller's job (PanelManager, App.tsx) to remove the shell
 * from the tree.
 *
 * Cycle 2 of the panel-manager refactor. No existing panel is migrated
 * to use it yet — cycle 3 starts with HelpPanel.
 */

import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { PanelId, PanelPriority } from './panelRegistry';
// Importing the CSS file from here guarantees the tokens are loaded
// whenever a PanelShell is mounted, without requiring every consumer
// to remember to import it.
import '../../styles/panel-tokens.css';

export type PanelShellWidth = 'narrow' | 'wide' | 'full';

export interface PanelShellProps {
  readonly id: PanelId;
  readonly title: string;
  readonly onClose: () => void;
  /** Default: 'overlay'. */
  readonly priority?: PanelPriority;
  /** Default: 'wide'. */
  readonly width?: PanelShellWidth;
  /**
   * When false, this panel is a blocking modal that cannot be dismissed
   * via chrome: the X button is not rendered, the backdrop click is
   * inert, and `PanelManager`'s ESC handler is instructed (via the
   * `data-dismissible="false"` attribute on the shell root) to leave
   * the panel open. The owning component is responsible for calling
   * `onClose` from within the panel body (e.g. after the player makes
   * a required choice). Default: true.
   */
  readonly dismissible?: boolean;
  readonly children: ReactNode;
}

const WIDTH_PX: Record<PanelShellWidth, string> = {
  narrow: '320px',
  wide:   '480px',
  full:   '720px',
};

const Z_INDEX_VAR: Record<PanelPriority, string> = {
  info:    'var(--panel-z-info)',
  overlay: 'var(--panel-z-overlay)',
  modal:   'var(--panel-z-modal)',
};

function containerStyle(priority: PanelPriority, width: PanelShellWidth): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: 'var(--panel-radius)',
    boxShadow: 'var(--panel-shadow)',
    color: 'var(--panel-text-color)',
    zIndex: Z_INDEX_VAR[priority],
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    overflow: 'hidden',
  };

  if (priority === 'modal') {
    return {
      ...base,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: WIDTH_PX[width],
      maxWidth: '92vw',
    };
  }

  // overlay + info — right-anchored column beneath the TopBar.
  // TopBar is 48px tall (h-12); BottomBar has its own room below.
  return {
    ...base,
    top: '56px',
    right: '8px',
    bottom: '64px',
    width: WIDTH_PX[width],
    maxHeight: 'none',
  };
}

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'var(--panel-backdrop)',
  zIndex: 'var(--panel-z-modal)' as unknown as number,
};

const titleBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--panel-padding-md) var(--panel-padding-lg)',
  borderBottom: '1px solid var(--panel-border)',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--panel-title-color)',
  letterSpacing: '0.02em',
};

const closeButtonStyle: CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--panel-muted-color)',
  cursor: 'pointer',
  fontSize: 'var(--panel-close-icon-size)',
  lineHeight: 1,
  padding: '4px 8px',
  borderRadius: '4px',
};

const bodyStyle: CSSProperties = {
  padding: 'var(--panel-padding-lg)',
  overflowY: 'auto',
  flex: 1,
  color: 'var(--panel-text-color)',
};

export function PanelShell({
  id,
  title,
  onClose,
  priority = 'overlay',
  width = 'wide',
  dismissible = true,
  children,
}: PanelShellProps) {
  // Suppress the browser context menu on panel chrome so right-click on
  // UI feels like a desktop app, not a webpage. Canvas handles its own
  // right-click (gameplay action) and is unaffected.
  const preventContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault();
  };

  // Click-outside-to-close design decision:
  //   - `modal` priority: backdrop click closes (implemented below),
  //     unless `dismissible === false` in which case the backdrop is
  //     inert.
  //   - `overlay` + `info` priorities: X button only. We intentionally do
  //     NOT add a document-level listener here because the TopBar buttons
  //     that open these panels would race with such a listener (the same
  //     click that opened the panel would also close it). Adding proper
  //     click-outside for non-modal panels is a follow-up once TopBar
  //     buttons are tagged with `data-panel-trigger`.
  //
  // Dismissibility contract:
  //   - When `dismissible === false`, the close X is not rendered at
  //     all, the backdrop click is a no-op (still catches
  //     `contextmenu` to suppress the browser menu), and
  //     `PanelManager`'s ESC handler respects the
  //     `data-dismissible="false"` DOM attribute on the shell root so
  //     ESC also cannot close the panel. The owning panel component
  //     is responsible for calling `onClose` after its required user
  //     interaction completes.
  const handleBackdropClick = dismissible ? onClose : undefined;

  return (
    <>
      {priority === 'modal' && (
        <div
          data-testid={`panel-backdrop-${id}`}
          style={backdropStyle}
          aria-hidden="true"
          onClick={handleBackdropClick}
          onContextMenu={preventContextMenu}
        />
      )}
      <div
        data-testid={`panel-shell-${id}`}
        data-panel-id={id}
        data-panel-priority={priority}
        data-panel-width={width}
        data-dismissible={dismissible ? 'true' : 'false'}
        role="dialog"
        aria-label={title}
        style={containerStyle(priority, width)}
        onContextMenu={preventContextMenu}
      >
        <div style={titleBarStyle}>
          <h2 style={titleStyle}>{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              data-testid={`panel-close-${id}`}
              style={closeButtonStyle}
            >
              ×
            </button>
          )}
        </div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </>
  );
}
