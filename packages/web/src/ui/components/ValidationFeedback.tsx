import React, { useEffect, useState } from 'react';
import type { ValidationResult } from '@hex/engine';

interface ValidationFeedbackProps {
  validation: ValidationResult | null;
  onAnimationEnd?: () => void;
}

/**
 * ValidationFeedback displays visual feedback when an action is invalid.
 * Shows toast notification, shake animation, and plays error sound.
 */
export function ValidationFeedback({ validation, onAnimationEnd }: ValidationFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (validation && !validation.valid) {
      setIsVisible(true);
      setIsAnimating(true);
      playErrorSound();

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
        onAnimationEnd?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [validation, onAnimationEnd]);

  if (!validation || !isVisible || validation.valid) {
    return null;
  }

  const categoryColors = {
    movement: 'from-amber-500 to-orange-600',
    combat: 'from-red-500 to-rose-600',
    production: 'from-blue-500 to-indigo-600',
    general: 'from-gray-500 to-slate-600',
  };

  const categoryIcons = {
    movement: '🚶',
    combat: '⚔️',
    production: '🔨',
    general: '⚠️',
  };

  const gradientClass = categoryColors[validation.category];
  const icon = categoryIcons[validation.category];

  return (
    <>
      {/* Toast Notification */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50
        ${isAnimating ? 'animate-slide-down' : ''}
        transition-all duration-300`}>
        <div className={`bg-gradient-to-r ${gradientClass}
          text-white px-6 py-4 rounded-lg shadow-2xl
          flex items-center gap-3 min-w-[300px] max-w-md
          border border-white/20 backdrop-blur-sm`}>
          <span className="text-2xl">{icon}</span>
          <div className="flex-1">
            <div className="font-semibold text-sm uppercase tracking-wide opacity-80">
              {validation.category} Error
            </div>
            <div className="text-base font-medium mt-1">
              {validation.reason}
            </div>
          </div>
        </div>
      </div>

      {/* Shake Animation Overlay */}
      {isAnimating && (
        <div className="fixed inset-0 pointer-events-none z-40 animate-shake">
          <div className="absolute inset-0 bg-red-500/5" />
        </div>
      )}
    </>
  );
}

/**
 * Play a short error beep sound using Web Audio API
 */
function playErrorSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 200; // Low tone for error
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (e) {
    // Silently fail if audio is not supported or blocked
  }
}
