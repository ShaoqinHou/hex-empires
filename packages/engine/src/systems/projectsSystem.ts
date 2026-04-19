import type { GameState, GameAction, PlayerState } from '../types/GameState';

/**
 * ProjectsSystem — handles COMPLETE_PROJECT actions (W5-01).
 *
 * Projects are non-wonder city-level milestones that drive modern victory chains:
 *   - Military chain: Manhattan Project → Operation Ivy (terminal)
 *   - Science chain: Trans-Oceanic Flight → Break Sound Barrier → First Staffed Space Flight
 *   - Economic: World Bank Office (per-rival-capital; dispatched by Great Banker unit)
 *
 * Validation gates (returns state unchanged with lastValidation failure on violation):
 *   1. projectId must exist in state.config.projects
 *   2. player must exist and be the current player
 *   3. project.requiredTech — player must have researched it
 *   4. project.requiredProject — player.completedProjects must include it
 *   5. project.requiredBuilding — city (if cityId given) must have it built
 *   6. project.requiredIdeologyPoints — player.ideologyPoints >= threshold
 *   7. project must not already be completed (prevents duplicates for chain projects;
 *      World Bank Office is exempt since multiple offices can be established)
 *
 * State mutations (immutable — returns new state):
 *   - Appends projectId to player.completedProjects
 *   - Increments player.spaceMilestonesComplete when project.isSpaceMilestone
 *   - Decrements player.worldBankOfficesRemaining when projectId === 'world_bank_office'
 *     (initialized to rival count on first office completion)
 *   - Appends a 'production' log event
 */
export function projectsSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'COMPLETE_PROJECT') return state;

  const { playerId, projectId, cityId } = action;

  // 1. Project must exist in config
  const projectDef = state.config.projects?.get(projectId);
  if (!projectDef) {
    return {
      ...state,
      lastValidation: { valid: false, reason: `Unknown project: ${projectId}`, category: 'production' },
    };
  }

  // 2. Player must exist
  const player = state.players.get(playerId);
  if (!player) {
    return {
      ...state,
      lastValidation: { valid: false, reason: `Unknown player: ${playerId}`, category: 'production' },
    };
  }

  // 3. Tech prerequisite
  if (projectDef.requiredTech && !player.researchedTechs.includes(projectDef.requiredTech)) {
    return {
      ...state,
      lastValidation: {
        valid: false,
        reason: `${projectDef.name} requires tech: ${projectDef.requiredTech}`,
        category: 'production',
      },
    };
  }

  // 4. Project prerequisite
  if (projectDef.requiredProject) {
    const completedProjects = player.completedProjects ?? [];
    if (!completedProjects.includes(projectDef.requiredProject)) {
      return {
        ...state,
        lastValidation: {
          valid: false,
          reason: `${projectDef.name} requires completing ${projectDef.requiredProject} first`,
          category: 'production',
        },
      };
    }
  }

  // 5. Building prerequisite (only validated when a cityId is provided)
  if (projectDef.requiredBuilding && cityId) {
    const city = state.cities.get(cityId);
    if (!city || !city.buildings.includes(projectDef.requiredBuilding as never)) {
      return {
        ...state,
        lastValidation: {
          valid: false,
          reason: `${projectDef.name} requires building: ${projectDef.requiredBuilding} in city`,
          category: 'production',
        },
      };
    }
  }

  // 6. Ideology points threshold
  if (projectDef.requiredIdeologyPoints > 0) {
    const ideologyPts = player.ideologyPoints ?? 0;
    if (ideologyPts < projectDef.requiredIdeologyPoints) {
      return {
        ...state,
        lastValidation: {
          valid: false,
          reason: `${projectDef.name} requires ${projectDef.requiredIdeologyPoints} ideology points (have ${ideologyPts})`,
          category: 'production',
        },
      };
    }
  }

  // 7. Duplicate guard — only for non-World-Bank projects (a player can establish multiple offices)
  if (projectId !== 'world_bank_office') {
    const completedProjects = player.completedProjects ?? [];
    if (completedProjects.includes(projectId)) {
      return {
        ...state,
        lastValidation: {
          valid: false,
          reason: `Project already completed: ${projectId}`,
          category: 'production',
        },
      };
    }
  }

  // ── All validation passed — apply mutations ──

  const completedProjects = player.completedProjects ?? [];
  const nextCompleted = [...completedProjects, projectId];

  let spaceMilestonesComplete = player.spaceMilestonesComplete ?? 0;
  if (projectDef.isSpaceMilestone) {
    spaceMilestonesComplete = spaceMilestonesComplete + 1;
  }

  // World Bank Office: initialize or decrement worldBankOfficesRemaining
  let worldBankOfficesRemaining = player.worldBankOfficesRemaining ?? null;
  if (projectId === 'world_bank_office') {
    if (worldBankOfficesRemaining === null || worldBankOfficesRemaining === undefined) {
      // First office: initialize to (rivals - 1) since this office counts
      const rivalCount = state.players.size - 1;
      worldBankOfficesRemaining = Math.max(0, rivalCount - 1);
    } else {
      worldBankOfficesRemaining = Math.max(0, worldBankOfficesRemaining - 1);
    }
  }

  const updatedPlayer: PlayerState = {
    ...player,
    completedProjects: nextCompleted,
    spaceMilestonesComplete,
    worldBankOfficesRemaining,
  };

  const nextPlayers = new Map(state.players);
  nextPlayers.set(playerId, updatedPlayer);

  return {
    ...state,
    players: nextPlayers,
    lastValidation: { valid: true },
    log: [
      ...state.log,
      {
        turn: state.turn,
        playerId,
        message: `${player.name} completed project: ${projectDef.name}`,
        type: 'production',
        severity: 'info',
      },
    ],
  };
}
