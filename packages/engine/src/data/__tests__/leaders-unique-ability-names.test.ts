/**
 * II4.2 — Leader unique-ability name parity with Civ VII (leaders F-08).
 *
 * Asserts:
 *  - Every leader has a non-empty ability name.
 *  - Names that are confirmed Civ VII canon are checked exactly.
 *  - Names that were flagged as Civ VI holdovers are noted in the skipped list.
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_LEADERS,
  AUGUSTUS, HATSHEPSUT, ALEXANDER, PERICLES,
  IBN_BATTUTA, TECUMSEH, GANDHI, QIN_SHI_HUANG,
  CONFUCIUS, NAPOLEON, HARRIET_TUBMAN,
} from '../leaders';

describe('II4.2 — Leader unique-ability names (leaders F-08)', () => {
  it('every leader has a non-empty ability name', () => {
    for (const leader of ALL_LEADERS) {
      expect(
        leader.ability.name.length,
        `${leader.id} ability name must not be empty`,
      ).toBeGreaterThan(0);
    }
  });

  // ── High-confidence Civ VII canonical names ──

  it('Augustus ability is "Imperium Maius" (Civ VII — high confidence, GDD doc + Fextralife)', () => {
    expect(AUGUSTUS.ability.name).toBe('Imperium Maius');
  });

  it('Hatshepsut ability is "God\'s Wife of Amun" (Civ VII — high confidence, GDD doc + Fextralife)', () => {
    expect(HATSHEPSUT.ability.name).toBe("God's Wife of Amun");
  });

  it('Alexander ability is "To the World\'s End" (Civ VII — confirmed multiple sources)', () => {
    expect(ALEXANDER.ability.name).toBe("To the World's End");
  });

  it('Pericles ability is "Surrounded by Glory" with Delian League description (Civ VII — confirmed)', () => {
    expect(PERICLES.ability.name).toBe('Surrounded by Glory');
    expect(PERICLES.ability.description).toContain('Delian League');
  });

  it('Ibn Battuta ability is "Rihla" (Civ VII canon — named for his travel account)', () => {
    expect(IBN_BATTUTA.ability.name).toBe('Rihla');
  });

  it('Tecumseh ability is "Forge a Confederacy" (Civ VII canon — leaders F-08)', () => {
    expect(TECUMSEH.ability.name).toBe('Forge a Confederacy');
  });

  it('Gandhi ability is "Satyagraha" (Civ VII canon — matches his non-violent resistance philosophy)', () => {
    expect(GANDHI.ability.name).toBe('Satyagraha');
  });

  // ── Reasonable approximations (non-empty name check only — not confirmed Civ VII specifics) ──

  it('Qin Shi Huang has a non-empty ability name (current: "First Emperor" — unverified VII name)', () => {
    expect(QIN_SHI_HUANG.ability.name.length).toBeGreaterThan(0);
  });

  it('Confucius has a non-empty ability name (current: "Great Teacher" — unverified VII name)', () => {
    expect(CONFUCIUS.ability.name.length).toBeGreaterThan(0);
  });

  it('Napoleon has a non-empty ability name (current: "Empereur des Français" — unverified VII name)', () => {
    expect(NAPOLEON.ability.name.length).toBeGreaterThan(0);
  });

  it('Harriet Tubman has a non-empty ability name', () => {
    expect(HARRIET_TUBMAN.ability.name.length).toBeGreaterThan(0);
  });

  // ── Holdover flags — names that may still use Civ VI names ──
  // These pass non-empty checks but are flagged for future verification.

  it('Cleopatra ability name is non-empty (flagged [CIV-VI-HOLDOVER] — "Mediterranean Bride" is Civ VI name)', () => {
    const cleopatra = ALL_LEADERS.find((l) => l.id === 'cleopatra');
    expect(cleopatra).toBeDefined();
    expect(cleopatra!.ability.name.length).toBeGreaterThan(0);
    // VII canon for Cleopatra is uncertain in hex-empires data; needs verification
  });

  it('Cyrus ability name is non-empty (flagged [CIV-VI-HOLDOVER] — "Fall of Babylon" is Civ VI name)', () => {
    const cyrus = ALL_LEADERS.find((l) => l.id === 'cyrus');
    expect(cyrus).toBeDefined();
    expect(cyrus!.ability.name.length).toBeGreaterThan(0);
    // VII canon for Cyrus: "Royal Charter" or "Anshan" per some sources — not confirmed
  });
});
