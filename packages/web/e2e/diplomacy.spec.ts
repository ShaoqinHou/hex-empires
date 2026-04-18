import { test, expect, Page } from '@playwright/test';

/**
 * Diplomacy system E2E spec.
 *
 * Engine semantics (see packages/engine/src/systems/diplomacySystem.ts):
 *   - DiplomacyProposal types: 'DECLARE_WAR' | 'PROPOSE_PEACE' | 'PROPOSE_ALLIANCE'
 *     | 'PROPOSE_FRIENDSHIP' | 'DENOUNCE'
 *   - DECLARE_WAR requires warType 'formal' (needs relationship < -60) or 'surprise' (any).
 *   - DiplomaticStatus: 'helpful' | 'friendly' | 'neutral' | 'unfriendly' | 'hostile' | 'war'.
 *   - Relations keyed by sorted "p1:p2" in state.diplomacy.relations.
 *   - Source of a proposal is state.currentPlayerId — so dispatches must happen during the
 *     human turn (turn 1 phase 'actions' satisfies this).
 */

const VALID_STATUSES = [
  'helpful',
  'friendly',
  'neutral',
  'unfriendly',
  'hostile',
  'war',
] as const;

async function startGameWithAI(page: Page, numAI = 2, seed = 2) {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.reload();
  await page.waitForTimeout(300);
  if (numAI !== 1) {
    const label = numAI === 1 ? 'opponent' : 'opponents';
    const btn = page.getByRole('button', {
      name: new RegExp(`${numAI}\\s*${label}`, 'i'),
    });
    if ((await btn.count()) > 0) await btn.first().click();
    await page.waitForTimeout(120);
  }
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(300);
}

async function dispatch(page: Page, action: Record<string, any>) {
  await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  await page.waitForTimeout(80);
}

interface DiploSnapshot {
  turn: number;
  currentPlayerId: string;
  players: Array<{ id: string; isHuman: boolean }>;
  relations: Array<{
    key: string;
    status: string;
    relationship: number;
    turnsAtWar: number;
    turnsAtPeace: number;
    warSupport: number;
    hasAlliance: boolean;
    hasFriendship: boolean;
    hasDenounced: boolean;
    warDeclarer: string | null;
  }>;
}

async function diploSnapshot(page: Page): Promise<DiploSnapshot> {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    const players = [...s.players.entries()].map(([id, p]: [string, any]) => ({
      id: String(id),
      isHuman: Boolean(p.isHuman),
    }));
    const relations = s.diplomacy?.relations
      ? [...s.diplomacy.relations.entries()].map(([key, r]: [string, any]) => ({
          key: String(key),
          status: String(r.status),
          relationship: Number(r.relationship ?? 0),
          turnsAtWar: Number(r.turnsAtWar ?? 0),
          turnsAtPeace: Number(r.turnsAtPeace ?? 0),
          warSupport: Number(r.warSupport ?? 0),
          hasAlliance: Boolean(r.hasAlliance),
          hasFriendship: Boolean(r.hasFriendship),
          hasDenounced: Boolean(r.hasDenounced),
          warDeclarer: r.warDeclarer ?? null,
        }))
      : [];
    return {
      turn: Number(s.turn),
      currentPlayerId: String(s.currentPlayerId),
      players,
      relations,
    };
  });
}

async function dismissBlockingEvents(page: Page) {
  // handleStartTurn adds blocksTurn:true events when enemy units are near the
  // human capital.  handleEndTurn rejects END_TURN until these are dismissed.
  // In turn-advancing tests we don't care about those notifications, so dismiss
  // them automatically — exactly what a human player clicking "OK" would do.
  await page.evaluate(() => {
    const s = (window as any).__gameState;
    const d = (window as any).__gameDispatch;
    if (!s || !d) return;
    const pid: string = s.currentPlayerId;
    const t: number = s.turn;
    for (const e of (s.log as Array<Record<string, unknown>>)) {
      if (
        e['blocksTurn'] === true &&
        e['dismissed'] !== true &&
        e['turn'] === t &&
        e['playerId'] === pid
      ) {
        d({ type: 'DISMISS_EVENT', eventMessage: e['message'], eventTurn: e['turn'] });
      }
    }
  });
  await page.waitForTimeout(80);
}

