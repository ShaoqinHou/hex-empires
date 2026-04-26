import type { GameState } from '../types/GameState';
import type { PlayerId } from '../types/Ids';

/**
 * LegacyPaths — pure scoring helpers for Civ VII Legacy Paths (rulebook §12).
 *
 * Each age has 4 Legacy Paths (one per victory axis: science, culture, military,
 * economic). Each path has 3 tiered milestones. This module exposes the complete
 * list of 12 paths (4 axes × 3 ages) plus a pure scoring function that, given a
 * player and a GameState, returns how many tiers of each path that player has
 * completed.
 *
 * This module is intentionally standalone — it does NOT mutate state, does NOT
 * touch the victorySystem, and does NOT modify GameState. Wiring into the
 * victorySystem is a later cycle's concern.
 *
 * PROXY NOTES — where the rulebook asks for things the engine does not cleanly
 * track today, we fall back to the closest available proxy and flag it in the
 * milestone description / comment:
 *   • "Conquered settlements" → owned cities count (no provenance tracking).
 *   • "Display N Codices / Relics / Artifacts" → researchedTechs / culture / wonders
 *     proxies (no codex/relic/artifact subsystem exists yet).
 *   • "Great Banker visits" / "Treasure Fleets returned" → totalGoldEarned proxy.
 *   • "Ideology Points from conquest" → totalKills proxy.
 *   • "Distant-Lands yield" → culture proxy (no distant-lands bookkeeping).
 *   • "Districts with 40+ yield each" → districts array length (no yield audit
 *     against district entries tracked here).
 */

export type LegacyAxis = 'science' | 'culture' | 'military' | 'economic';

export type LegacyAge = 'antiquity' | 'exploration' | 'modern';

export interface LegacyMilestone {
  readonly id: string;
  readonly tier: 1 | 2 | 3;
  readonly description: string;
  readonly check: (playerId: PlayerId, state: GameState) => boolean;
}

export interface LegacyPath {
  readonly age: LegacyAge;
  readonly axis: LegacyAxis;
  readonly milestones: ReadonlyArray<LegacyMilestone>; // length === 3
}

export interface LegacyProgress {
  readonly axis: LegacyAxis;
  readonly age: LegacyAge;
  readonly tiersCompleted: 0 | 1 | 2 | 3;
}

// ── Small predicate helpers (pure, no mutation) ─────────────────────────────

/**
 * Settlement points for the military legacy path.
 * Conquered cities count as 2 pts; self-founded cities count as 1 pt.
 * Matches GDD §12.2 conquest multiplier.
 *
 * AA1.2: prefer the explicit `wasConquered` boolean (set by combatSystem on city
 * capture). Falls back to the originalOwner check for cities predating AA1.2.
 */
function settlementPoints(state: GameState, playerId: PlayerId): number {
  let pts = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    // AA1.2: prefer wasConquered flag; fall back to originalOwner check
    const conquered = city.wasConquered ??
      (city.originalOwner != null && city.originalOwner !== playerId);
    pts += conquered ? 2 : 1;
  }
  return pts;
}

function ownedCities(state: GameState, playerId: PlayerId): number {
  let n = 0;
  for (const city of state.cities.values()) {
    if (city.owner === playerId) n += 1;
  }
  return n;
}

function ownedCitiesList(state: GameState, playerId: PlayerId): ReadonlyArray<{ buildings: ReadonlyArray<string>; districts: ReadonlyArray<string> }> {
  const out: Array<{ buildings: ReadonlyArray<string>; districts: ReadonlyArray<string> }> = [];
  for (const city of state.cities.values()) {
    if (city.owner === playerId) out.push({ buildings: city.buildings, districts: city.districts });
  }
  return out;
}

function hasBuildingInEveryCity(state: GameState, playerId: PlayerId, buildingId: string): boolean {
  const cities = ownedCitiesList(state, playerId);
  if (cities.length === 0) return false;
  return cities.every((c) => c.buildings.includes(buildingId));
}

