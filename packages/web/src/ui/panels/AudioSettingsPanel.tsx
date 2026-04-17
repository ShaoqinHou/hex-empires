import { useAudio } from '../../hooks/useAudio';
import { PanelShell } from './PanelShell';

/**
 * Minimal WebAudio synth for test-button feedback.
 * Gated by the panel's master soundVolume (0-1 scale).
 * Sine-wave tone: freq Hz, durationMs, volume 0-1.
 */
function playTone(freq: number, durationMs: number, volume: number): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2 * volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    // Auto-close the context after the tone finishes to avoid resource leaks.
    setTimeout(() => { ctx.close().catch(() => undefined); }, durationMs + 100);
  } catch {
    // AudioContext unavailable (test env, headless) — silently ignore.
  }
}

/** Quick arpeggio: plays three ascending tones in rapid succession. */
function playArpeggio(baseFreq: number, volume: number): void {
  const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 180, volume), i * 120);
  });
}

interface AudioSettingsPanelProps {
  readonly onClose: () => void;
}

export function AudioSettingsPanel({ onClose }: AudioSettingsPanelProps) {
  const {
    soundEnabled,
    musicEnabled,
    soundVolume,
    musicVolume,
    toggleSound,
    toggleMusic,
    setSoundVolume,
    setMusicVolume,
  } = useAudio();

  return (
    <PanelShell id="audioSettings" title="Audio" onClose={onClose} priority="overlay" width="narrow">
      <div className="space-y-6">
        {/* Sound Effects */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium" style={{ color: 'var(--panel-text-color)' }}>
                Sound Effects
              </div>
              <div className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>
                Unit movement, combat, UI sounds
              </div>
            </div>
            <button
              onClick={toggleSound}
              aria-label="Toggle sound effects"
              className="w-12 h-6 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: soundEnabled
                  ? 'var(--color-production)'
                  : 'var(--panel-border)',
              }}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-md transition-transform duration-200 ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
                style={{ backgroundColor: 'var(--panel-text-color)' }}
              />
            </button>
          </div>

          {soundEnabled && (
            <div className="flex items-center gap-3 pl-4">
              <span className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>
                Volume
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(soundVolume * 100)}
                onChange={(e) => setSoundVolume(parseInt(e.target.value) / 100)}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-production) ${soundVolume * 100}%, var(--panel-border) ${soundVolume * 100}%)`,
                }}
              />
              <span
                className="text-xs w-8 text-right"
                style={{ color: 'var(--panel-muted-color)' }}
              >
                {Math.round(soundVolume * 100)}
              </span>
            </div>
          )}
        </div>

        {/* Music */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium" style={{ color: 'var(--panel-text-color)' }}>
                Background Music
              </div>
              <div className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>
                Age-themed music tracks
              </div>
            </div>
            <button
              onClick={toggleMusic}
              aria-label="Toggle background music"
              className="w-12 h-6 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: musicEnabled
                  ? 'var(--color-science)'
                  : 'var(--panel-border)',
              }}
            >
              <div
                className={`w-5 h-5 rounded-full shadow-md transition-transform duration-200 ${
                  musicEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
                style={{ backgroundColor: 'var(--panel-text-color)' }}
              />
            </button>
          </div>

          {musicEnabled && (
            <div className="flex items-center gap-3 pl-4">
              <span className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>
                Volume
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(musicVolume * 100)}
                onChange={(e) => setMusicVolume(parseInt(e.target.value) / 100)}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--color-science) ${musicVolume * 100}%, var(--panel-border) ${musicVolume * 100}%)`,
                }}
              />
              <span
                className="text-xs w-8 text-right"
                style={{ color: 'var(--panel-muted-color)' }}
              >
                {Math.round(musicVolume * 100)}
              </span>
            </div>
          )}
        </div>

        {/* Audio Test Buttons */}
        {(soundEnabled || musicEnabled) && (
          <div
            className="pt-4 border-t"
            style={{ borderColor: 'var(--panel-border)' }}
          >
            <div
              className="text-xs font-medium mb-3"
              style={{ color: 'var(--panel-muted-color)' }}
            >
              Test Audio
            </div>
            <div className="grid grid-cols-2 gap-2">
              {soundEnabled && (
                <>
                  {/* 600 Hz — gentle UI click tone */}
                  <button
                    onClick={() => playTone(600, 300, soundVolume)}
                    className="px-3 py-2 text-xs rounded"
                    style={{
                      backgroundColor: 'var(--panel-border)',
                      color: 'var(--panel-muted-color)',
                    }}
                  >
                    Test Sound
                  </button>
                  {/* 320 Hz — low thud, combat feel */}
                  <button
                    onClick={() => playTone(320, 400, soundVolume)}
                    className="px-3 py-2 text-xs rounded"
                    style={{
                      backgroundColor: 'var(--panel-border)',
                      color: 'var(--panel-muted-color)',
                    }}
                  >
                    Test Combat
                  </button>
                </>
              )}
              {musicEnabled && (
                /* Arpeggio from 880 Hz — pleasant musical flourish */
                <button
                  onClick={() => playArpeggio(880, musicVolume)}
                  className="px-3 py-2 text-xs rounded col-span-2"
                  style={{
                    backgroundColor: 'var(--panel-border)',
                    color: 'var(--panel-muted-color)',
                  }}
                >
                  Test Music
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
