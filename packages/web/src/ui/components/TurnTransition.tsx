import { useEffect, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import type { GameEvent } from '@hex/engine';

interface TurnTransitionProps {
  onComplete?: () => void;
}

export function TurnTransition({ onComplete }: TurnTransitionProps) {
  const { state } = useGameState();
  const [showOverlay, setShowOverlay] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [previousTurn, setPreviousTurn] = useState(state.turn);

  useEffect(() => {
    // Detect turn change
    if (state.turn !== previousTurn) {
      setShowOverlay(true);

      // Collect events from the log for the current player
      const playerEvents = state.log.filter(
        e => e.playerId === state.currentPlayerId && e.turn === state.turn
      );

      const eventMessages = playerEvents.map(e => e.message);
      setNotifications(eventMessages);

      // Auto-dismiss quickly so it doesn't block gameplay
      const timer = setTimeout(() => {
        setShowOverlay(false);
        onComplete?.();
      }, 600);

      setPreviousTurn(state.turn);

      return () => clearTimeout(timer);
    }
  }, [state.turn, state.log, state.currentPlayerId, previousTurn, onComplete]);

  const handleDismiss = () => {
    setShowOverlay(false);
    onComplete?.();
  };

  if (!showOverlay) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={handleDismiss}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Fade overlay - less opaque */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{
          opacity: showOverlay ? 0.15 : 0,
        }}
      />

      {/* Turn announcement */}
      <div className="relative text-center animate-fade-in pointer-events-none">
        <div
          className="text-6xl font-bold mb-4"
          style={{
            color: 'var(--color-accent)',
            textShadow: '0 0 20px rgba(100, 181, 246, 0.8)',
          }}
        >
          Turn {state.turn}
        </div>

        {state.age.currentAge && (
          <div
            className="text-xl uppercase tracking-widest mb-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {state.age.currentAge} Age
          </div>
        )}

        {/* Notifications - only show if there are meaningful events */}
        {notifications.length > 0 && notifications.some(n => !n.includes('started')) && (
          <div
            className="max-w-md mx-auto bg-surface rounded-lg p-4 space-y-2"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            {notifications
              .filter(n => !n.includes('started')) // Filter out "Turn started" messages
              .slice(0, 3)
              .map((msg, i) => (
                <div
                  key={i}
                  className="text-sm"
                  style={{ color: 'var(--color-text)' }}
                >
                  {msg}
                </div>
              ))}
            {notifications.filter(n => !n.includes('started')).length > 3 && (
              <div
                className="text-xs italic"
                style={{ color: 'var(--color-text-muted)' }}
              >
                +{notifications.filter(n => !n.includes('started')).length - 3} more events
              </div>
            )}
          </div>
        )}

        {/* Click to continue hint */}
        <div
          className="text-sm mt-6 opacity-60"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Click anywhere to continue
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