/**
 * BB5.4: Count PLACED codices in state.codices that belong to the player.
 * "Placed" means codex.placedInCityId is set (the codex is slotted in a building).
 * Unplaced codices (earned but not yet displayed) do NOT count toward science legacy —
 * this incentivises building libraries/museums and actively placing codices.
 * Falls back to 0 when state.codices is absent (pre-AA5.1 saves).
 *
 * For old saves that have codexPlacements on PlayerState but no state.codices entries,
 * the codexPlacements-length is used as a fallback via scienceLegacyScore.
 */
function placedCodicesCount(state: GameState, playerId: PlayerId): number {
  if (!state.codices) return 0;
  let n = 0;
  for (const codex of state.codices.values()) {
    if (codex.playerId === playerId && codex.placedInCityId !== undefined) n += 1;
  }
  return n;
}

/**
 * II3.2 (tech-tree F-09): Science legacy score — codex placements only.
 * The previous formula (codexPlacements * 10 + researchedTechs * 1) allowed raw
 * tech count to substitute for codex placement, which diverges from Civ VII.
 * Tech count no longer contributes (F-09 fix).
 *
 * Returns player.codexPlacements.length as fallback for saves predating state.codices.
 */
function scienceLegacyScore(state: GameState, playerId: PlayerId): number {
  const player = state.players.get(playerId);
  if (!player) return 0;
  return player.codexPlacements?.length ?? 0;
}

function civicsResearched(state: GameState, playerId: PlayerId): number {
  return state.players.get(playerId)?.researchedCivics.length ?? 0;
}

function totalWondersBuiltByPlayer(state: GameState, playerId: PlayerId): number {
  // We don't track wonder ownership at the state root, but a wonder is always
  // built as a building in a single city — count across owned cities.
  const cities = ownedCitiesList(state, playerId);
  let n = 0;
  for (const c of cities) {
    for (const b of c.buildings) {
      const def = state.config.buildings.get(b);
      if (def?.isWonder) n += 1;
    }
  }
  return n;
}

function totalDistrictsOwned(state: GameState, playerId: PlayerId): number {
  let n = 0;
  for (const city of state.cities.values()) {
    if (city.owner === playerId) n += city.districts.length;
  }
  return n;
}

// ── Path definitions ────────────────────────────────────────────────────────
//
// Thresholds are inspired by rulebook §12.2-12.4 where stated; tier-1 and
// tier-2 intermediates are chosen as reasonable ramp-ups (rulebook is thin on
// exact intermediate numbers — marked with GUESS where applicable).

const ANTIQUITY_SCIENCE: LegacyPath = {
  age: 'antiquity',
  axis: 'science',
  milestones: [
    {
      id: 'antiquity_science_t1',
      tier: 1,
      // BB5.4 + II3.2 (F-09): prefer placedCodicesCount when state.codices is present.
      // Fallback: codexPlacements.length >= 1 (tech count no longer contributes).
      description: 'Place 1 Codex in a Library or Museum (fallback: 1 codexPlacement)',
      check: (pid, s) => {
        if (s.codices) return placedCodicesCount(s, pid) >= 1;
        return scienceLegacyScore(s, pid) >= 1;
      },
    },
    {
      id: 'antiquity_science_t2',
      tier: 2,
      // BB5.4 + II3.2: prefer placedCodicesCount; fallback: codexPlacements.length >= 3.
      description: 'Place 3 Codices in Libraries or Museums (fallback: 3 codexPlacements)',
      check: (pid, s) => {
        if (s.codices) return placedCodicesCount(s, pid) >= 3;
        return scienceLegacyScore(s, pid) >= 3;
      },
    },
    {
      id: 'antiquity_science_t3',
      tier: 3,
      // BB5.4 + II3.2: prefer placedCodicesCount; fallback: codexPlacements.length >= 6
      // OR Library in every city (infrastructure check for saves with no codex tracking).
      description: 'Place 6 Codices in Libraries or Museums (fallback: 6 codexPlacements or Library in every city)',
      check: (pid, s) => {
        if (s.codices) return placedCodicesCount(s, pid) >= 6;
        if (scienceLegacyScore(s, pid) >= 6) return true;
        return hasBuildingInEveryCity(s, pid, 'library');
      },
    },
  ],
};

