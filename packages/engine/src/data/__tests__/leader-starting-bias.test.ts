/**
 * HH2 — Leader starting bias + historical civ pairing validation (leaders F-09).
 *
 * Verifies:
 *  - Every leader has at least one startingBias entry.
 *  - Every startingBias value is a valid TerrainBiomeBias member.
 *  - Every historicalCivId, when present, references a registered civ ID.
 *  - Spot-checks for known leader–civ pairings and bias values.
 */
import { describe, it, expect } from 'vitest';
import { ALL_LEADERS } from '../leaders';
import type { TerrainBiomeBias } from '../leaders';
import { ALL_CIVILIZATIONS } from '../civilizations';

const VALID_BIOMES: ReadonlySet<TerrainBiomeBias> = new Set<TerrainBiomeBias>([
  'coast', 'plains', 'grassland', 'desert', 'tundra',
  'forest', 'mountains', 'navigable_river', 'floodplains', 'hills', 'tropical',
]);

const CIV_ID_SET = new Set(ALL_CIVILIZATIONS.map((c) => c.id));
const LEADER_BY_ID = Object.fromEntries(ALL_LEADERS.map((l) => [l.id, l]));

// ── Coverage: every leader must have startingBias ─────────────────────────

describe('HH2 — startingBias coverage', () => {
  it('every leader has a non-empty startingBias array', () => {
    const missing: string[] = [];
    for (const leader of ALL_LEADERS) {
      if (!leader.startingBias || leader.startingBias.length === 0) {
        missing.push(leader.id);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every startingBias value is a valid TerrainBiomeBias member', () => {
    const invalid: string[] = [];
    for (const leader of ALL_LEADERS) {
      for (const bias of leader.startingBias ?? []) {
        if (!VALID_BIOMES.has(bias)) {
          invalid.push(`${leader.id} -> '${bias}'`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });
});

// ── Reference integrity: historicalCivId must point to a known civ ────────

describe('HH2 — historicalCivId reference integrity', () => {
  it('every historicalCivId references a registered civ', () => {
    const badRefs: string[] = [];
    for (const leader of ALL_LEADERS) {
      if (leader.historicalCivId !== undefined && !CIV_ID_SET.has(leader.historicalCivId)) {
        badRefs.push(`${leader.id} -> historicalCivId: '${leader.historicalCivId}'`);
      }
    }
    expect(badRefs).toEqual([]);
  });

  it('all 15 leaders have a historicalCivId', () => {
    const missing = ALL_LEADERS.filter((l) => l.historicalCivId === undefined);
    expect(missing.map((l) => l.id)).toEqual([]);
  });
});

// ── Spot-checks for known leader–civ pairings ────────────────────────────

describe('HH2 — leader–civ pairing spot-checks', () => {
  it('augustus pairs with rome', () => {
    expect(LEADER_BY_ID['augustus'].historicalCivId).toBe('rome');
  });

  it('cleopatra pairs with egypt', () => {
    expect(LEADER_BY_ID['cleopatra'].historicalCivId).toBe('egypt');
  });

  it('hatshepsut pairs with egypt', () => {
    expect(LEADER_BY_ID['hatshepsut'].historicalCivId).toBe('egypt');
  });

  it('pericles pairs with greece', () => {
    expect(LEADER_BY_ID['pericles'].historicalCivId).toBe('greece');
  });

  it('alexander pairs with greece', () => {
    expect(LEADER_BY_ID['alexander'].historicalCivId).toBe('greece');
  });

  it('qin_shi_huang pairs with china', () => {
    expect(LEADER_BY_ID['qin_shi_huang'].historicalCivId).toBe('china');
  });

  it('confucius pairs with china', () => {
    expect(LEADER_BY_ID['confucius'].historicalCivId).toBe('china');
  });

  it('genghis_khan pairs with mongolia', () => {
    expect(LEADER_BY_ID['genghis_khan'].historicalCivId).toBe('mongolia');
  });

  it('napoleon pairs with france', () => {
    expect(LEADER_BY_ID['napoleon'].historicalCivId).toBe('france');
  });

  it('napoleon_revolutionary pairs with france', () => {
    expect(LEADER_BY_ID['napoleon_revolutionary'].historicalCivId).toBe('france');
  });

  it('harriet_tubman pairs with america', () => {
    expect(LEADER_BY_ID['harriet_tubman'].historicalCivId).toBe('america');
  });
});

// ── Spot-checks for bias values ───────────────────────────────────────────

describe('HH2 — startingBias spot-checks', () => {
  it('augustus includes plains and grassland bias', () => {
    const bias = LEADER_BY_ID['augustus'].startingBias ?? [];
    expect(bias).toContain('plains');
    expect(bias).toContain('grassland');
  });

  it('cleopatra includes navigable_river bias (Nile civilisation)', () => {
    const bias = LEADER_BY_ID['cleopatra'].startingBias ?? [];
    expect(bias).toContain('navigable_river');
  });

  it('hatshepsut includes desert bias (Egyptian setting)', () => {
    const bias = LEADER_BY_ID['hatshepsut'].startingBias ?? [];
    expect(bias).toContain('desert');
  });

  it('pericles includes coast bias (Aegean Greece)', () => {
    const bias = LEADER_BY_ID['pericles'].startingBias ?? [];
    expect(bias).toContain('coast');
  });

  it('genghis_khan includes plains bias (Steppe)', () => {
    const bias = LEADER_BY_ID['genghis_khan'].startingBias ?? [];
    expect(bias).toContain('plains');
  });

  it('cyrus includes desert or hills bias (Iranian plateau)', () => {
    const bias = LEADER_BY_ID['cyrus'].startingBias ?? [];
    const hasRelevant = bias.includes('desert') || bias.includes('hills');
    expect(hasRelevant).toBe(true);
  });
});
