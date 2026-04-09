import type { GameState, GameAction, System } from './types/GameState';

/**
 * The game engine processes actions through a pipeline of systems.
 * Each system is a pure function: (state, action) => newState.
 * Systems are called in order. Each processes the actions it cares about
 * and passes state through unchanged for others.
 */
export class GameEngine {
  private readonly systems: ReadonlyArray<System>;

  constructor(systems: ReadonlyArray<System>) {
    this.systems = systems;
  }

  /** Apply an action through the entire system pipeline */
  applyAction(state: GameState, action: GameAction): GameState {
    let next = state;
    for (const system of this.systems) {
      next = system(next, action);
    }
    return next;
  }

  /** Apply multiple actions in sequence */
  applyActions(state: GameState, actions: ReadonlyArray<GameAction>): GameState {
    let next = state;
    for (const action of actions) {
      next = this.applyAction(next, action);
    }
    return next;
  }
}
