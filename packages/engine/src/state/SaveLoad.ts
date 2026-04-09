import type { GameState } from '../types/GameState';

/**
 * Serialize GameState to JSON-compatible object.
 * Maps and Sets need special handling.
 */
export function serializeState(state: GameState): string {
  return JSON.stringify(state, (key, value) => {
    if (value instanceof Map) {
      return { __type: 'Map', entries: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
      return { __type: 'Set', values: Array.from(value) };
    }
    return value;
  });
}

/**
 * Deserialize GameState from JSON string.
 */
export function deserializeState(json: string): GameState {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === 'object') {
      if (value.__type === 'Map') {
        return new Map(value.entries);
      }
      if (value.__type === 'Set') {
        return new Set(value.values);
      }
    }
    return value;
  });
}
