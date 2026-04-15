import { useAudio } from '../../hooks/useAudio';

export function AudioSettings() {
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
    <div className="space-y-6">
      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--color-text)' }}>
        Audio Settings
      </h3>

      {/* Sound Effects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium" style={{ color: 'var(--color-text)' }}>
              Sound Effects
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Unit movement, combat, UI sounds
            </div>
          </div>
          <button
            onClick={toggleSound}
            className="w-12 h-6 rounded-full transition-colors duration-200"
            style={{ backgroundColor: soundEnabled ? 'var(--color-production)' : 'var(--color-bg)' }}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {soundEnabled && (
          <div className="flex items-center gap-3 pl-4">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
                background: `linear-gradient(to right, var(--color-production) ${soundVolume * 100}%, var(--color-bg) ${soundVolume * 100}%)`,
              }}
            />
            <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
              {Math.round(soundVolume * 100)}
            </span>
          </div>
        )}
      </div>

      {/* Music */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium" style={{ color: 'var(--color-text)' }}>
              Background Music
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Age-themed music tracks
            </div>
          </div>
          <button
            onClick={toggleMusic}
            className="w-12 h-6 rounded-full transition-colors duration-200"
            style={{ backgroundColor: musicEnabled ? 'var(--color-science)' : 'var(--color-bg)' }}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                musicEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {musicEnabled && (
          <div className="flex items-center gap-3 pl-4">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
                background: `linear-gradient(to right, var(--color-science) ${musicVolume * 100}%, var(--color-bg) ${musicVolume * 100}%)`,
              }}
            />
            <span className="text-xs w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
              {Math.round(musicVolume * 100)}
            </span>
          </div>
        )}
      </div>

      {/* Audio Test Buttons */}
      {(soundEnabled || musicEnabled) && (
        <div className="pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Test Audio
          </div>
          <div className="grid grid-cols-2 gap-2">
            {soundEnabled && (
              <>
                <button
                  onClick={() => {
                    // This would trigger a test sound
                    // For now, it's a placeholder
                    console.log('Test sound effect');
                  }}
                  className="px-3 py-2 text-xs rounded"
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                >
                  Test Sound
                </button>
                <button
                  onClick={() => {
                    console.log('Test combat sound');
                  }}
                  className="px-3 py-2 text-xs rounded"
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
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
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
              >
                Test Music
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
