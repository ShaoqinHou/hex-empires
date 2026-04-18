import { useState } from 'react';
import { useAudio } from '../../hooks/useAudio';
import { PanelShell } from './PanelShell';

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
    setTimeout(() => { ctx.close().catch(() => undefined); }, durationMs + 100);
  } catch {
    // AudioContext unavailable (test env) — silently ignore.
  }
}

function playArpeggio(baseFreq: number, volume: number): void {
  const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 180, volume), i * 120);
  });
}

interface CategoryConfig {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly testLabel: string;
  readonly onTest: (vol: number) => void;
}

const CATEGORY_CONFIGS: ReadonlyArray<CategoryConfig> = [
  {
    id: 'ui',
    label: 'UI Sounds',
    description: 'Click, hover, panel open/close',
    testLabel: 'Test UI Sound',
    onTest: (v) => playTone(600, 300, v),
  },
  {
    id: 'combat',
    label: 'Combat Sounds',
    description: 'Unit attacks, combat resolution',
    testLabel: 'Test Combat',
    onTest: (v) => playTone(320, 400, v),
  },
  {
    id: 'city',
    label: 'City & Build Sounds',
    description: 'City founded, production complete',
    testLabel: 'Test City',
    onTest: (v) => playTone(440, 500, v),
  },
  {
    id: 'discovery',
    label: 'Discovery Sounds',
    description: 'Tech unlock, civic complete, age transition',
    testLabel: 'Test Discovery',
    onTest: (v) => playArpeggio(440, v),
  },
  {
    id: 'music',
    label: 'Background Music',
    description: 'Era-themed ambient music tracks',
    testLabel: 'Test Music',
    onTest: (v) => playArpeggio(880, v),
  },
];

interface CategoryState {
  enabled: boolean;
  volume: number;
}

type CategoriesState = Record<string, CategoryState>;

const DEFAULT_CATEGORIES: CategoriesState = {
  ui:        { enabled: true,  volume: 0.7 },
  combat:    { enabled: true,  volume: 0.8 },
  city:      { enabled: true,  volume: 0.6 },
  discovery: { enabled: true,  volume: 0.9 },
  music:     { enabled: false, volume: 0.4 },
};

interface AudioSettingsPanelProps {
  readonly onClose: () => void;
}

export function AudioSettingsPanel({ onClose }: AudioSettingsPanelProps) {
  const { isInitialized } = useAudio();
  const [categories, setCategories] = useState<CategoriesState>(DEFAULT_CATEGORIES);

  function toggleCategory(id: string) {
    setCategories(prev => ({
      ...prev,
      [id]: { ...prev[id]!, enabled: !prev[id]!.enabled },
    }));
  }

  function setVolume(id: string, volume: number) {
    setCategories(prev => ({
      ...prev,
      [id]: { ...prev[id]!, volume },
    }));
  }

  return (
    <PanelShell id="audioSettings" title="Audio Settings" onClose={onClose} priority="overlay" width="narrow">
      <div className="flex flex-col gap-1">

        {/* Audio system status */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded mb-2 text-xs"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)',
            border: '1px solid var(--panel-border)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: isInitialized ? 'var(--color-food)' : 'var(--panel-muted-color)' }}
          />
          <span style={{ color: 'var(--panel-muted-color)' }}>
            Audio system: {isInitialized ? 'Active' : 'Will activate on first interaction'}
          </span>
        </div>

        {/* Per-category controls */}
        {CATEGORY_CONFIGS.map((cfg) => {
          const cat = categories[cfg.id] ?? DEFAULT_CATEGORIES[cfg.id]!;
          return (
            <div
              key={cfg.id}
              className="rounded p-3"
              style={{
                border: '1px solid var(--panel-border)',
                backgroundColor: cat.enabled
                  ? 'color-mix(in srgb, var(--panel-bg) 80%, transparent)'
                  : 'transparent',
              }}
            >
              {/* Header row: label + toggle */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--panel-text-color)' }}>
                    {cfg.label}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--panel-muted-color)' }}>
                    {cfg.description}
                  </div>
                </div>
                {/* Toggle switch */}
                <button
                  onClick={() => toggleCategory(cfg.id)}
                  aria-label={`Toggle ${cfg.label}`}
                  aria-pressed={cat.enabled}
                  className="w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 relative"
                  style={{
                    backgroundColor: cat.enabled ? 'var(--color-production)' : 'var(--panel-border)',
                  }}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-200 ${
                      cat.enabled ? 'left-5' : 'left-0.5'
                    }`}
                    style={{ backgroundColor: 'var(--panel-text-color)' }}
                  />
                </button>
              </div>

              {/* Volume + test (only when enabled) */}
              {cat.enabled && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(cat.volume * 100)}
                    onChange={(e) => setVolume(cfg.id, parseInt(e.target.value) / 100)}
                    aria-label={`${cfg.label} volume`}
                    className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, var(--color-production) ${cat.volume * 100}%, var(--panel-border) ${cat.volume * 100}%)`,
                    }}
                  />
                  <span className="text-[10px] w-7 text-right" style={{ color: 'var(--panel-muted-color)' }}>
                    {Math.round(cat.volume * 100)}
                  </span>
                  <button
                    onClick={() => cfg.onTest(cat.volume)}
                    className="text-[10px] px-2 py-0.5 rounded flex-shrink-0 transition-colors"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--panel-border) 80%, transparent)',
                      color: 'var(--panel-muted-color)',
                      border: '1px solid var(--panel-border)',
                    }}
                  >
                    Test
                  </button>
                </div>
              )}
            </div>
          );
        })}

      </div>
    </PanelShell>
  );
}