async function advanceTurns(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const before = await page.evaluate(() => (window as any).__gameState.turn);
    await dismissBlockingEvents(page);
    await dispatch(page, { type: 'END_TURN' });
    await page.waitForFunction(
      (b) => ((window as any).__gameState?.turn ?? 0) > b,
      before,
      { timeout: 100000 },
    );
  }
}

function relationKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

test.describe('Diplomacy system', () => {
  test('initial state exposes players and a relations map (lazily populated)', async ({ page }) => {
    await startGameWithAI(page, 2);
    const snap = await diploSnapshot(page);

    expect(snap.players.length).toBe(3);
    const humans = snap.players.filter((p) => p.isHuman);
    expect(humans.length).toBe(1);

    // Relations are created on demand (engine uses defaultRelation() when first queried).
    // On turn 1 before any diplomatic action, relations may be empty or partially populated
    // depending on AI behaviour. Any entries that do exist must have well-formed keys and
    // valid status enum values.
    for (const rel of snap.relations) {
      const parts = rel.key.split(':');
      expect(parts.length).toBe(2);
      expect(parts[0] < parts[1]).toBe(true);
      expect(VALID_STATUSES).toContain(rel.status as any);
    }
  });

  test('human-vs-AI relation starts non-war when first observed (default neutral)', async ({ page }) => {
    await startGameWithAI(page, 2);
    const snap = await diploSnapshot(page);

    expect(snap.turn).toBe(1);
    const human = snap.players.find((p) => p.isHuman)!;
    const ais = snap.players.filter((p) => !p.isHuman);
    expect(ais.length).toBe(2);

    // For each human-AI pair: either the relation is absent (defaultRelation → neutral)
    // or it exists and is non-war, non-allied. No hostile pre-existing state.
    for (const ai of ais) {
      const key = relationKey(human.id, ai.id);
      const rel = snap.relations.find((r) => r.key === key);
      if (rel) {
        expect(rel.status).not.toBe('war');
        expect(rel.status).not.toBe('helpful');
        expect(rel.turnsAtWar).toBe(0);
        expect(rel.hasAlliance).toBe(false);
        expect(rel.warDeclarer).toBeNull();
        expect(VALID_STATUSES).toContain(rel.status as any);
      }
    }
  });

  test('declaring surprise war flips relation to war with correct declarer and counters', async ({ page }) => {
    await startGameWithAI(page, 2);
    const before = await diploSnapshot(page);
    const human = before.players.find((p) => p.isHuman)!;
    const ai = before.players.find((p) => !p.isHuman)!;
    expect(before.currentPlayerId).toBe(human.id);

    await dispatch(page, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: ai.id,
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });

    const after = await diploSnapshot(page);
    const key = relationKey(human.id, ai.id);
    const rel = after.relations.find((r) => r.key === key)!;
    expect(rel.status).toBe('war');
    expect(rel.status).not.toBe('neutral');
    expect(rel.status).not.toBe('friendly');
    expect(rel.status).not.toBe('helpful');
    expect(rel.warDeclarer).toBe(human.id);
    expect(rel.hasAlliance).toBe(false);
    expect(rel.hasFriendship).toBe(false);
    // Surprise war gives defender war support (warSupport goes negative from 0).
    expect(rel.warSupport).toBeLessThanOrEqual(0);
    // Relationship drops by 40 from neutral (0) on war declaration.
    expect(rel.relationship).toBeLessThan(0);
  });

  test('war persists across 5 natural turns (no auto-resolve)', async ({ page }) => {
    await startGameWithAI(page, 2);
    const before = await diploSnapshot(page);
    const human = before.players.find((p) => p.isHuman)!;
    const ai = before.players.find((p) => !p.isHuman)!;

    await dispatch(page, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: ai.id,
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });

    const key = relationKey(human.id, ai.id);
    const midSnap = await diploSnapshot(page);
    expect(midSnap.relations.find((r) => r.key === key)!.status).toBe('war');

    await advanceTurns(page, 5);
    const after = await diploSnapshot(page);
    const rel = after.relations.find((r) => r.key === key)!;
    expect(rel.status).toBe('war');
    expect(rel.turnsAtWar).toBeGreaterThanOrEqual(5);
  });

  test('peace after war restores non-war status', async ({ page }) => {
    await startGameWithAI(page, 2);
    const before = await diploSnapshot(page);
    const human = before.players.find((p) => p.isHuman)!;
    const ai = before.players.find((p) => !p.isHuman)!;
    const key = relationKey(human.id, ai.id);

    // Declare war (surprise bypasses relationship gate).
    await dispatch(page, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: ai.id,
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });

    // Advance enough turns for peace to auto-accept:
    //   engine accepts peace when turnsAtWar >= 5 OR |warSupport| <= 20.
    //   surprise war starts warSupport at -50, which decays by 5/turn toward 0.
    //   Six turns of decay leaves |warSupport| = 20 AND turnsAtWar = 6 → accepted.
    await advanceTurns(page, 6);

    // Wait until we are back on the human turn before dispatching the peace proposal
    // (source of proposal is state.currentPlayerId). END_TURN in the pipeline advances
    // through all players, so we should be back on human when the new turn starts.
    await page.waitForFunction(
      (humanId) => (window as any).__gameState?.currentPlayerId === humanId,
      human.id,
      { timeout: 10000 },
    );

    await dispatch(page, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: ai.id,
      proposal: { type: 'PROPOSE_PEACE' },
    });

    const after = await diploSnapshot(page);
    const rel = after.relations.find((r) => r.key === key)!;
    expect(rel.status).not.toBe('war');
    // Peace resets counters.
    expect(rel.warSupport).toBe(0);
    expect(rel.warDeclarer).toBeNull();
    // Status after peace is derived from relationship; must be a valid enum value.
    expect(VALID_STATUSES).toContain(rel.status as any);
  });

  test('PROPOSE_DIPLOMACY with nonexistent targetId does not mutate diplomacy or crash', async ({ page }) => {
    await startGameWithAI(page, 2);
    const before = await diploSnapshot(page);

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await dispatch(page, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'nonexistent',
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });

    const after = await diploSnapshot(page);
    expect(pageErrors).toEqual([]);
    // Relations map is unchanged (same length, same statuses).
    expect(after.relations.length).toBe(before.relations.length);
    const beforeByKey = new Map(before.relations.map((r) => [r.key, r.status]));
    for (const rel of after.relations) {
      expect(beforeByKey.get(rel.key)).toBe(rel.status);
    }
  });

  test('natural play over 10 turns keeps every relation status in the valid enum', async ({ page }) => {
    await startGameWithAI(page, 2);
    await advanceTurns(page, 10);
    const snap = await diploSnapshot(page);

    expect(snap.turn).toBeGreaterThanOrEqual(11);
    // Relations are lazily created, so count may be 0..3 depending on AI activity.
    // What matters is that every entry that *does* exist is well-formed.
    expect(snap.relations.length).toBeGreaterThanOrEqual(0);
    expect(snap.relations.length).toBeLessThanOrEqual(3);

    for (const rel of snap.relations) {
      expect(VALID_STATUSES).toContain(rel.status as any);
      expect(rel.relationship).toBeGreaterThanOrEqual(-100);
      expect(rel.relationship).toBeLessThanOrEqual(100);
      expect(rel.warSupport).toBeGreaterThanOrEqual(-100);
      expect(rel.warSupport).toBeLessThanOrEqual(100);
      expect(rel.turnsAtPeace).toBeGreaterThanOrEqual(0);
      expect(rel.turnsAtWar).toBeGreaterThanOrEqual(0);
    }
  });

  test('declaring formal war without hostile relationship is rejected (status stays non-war)', async ({ page }) => {
    await startGameWithAI(page, 2);
    const before = await diploSnapshot(page);
    const human = before.players.find((p) => p.isHuman)!;
    const ai = before.players.find((p) => !p.isHuman)!;
    const key = relationKey(human.id, ai.id);

    // At game start the default relationship is 0 (neutral) — formal war requires < -60,
    // so this should be rejected by the engine. If a pre-existing relation entry shows
    // it's already hostile (relationship < -60), skip this test (cannot deterministically
    // force rejection in that scenario).
    const rejectedBefore = before.relations.find((r) => r.key === key);
    if (rejectedBefore && rejectedBefore.relationship <= -60) {
      test.skip(true, 'Pre-existing relation already hostile enough to allow formal war');
    }

    await dispatch(page, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: ai.id,
      proposal: { type: 'DECLARE_WAR', warType: 'formal' },
    });

    const after = await diploSnapshot(page);
    const rel = after.relations.find((r) => r.key === key);
    // Either the entry was never created (no mutation) or it exists and is still non-war.
    if (rel) {
      expect(rel.status).not.toBe('war');
      expect(rel.turnsAtWar).toBe(0);
      expect(rel.warDeclarer).toBeNull();
    }
  });
});
