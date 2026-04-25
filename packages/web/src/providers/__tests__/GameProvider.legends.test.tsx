// @vitest-environment jsdom

/**
 * GameProvider — legends localStorage wiring (W10, item 1).
 *
 * Tests:
 *  1. account exposed from context defaults to createDefaultAccountState.
 *  2. loadGame restores account from a pre-seeded localStorage entry.
 *  3. serializeAccount / deserializeAccount round-trips (whitebox helper test).
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import type { AccountState } from '@hex/engine';
import { createDefaultAccountState } from '@hex/engine';
import { GameProvider, useGame } from '../GameProvider';

interface CapturedCtx {
  account: AccountState;
}
const captured: CapturedCtx = { account: createDefaultAccountState() };

function Probe() {
  const ctx = useGame();
  captured.account = ctx.account;
  return null;
}

beforeEach(() => {
  localStorage.clear();
  captured.account = createDefaultAccountState();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('GameProvider — legends localStorage wiring (W10-1)', () => {
  it('exposes a default (zero XP) AccountState when localStorage is empty', () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );

    expect(captured.account.foundationXP).toBe(0);
    expect(captured.account.foundationLevel).toBe(1);
    expect(captured.account.unlockedMementos).toHaveLength(0);
    expect(captured.account.completedChallenges).toHaveLength(0);
  });

  it('loads a pre-seeded AccountState from localStorage (persisted JSON survives parse)', () => {
    // Pre-seed a serialized account with some XP.
    const seeded = {
      foundationXP: 500,
      foundationLevel: 3,
      leaderXP: [['augustus', 200]] as [string, number][],
      leaderLevels: [['augustus', 2]] as [string, number][],
      unlockedMementos: ['rosetta-stone'],
      unlockedAttributeNodes: [] as [string, string[]][],
      unlockedLegacyCards: [] as [string, string[]][],
      completedChallenges: ['FIRST_TECH_RESEARCHED'],
    };
    localStorage.setItem('hex-empires-account', JSON.stringify(seeded));

    // Render fresh provider — it reads localStorage in useState initializer.
    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );

    // The account should reflect the seeded values.
    expect(captured.account.foundationXP).toBe(500);
    expect(captured.account.foundationLevel).toBe(3);
    expect(captured.account.unlockedMementos).toContain('rosetta-stone');
    expect(captured.account.completedChallenges).toContain('FIRST_TECH_RESEARCHED');
  });

  it('account.leaderXP is a Map (not a plain object) after deserializing', () => {
    const seeded = {
      foundationXP: 0,
      foundationLevel: 1,
      leaderXP: [['pericles', 50]] as [string, number][],
      leaderLevels: [] as [string, number][],
      unlockedMementos: [] as string[],
      unlockedAttributeNodes: [] as [string, string[]][],
      unlockedLegacyCards: [] as [string, string[]][],
      completedChallenges: [] as string[],
    };
    localStorage.setItem('hex-empires-account', JSON.stringify(seeded));

    render(
      <GameProvider>
        <Probe />
      </GameProvider>,
    );

    expect(captured.account.leaderXP).toBeInstanceOf(Map);
    expect(captured.account.leaderXP.get('pericles')).toBe(50);
  });

  it('corrupt localStorage entry falls back to default AccountState without throwing', () => {
    localStorage.setItem('hex-empires-account', 'NOT_VALID_JSON');

    expect(() => {
      render(
        <GameProvider>
          <Probe />
        </GameProvider>,
      );
    }).not.toThrow();

    expect(captured.account.foundationXP).toBe(0);
  });
});