const ANTIQUITY_CULTURE: LegacyPath = {
  age: 'antiquity',
  axis: 'culture',
  milestones: [
    {
      id: 'antiquity_culture_t1',
      tier: 1,
      // Z3.4: prefer artifactsInMuseums; fall back to wonder-count proxy when field absent
      description: 'Display 2 Artifacts in Museums (fallback: 2 Wonders built)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.artifactsInMuseums !== undefined) return p.artifactsInMuseums >= 2;
        return totalWondersBuiltByPlayer(s, pid) >= 2;
      },
    },
    {
      id: 'antiquity_culture_t2',
      tier: 2,
      // Z3.4: prefer artifactsInMuseums; fall back to wonder-count proxy
      description: 'Display 4 Artifacts in Museums (fallback: 4 Wonders built)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.artifactsInMuseums !== undefined) return p.artifactsInMuseums >= 4;
        return totalWondersBuiltByPlayer(s, pid) >= 4;
      },
    },
    {
      id: 'antiquity_culture_t3',
      tier: 3,
      // Z3.4: prefer artifactsInMuseums; fall back to wonder-count proxy
      description: 'Wonders of the Ancient World: Display 7 Artifacts (fallback: 7 Wonders)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.artifactsInMuseums !== undefined) return p.artifactsInMuseums >= 7;
        return totalWondersBuiltByPlayer(s, pid) >= 7;
      },
    },
  ],
};

const ANTIQUITY_MILITARY: LegacyPath = {
  age: 'antiquity',
  axis: 'military',
  milestones: [
    {
      id: 'antiquity_military_t1',
      tier: 1,
      description: 'Defeat 3 enemy units this age (killsThisAge)',
      check: (pid, s) => (s.players.get(pid)?.killsThisAge ?? s.players.get(pid)?.totalKills ?? 0) >= 3,
    },
    {
      id: 'antiquity_military_t2',
      tier: 2,
      description: 'Accumulate 6 settlement points (conquered=2, founded=1)',
      check: (pid, s) => settlementPoints(s, pid) >= 6,
    },
    {
      id: 'antiquity_military_t3',
      tier: 3,
      description: 'Pax Imperatoria: Accumulate 12 settlement points',
      check: (pid, s) => settlementPoints(s, pid) >= 12,
    },
  ],
};

const ANTIQUITY_ECONOMIC: LegacyPath = {
  age: 'antiquity',
  axis: 'economic',
  milestones: [
    {
      id: 'antiquity_economic_t1',
      tier: 1,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy when field absent
      description: 'Assign 5 Resources to cities (fallback: 200 Gold cumulative)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 5;
        return (p.totalGoldEarned ?? 0) >= 200;
      },
    },
    {
      id: 'antiquity_economic_t2',
      tier: 2,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Assign 10 Resources to cities (fallback: 500 Gold cumulative)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 10;
        return (p.totalGoldEarned ?? 0) >= 500;
      },
    },
    {
      id: 'antiquity_economic_t3',
      tier: 3,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Silk Roads: Assign 20 Resources to cities (fallback: 1000 Gold)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 20;
        return (p.totalGoldEarned ?? 0) >= 1000;
      },
    },
  ],
};

