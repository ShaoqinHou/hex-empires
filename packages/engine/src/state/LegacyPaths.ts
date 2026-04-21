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
 * Conquered cities (originalOwner !== undefined/null) count as 2 pts;
 * self-founded cities count as 1 pt.  Matches GDD §12.2 conquest multiplier.
 */
function settlementPoints(state: GameState, playerId: PlayerId): number {
  let pts = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== playerId) continue;
    // If originalOwner is set and differs from the city's foundedBy owner,
    // the city was conquered → 2 points; otherwise self-founded → 1 point.
    const wasConquered = city.originalOwner != null && city.originalOwner !== playerId;
    pts += wasConquered ? 2 : 1;
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

function techsResearched(state: GameState, playerId: PlayerId): number {
  return state.players.get(playerId)?.researchedTechs.length ?? 0;
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
      description: 'Research 4 technologies', // GUESS — rulebook only states final codex milestone
      check: (pid, s) => techsResearched(s, pid) >= 4,
    },
    {
      id: 'antiquity_science_t2',
      tier: 2,
      description: 'Research 8 technologies', // GUESS
      check: (pid, s) => techsResearched(s, pid) >= 8,
    },
    {
      id: 'antiquity_science_t3',
      tier: 3,
      description: 'Great Library: build a Library in every owned city (proxy for 10 Codices)',
      check: (pid, s) => hasBuildingInEveryCity(s, pid, 'library'),
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
      description: 'Build 2 Wonders', // GUESS (final is 7 per rulebook)
      check: (pid, s) => totalWondersBuiltByPlayer(s, pid) >= 2,
    },
    {
      id: 'antiquity_culture_t2',
      tier: 2,
      description: 'Build 4 Wonders', // GUESS
      check: (pid, s) => totalWondersBuiltByPlayer(s, pid) >= 4,
    },
    {
      id: 'antiquity_culture_t3',
      tier: 3,
      description: 'Wonders of the Ancient World: Build 7 Wonders',
      check: (pid, s) => totalWondersBuiltByPlayer(s, pid) >= 7,
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
      description: 'Earn 200 Gold cumulative (proxy for Resource assignment)', // PROXY: resources
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 200,
    },
    {
      id: 'antiquity_economic_t2',
      tier: 2,
      description: 'Earn 500 Gold cumulative (proxy for 10 Resources assigned)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 500,
    },
    {
      id: 'antiquity_economic_t3',
      tier: 3,
      description: 'Silk Roads: Earn 1000 Gold cumulative (proxy for 20+ Resources)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 1000,
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
      description: 'Research 12 technologies total', // GUESS
      check: (pid, s) => techsResearched(s, pid) >= 12,
    },
    {
      id: 'exploration_science_t2',
      tier: 2,
      description: 'Construct 3 Districts (proxy for high-yield districts)',
      check: (pid, s) => totalDistrictsOwned(s, pid) >= 3,
    },
    {
      id: 'exploration_science_t3',
      tier: 3,
      description: 'Enlightenment: Own 5 Districts (proxy — no yield audit)', // PROXY
      check: (pid, s) => totalDistrictsOwned(s, pid) >= 5,
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
      description: 'Collect 4 Relics (proxy: 100 Culture)', // F-09: relics when present, culture proxy fallback
      check: (pid, s) => {
        const relics = s.players.get(pid)?.relics;
        if (relics && relics.length > 0) return relics.length >= 4;
        return (s.players.get(pid)?.culture ?? 0) >= 100;
      },
    },
    {
      id: 'exploration_culture_t2',
      tier: 2,
      description: 'Collect 8 Relics (proxy: 250 Culture)', // F-09
      check: (pid, s) => {
        const relics = s.players.get(pid)?.relics;
        if (relics && relics.length > 0) return relics.length >= 8;
        return (s.players.get(pid)?.culture ?? 0) >= 250;
      },
    },
    {
      id: 'exploration_culture_t3',
      tier: 3,
      description: 'Toshakhana: Collect 12 Relics (proxy: 500 Culture)', // F-09
      check: (pid, s) => {
        const relics = s.players.get(pid)?.relics;
        if (relics && relics.length > 0) return relics.length >= 12;
        return (s.players.get(pid)?.culture ?? 0) >= 500;
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
      description: 'Defeat 6 enemy units this age (killsThisAge proxy for Distant-Lands points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.killsThisAge ?? s.players.get(pid)?.totalKills ?? 0) >= 6,
    },
    {
      id: 'exploration_military_t2',
      tier: 2,
      description: 'Defeat 10 enemy units this age (proxy)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.killsThisAge ?? s.players.get(pid)?.totalKills ?? 0) >= 10,
    },
    {
      id: 'exploration_military_t3',
      tier: 3,
      description: 'Non Sufficit Orbis: Defeat 15 enemy units this age (proxy for 12 Distant-Lands points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.killsThisAge ?? s.players.get(pid)?.totalKills ?? 0) >= 15,
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
      description: 'Earn 1500 Gold cumulative (proxy for 10 Treasure Fleet points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 1500,
    },
    {
      id: 'exploration_economic_t2',
      tier: 2,
      description: 'Earn 2500 Gold cumulative (proxy for 20 Treasure Fleet points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 2500,
    },
    {
      id: 'exploration_economic_t3',
      tier: 3,
      description: 'Treasure Fleets: Earn 4000 Gold cumulative (proxy for 30 Treasure points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 4000,
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
      description: 'Build 2 Modern Wonders (proxy for 5 Artifacts)', // PROXY: no Artifact system
      check: (pid, s) => totalWondersBuiltByPlayer(s, pid) >= 2,
    },
    {
      id: 'modern_culture_t2',
      tier: 2,
      description: 'Build 5 Wonders cumulative (proxy for 15 Artifacts)', // PROXY
      check: (pid, s) => totalWondersBuiltByPlayer(s, pid) >= 5,
    },
    {
      id: 'modern_culture_t3',
      tier: 3,
      description: 'World\'s Fair: Build 8 Wonders cumulative (proxy for World\'s Fair Wonder)', // PROXY
      check: (pid, s) => totalWondersBuiltByPlayer(s, pid) >= 8,
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
      description: 'Earn 3000 Gold cumulative (proxy for 150 Railroad Tycoon points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 3000,
    },
    {
      id: 'modern_economic_t2',
      tier: 2,
      description: 'Earn 5000 Gold cumulative (proxy for 300 Railroad Tycoon points)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 5000,
    },
    {
      id: 'modern_economic_t3',
      tier: 3,
      description: 'Railroad Tycoon: Earn 10000 Gold cumulative (proxy for 500 points + Banker visits)', // PROXY
      check: (pid, s) => (s.players.get(pid)?.totalGoldEarned ?? 0) >= 10000,
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
