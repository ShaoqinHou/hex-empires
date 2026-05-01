// @vitest-environment jsdom

/**
 * GameProvider — placementMode state coverage.
 *
 * Cycle 3 of the building-placement rework wires a pure UI-state picker
 * onto the provider. See `.codex/workflow/design/building-placement-rework.md`
 * §4.1 for the shape; here we exercise:
 *   1. initial placementMode is null,
 *   2. enterPlacementMode sets it,
 *   3. exitPlacementMode clears it,
 *   4. ESC at window capture phase clears it when active.
 *
 * The provider is rendered without any engine state — the placement picker
 * deliberately lives outside GameState so it works before a game is set up.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { GameProvider, useGame } from '../GameProvider';

interface Capture {
  placementMode: { cityId: string; buildingId: string } | null;
  enter: (cityId: string, buildingId: string) => void;
  exit: () => void;
}

const captured: Capture = {
  placementMode: null,
  enter: () => undefined,
  exit: () => undefined,
};

function Probe() {
  const ctx = useGame();
  captured.placementMode = ctx.placementMode;
  captured.enter = ctx.enterPlacementMode;
  captured.exit = ctx.exitPlacementMode;
  return null;
}

afterEach(() => {
  cleanup();
  captured.placementMode = null;
  captured.enter = () => undefined;
  captured.exit = () => undefined;
});

describe('GameProvider — placementMode (Cycle 3)', () => {
  it('initial placementMode is null', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    expect(captured.placementMode).toBeNull();
  });

  it('enterPlacementMode sets { cityId, buildingId }', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    expect(captured.placementMode).toBeNull();

    act(() => {
      captured.enter('rome', 'library');
    });

    expect(captured.placementMode).toEqual({ cityId: 'rome', buildingId: 'library' });
  });

  it('exitPlacementMode clears the state back to null', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );

    act(() => {
      captured.enter('athens', 'granary');
    });
    expect(captured.placementMode).toEqual({ cityId: 'athens', buildingId: 'granary' });

    act(() => {
      captured.exit();
    });
    expect(captured.placementMode).toBeNull();
  });

  it('ESC keypress at window level clears placementMode when active', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );

    act(() => {
      captured.enter('rome', 'library');
    });
    expect(captured.placementMode).toEqual({ cityId: 'rome', buildingId: 'library' });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(captured.placementMode).toBeNull();
  });

  it('ESC keypress is a no-op when placementMode is already null', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );
    expect(captured.placementMode).toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(captured.placementMode).toBeNull();
  });

  it('enterPlacementMode overwrites an existing placement selection', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );

    act(() => {
      captured.enter('rome', 'library');
    });
    act(() => {
      captured.enter('athens', 'granary');
    });

    expect(captured.placementMode).toEqual({ cityId: 'athens', buildingId: 'granary' });
  });
});