const EXPLORATION_SCIENCE: LegacyPath = {
  age: 'exploration',
  axis: 'science',
  milestones: [
    {
      id: 'exploration_science_t1',
      tier: 1,
      // II3.2 (F-09): prefer placedCodicesCount when state.codices is present.
      // Fallback: codexPlacements.length >= 2 or 3 Districts (Enlightenment breadth proxy).
      description: 'Place 2 Codices (fallback: 2 codexPlacements or 3 Districts)',
      check: (pid, s) => {
        if (s.codices) return placedCodicesCount(s, pid) >= 2;
        return scienceLegacyScore(s, pid) >= 2 || totalDistrictsOwned(s, pid) >= 3;
      },
    },
    {
      id: 'exploration_science_t2',
      tier: 2,
      // II3.2 (F-09): prefer placedCodicesCount; fallback: codexPlacements >= 4 or 5 Districts.
      description: 'Place 4 Codices (fallback: 4 codexPlacements or 5 Districts)',
      check: (pid, s) => {
        if (s.codices) return placedCodicesCount(s, pid) >= 4;
        return scienceLegacyScore(s, pid) >= 4 || totalDistrictsOwned(s, pid) >= 5;
      },
    },
    {
      id: 'exploration_science_t3',
      tier: 3,
      // II3.2 (F-09): prefer placedCodicesCount; fallback: codexPlacements >= 7 or 8 Districts.
      description: 'Place 7 Codices (fallback: 7 codexPlacements or 8 Districts — Enlightenment proxy)',
      check: (pid, s) => {
        if (s.codices) return placedCodicesCount(s, pid) >= 7;
        return scienceLegacyScore(s, pid) >= 7 || totalDistrictsOwned(s, pid) >= 8;
      },
    },
  ],
};

const EXPLORATION_CULTURE: LegacyPath = {
  age: 'exploration',
  axis: 'culture',
  milestones: [
    {
      id: 'exploration_culture_t1',
      tier: 1,
      // Z3.4: prefer relicsDisplayedCount (relics in Cathedral/Reliquary);
      // fall back to relics.length, then culture proxy
      description: 'Display 4 Relics in Cathedral/Reliquary (fallback: 4 relics acquired or 100 Culture)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.relicsDisplayedCount !== undefined) return p.relicsDisplayedCount >= 4;
        const relics = p.relics;
        if (relics && relics.length > 0) return relics.length >= 4;
        return (p.culture ?? 0) >= 100;
      },
    },
    {
      id: 'exploration_culture_t2',
      tier: 2,
      // Z3.4: prefer relicsDisplayedCount; fallbacks as above
      description: 'Display 8 Relics in Cathedral/Reliquary (fallback: 8 relics or 250 Culture)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.relicsDisplayedCount !== undefined) return p.relicsDisplayedCount >= 8;
        const relics = p.relics;
        if (relics && relics.length > 0) return relics.length >= 8;
        return (p.culture ?? 0) >= 250;
      },
    },
    {
      id: 'exploration_culture_t3',
      tier: 3,
      // Z3.4: prefer relicsDisplayedCount; fallbacks as above
      description: 'Toshakhana: Display 12 Relics (fallback: 12 relics or 500 Culture)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.relicsDisplayedCount !== undefined) return p.relicsDisplayedCount >= 12;
        const relics = p.relics;
        if (relics && relics.length > 0) return relics.length >= 12;
        return (p.culture ?? 0) >= 500;
      },
    },
  ],
};

