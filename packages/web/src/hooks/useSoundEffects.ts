import { useEffect, useRef } from 'react';
import { useAudio } from './useAudio';
import type { GameAction, GameState, Age } from '@hex/engine';

/**
 * Hook to automatically play sound effects based on game events.
 * Call this when dispatching actions or when game state changes.
 */
export function useSoundEffects(
  state: GameState,
  previousAction: GameAction | null,
  previousState: GameState | null,
): void {
  const { playSound, playMusic, isInitialized } = useAudio();
  const previousAgeRef = useRef<Age | null>(null);
  const currentMusicRef = useRef<string | null>(null);

  // Play sounds based on action type
  useEffect(() => {
    if (!previousAction || !isInitialized) return;

    const playActionSound = async () => {
      switch (previousAction.type) {
        case 'MOVE_UNIT':
          await playSound('unit_move');
          break;

        case 'ATTACK_UNIT':
          // Check if it's a ranged or melee attack
          const attacker = state.units.get(previousAction.attackerId);
          if (attacker) {
            const unitDef = state.config.units.get(attacker.typeId);
            if (unitDef && unitDef.rangedCombat > 0) {
              await playSound('unit_ranged_attack');
            } else {
              await playSound('unit_attack');
            }
          }
          break;

        case 'ATTACK_CITY':
          await playSound('unit_attack');
          break;

        case 'FOUND_CITY':
          await playSound('city_found');
          break;

        case 'SET_PRODUCTION':
        case 'PURCHASE_ITEM':
          // Building/unit sounds handled separately when complete
          break;

        case 'SET_RESEARCH':
        case 'SET_MASTERY':
          await playSound('click');
          break;

        case 'END_TURN':
          await playSound('turn_end');
          break;

        case 'FORTIFY_UNIT':
          await playSound('confirm');
          break;

        default:
          await playSound('click');
          break;
      }
    };

    playActionSound();
  }, [previousAction, state, playSound, isInitialized]);

  // Play sounds based on state changes
  useEffect(() => {
    if (!previousState || !isInitialized) return;

    const playStateChangeSounds = async () => {
      // Check for unit deaths (units that existed before but not now)
      if (previousState.units.size !== state.units.size) {
        for (const [id, unit] of previousState.units) {
          if (!state.units.has(id)) {
            await playSound('unit_death');
          }
        }
      }

      // Check for new cities
      if (previousState.cities.size !== state.cities.size) {
        for (const [id, city] of state.cities) {
          if (!previousState.cities.has(id)) {
            await playSound('city_found');
          }
        }
      }

      // Check for completed production (would need to track production progress)
      // This would be handled by the production system directly

      // Check for completed research
      if (previousState.players.size === state.players.size) {
        for (const [playerId, player] of state.players) {
          const prevPlayer = previousState.players.get(playerId);
          if (prevPlayer && player.researchedTechs.length > prevPlayer.researchedTechs.length) {
            await playSound('tech_complete');
          }

          // Check for civic completion
          if (player.researchedCivics.length > (prevPlayer?.researchedCivics.length || 0)) {
            await playSound('tech_complete');
          }
        }
      }

      // Check for victory
      if (!previousState.victory.winner && state.victory.winner) {
        if (state.victory.winner === state.currentPlayerId) {
          await playSound('victory');
        } else {
          await playSound('defeat');
        }
      }
    };

    playStateChangeSounds();
  }, [state, previousState, playSound, isInitialized]);

  // Manage background music based on age and war status
  useEffect(() => {
    if (!isInitialized) return;

    const currentPlayer = state.players.get(state.currentPlayerId);
    if (!currentPlayer) return;

    const currentAge = currentPlayer.age;
    const previousAge = previousAgeRef.current;

    const manageMusic = async () => {
      // Check if at war
      const isAtWar = Array.from(state.diplomacy.relations.values()).some(
        rel => rel.status === 'war' && rel.warSupport !== 0
      );

      let targetTrack: Age | 'war' | 'peace' = currentAge;

      // War music takes priority
      if (isAtWar) {
        targetTrack = 'war';
      } else {
        targetTrack = 'peace';
      }

      // Only change music if age changed or war status changed significantly
      if (previousAge !== currentAge || currentMusicRef.current !== targetTrack) {
        await playMusic(targetTrack);
        currentMusicRef.current = targetTrack;
      }

      previousAgeRef.current = currentAge;
    };

    manageMusic();
  }, [state.age.currentAge, state, playMusic, isInitialized]);
}

/**
 * Hook to play UI interaction sounds.
 * Call this for button clicks, confirmations, errors, etc.
 */
export function useUISounds() {
  const { playSound, isInitialized } = useAudio();

  const playClickSound = async () => {
    if (isInitialized) {
      await playSound('click');
    }
  };

  const playConfirmSound = async () => {
    if (isInitialized) {
      await playSound('confirm');
    }
  };

  const playErrorSound = async () => {
    if (isInitialized) {
      await playSound('error');
    }
  };

  const playSelectSound = async () => {
    if (isInitialized) {
      await playSound('unit_select');
    }
  };

  return {
    playClickSound,
    playConfirmSound,
    playErrorSound,
    playSelectSound,
  };
}
