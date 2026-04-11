import { useState, useCallback } from 'react';
import type { HexCoord } from '@hex/engine';
import type { ValidationResult } from '@hex/engine';

export interface InvalidHexMarker {
  coord: HexCoord;
  reason: string;
  timestamp: number;
}

/**
 * Hook to manage invalid hex markers for visual feedback.
 * Automatically expires markers after 2 seconds.
 */
export function useInvalidHexMarkers() {
  const [invalidHexes, setInvalidHexes] = useState<InvalidHexMarker[]>([]);

  const addInvalidHex = useCallback((coord: HexCoord, reason: string) => {
    const marker: InvalidHexMarker = {
      coord,
      reason,
      timestamp: Date.now(),
    };
    setInvalidHexes(prev => [...prev, marker]);

    // Auto-remove after 2 seconds
    setTimeout(() => {
      setInvalidHexes(prev => prev.filter(m => m.timestamp !== marker.timestamp));
    }, 2000);
  }, []);

  const clearInvalidHexes = useCallback(() => {
    setInvalidHexes([]);
  }, []);

  const showValidationFeedback = useCallback((validation: ValidationResult | null, coord?: HexCoord) => {
    if (validation && !validation.valid && coord) {
      addInvalidHex(coord, validation.reason);
    }
  }, [addInvalidHex]);

  return {
    invalidHexes,
    addInvalidHex,
    clearInvalidHexes,
    showValidationFeedback,
  };
}