const EXPLORATION_MILITARY: LegacyPath = {
  age: 'exploration',
  axis: 'military',
  milestones: [
    {
      id: 'exploration_military_t1',
      tier: 1,
      // Z3.4: prefer distantLandPoints (cities founded on Distant Lands);
      // fall back to killsThisAge proxy when field absent
      description: 'Earn 4 Distant Land Points (fallback: 6 kills this age)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.distantLandPoints !== undefined) return p.distantLandPoints >= 4;
        return (p.killsThisAge ?? p.totalKills ?? 0) >= 6;
      },
    },
    {
      id: 'exploration_military_t2',
      tier: 2,
      // Z3.4: prefer distantLandPoints; fall back to kills proxy
      description: 'Earn 8 Distant Land Points (fallback: 10 kills this age)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.distantLandPoints !== undefined) return p.distantLandPoints >= 8;
        return (p.killsThisAge ?? p.totalKills ?? 0) >= 10;
      },
    },
    {
      id: 'exploration_military_t3',
      tier: 3,
      // Z3.4: prefer distantLandPoints; fall back to kills proxy
      description: 'Non Sufficit Orbis: Earn 12 Distant Land Points (fallback: 15 kills this age)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.distantLandPoints !== undefined) return p.distantLandPoints >= 12;
        return (p.killsThisAge ?? p.totalKills ?? 0) >= 15;
      },
    },
  ],
};

const EXPLORATION_ECONOMIC: LegacyPath = {
  age: 'exploration',
  axis: 'economic',
  milestones: [
    {
      id: 'exploration_economic_t1',
      tier: 1,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Assign 15 Resources to cities (fallback: 1500 Gold cumulative)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 15;
        return (p.totalGoldEarned ?? 0) >= 1500;
      },
    },
    {
      id: 'exploration_economic_t2',
      tier: 2,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Assign 25 Resources to cities (fallback: 2500 Gold cumulative)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 25;
        return (p.totalGoldEarned ?? 0) >= 2500;
      },
    },
    {
      id: 'exploration_economic_t3',
      tier: 3,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Treasure Fleets: Assign 40 Resources to cities (fallback: 4000 Gold)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 40;
        return (p.totalGoldEarned ?? 0) >= 4000;
      },
    },
  ],
};

const MODERN_SCIENCE: LegacyPath = {
  age: 'modern',
  axis: 'science',
  milestones: [
    {
      id: 'modern_science_t1',
      tier: 1,
      description: 'Research Flight (proxy for Trans-Oceanic Flight project)', // PROXY: no project system
      check: (pid, s) => s.players.get(pid)?.researchedTechs.includes('flight') ?? false,
    },
    {
      id: 'modern_science_t2',
      tier: 2,
      description: 'Research Rocketry (proxy for Launch Satellite project)', // PROXY
      check: (pid, s) => s.players.get(pid)?.researchedTechs.includes('rocketry') ?? false,
    },
    {
      id: 'modern_science_t3',
      tier: 3,
      description: 'Research all 10 Modern techs (proxy for First Staffed Space Flight)', // PROXY
      check: (pid, s) => {
        const modernTechs = [
          'industrialization', 'scientific_theory', 'rifling',
          'steam_power', 'electricity', 'replaceable_parts',
          'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
        ];
        const p = s.players.get(pid);
        if (!p) return false;
        return modernTechs.every((t) => p.researchedTechs.includes(t));
      },
    },
  ],
};

const MODERN_CULTURE: LegacyPath = {
  age: 'modern',
  axis: 'culture',
  milestones: [
    {
      id: 'modern_culture_t1',
      tier: 1,
      // Z3.4: prefer artifactsInMuseums; fall back to wonder-count proxy when field absent
      description: 'Display 5 Artifacts in Museums (fallback: 2 Wonders built)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.artifactsInMuseums !== undefined) return p.artifactsInMuseums >= 5;
        return totalWondersBuiltByPlayer(s, pid) >= 2;
      },
    },
    {
      id: 'modern_culture_t2',
      tier: 2,
      // Z3.4: prefer artifactsInMuseums; fall back to wonder-count proxy
      description: 'Display 15 Artifacts in Museums (fallback: 5 Wonders built)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.artifactsInMuseums !== undefined) return p.artifactsInMuseums >= 15;
        return totalWondersBuiltByPlayer(s, pid) >= 5;
      },
    },
    {
      id: 'modern_culture_t3',
      tier: 3,
      // Z3.4: prefer artifactsInMuseums; fall back to wonder-count proxy
      description: "World's Fair: Display 25 Artifacts in Museums (fallback: 8 Wonders built)",
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.artifactsInMuseums !== undefined) return p.artifactsInMuseums >= 25;
        return totalWondersBuiltByPlayer(s, pid) >= 8;
      },
    },
  ],
};

