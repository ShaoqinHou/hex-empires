import { useAudio } from '../../hooks/useAudio';
import { PanelShell } from './PanelShell';

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
            style={{ borderColor: '#30363d' }}
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
                  <button
                    onClick={() => {
                      // Placeholder — wired to a real test-sound call in a later cycle.
                      console.log('Test sound effect');
                    }}
                    className="px-3 py-2 text-xs rounded"
                    style={{
                      backgroundColor: 'var(--panel-border)',
                      color: 'var(--panel-muted-color)',
                    }}
                  >
                    Test Sound
                  </button>
                  <button
                    onClick={() => {
                      console.log('Test combat sound');
                    }}
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
                <button
                  onClick={() => {
                    console.log('Test music track');
                  }}
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
