/**
 * AnimationEventBus — lightweight action-event stream for the canvas layer.
 *
 * Lives in hooks/ so both providers/ and canvas/ can import it without
 * violating the import-boundary rule (providers/ → canvas/ is forbidden;
 * both → hooks/ is permitted).
 *
 * GameProvider calls `emit(action, prevState, nextState)` after every
 * applyAction. GameCanvas subscribes and enqueues animations based on the
 * diff without the Provider needing to import AnimationManager.
 */

import type { GameState, GameAction } from '@hex/engine';

export interface AnimationEvent {
  readonly action: GameAction;
  readonly prevState: GameState;
  readonly nextState: GameState;
}

export type AnimationEventListener = (event: AnimationEvent) => void;

export class AnimationEventBus {
  private listeners: Set<AnimationEventListener> = new Set();

  /** Subscribe to animation events. Returns an unsubscribe function. */
  subscribe(listener: AnimationEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Emit an event to all subscribed listeners. */
  emit(action: GameAction, prevState: GameState, nextState: GameState): void {
    const event: AnimationEvent = { action, prevState, nextState };
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

/**
 * Singleton bus shared between GameProvider and GameCanvas.
 * Both are mounted once per game session, so a module-level singleton
 * is safe and avoids React context plumbing for a non-React value.
 */
export const animationEventBus = new AnimationEventBus();