const MODERN_MILITARY: LegacyPath = {
  age: 'modern',
  axis: 'military',
  milestones: [
    {
      id: 'modern_military_t1',
      tier: 1,
      description: 'Defeat 10 enemy units (proxy for 10 Ideology points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalKills ?? 0) >= 10,
    },
    {
      id: 'modern_military_t2',
      tier: 2,
      description: 'Defeat 20 enemy units (proxy for 20 Ideology points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalKills ?? 0) >= 20,
    },
    {
      id: 'modern_military_t3',
      tier: 3,
      description: 'Operation Ivy: Research Nuclear Fission (proxy for Manhattan Project)', // PROXY
      check: (pid, s) => s.players.get(pid)?.researchedTechs.includes('nuclear_fission') ?? false,
    },
  ],
};

const MODERN_ECONOMIC: LegacyPath = {
  age: 'modern',
  axis: 'economic',
  milestones: [
    {
      id: 'modern_economic_t1',
      tier: 1,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Assign 30 Resources to cities (fallback: 3000 Gold cumulative)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 30;
        return (p.totalGoldEarned ?? 0) >= 3000;
      },
    },
    {
      id: 'modern_economic_t2',
      tier: 2,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Assign 50 Resources to cities (fallback: 5000 Gold cumulative)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 50;
        return (p.totalGoldEarned ?? 0) >= 5000;
      },
    },
    {
      id: 'modern_economic_t3',
      tier: 3,
      // Z3.4: prefer resourcesAssigned; fall back to totalGoldEarned proxy
      description: 'Railroad Tycoon: Assign 80 Resources to cities (fallback: 10000 Gold)',
      check: (pid, s) => {
        const p = s.players.get(pid);
        if (!p) return false;
        if (p.resourcesAssigned !== undefined) return p.resourcesAssigned >= 80;
        return (p.totalGoldEarned ?? 0) >= 10000;
      },
    },
  ],
};

export const ALL_LEGACY_PATHS: ReadonlyArray<LegacyPath> = [
  ANTIQUITY_SCIENCE,
  ANTIQUITY_CULTURE,
  ANTIQUITY_MILITARY,
  ANTIQUITY_ECONOMIC,
  EXPLORATION_SCIENCE,
  EXPLORATION_CULTURE,
  EXPLORATION_MILITARY,
  EXPLORATION_ECONOMIC,
  MODERN_SCIENCE,
  MODERN_CULTURE,
  MODERN_MILITARY,
  MODERN_ECONOMIC,
];

// ── Scoring ────────────────────────────────────────────────────────────────

/**
 * Pure scoring helper — for each of the 12 legacy paths, report how many of its
 * 3 milestones are currently satisfied by the player's state. Returns an array
 * in the same order as ALL_LEGACY_PATHS.
 *
 * Unknown player id → all entries have tiersCompleted === 0.
 */
export function scoreLegacyPaths(playerId: PlayerId, state: GameState): ReadonlyArray<LegacyProgress> {
  const hasPlayer = state.players.has(playerId);
  return ALL_LEGACY_PATHS.map((path) => {
    if (!hasPlayer) {
      return { axis: path.axis, age: path.age, tiersCompleted: 0 as const };
    }
    let completed = 0;
    for (const m of path.milestones) {
      if (m.check(playerId, state)) completed += 1;
    }
    const tiers = (completed === 0 ? 0 : completed === 1 ? 1 : completed === 2 ? 2 : 3) as 0 | 1 | 2 | 3;
    return { axis: path.axis, age: path.age, tiersCompleted: tiers };
  });
}
