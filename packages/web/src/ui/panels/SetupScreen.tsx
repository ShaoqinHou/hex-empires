import { useState, useEffect } from 'react';
import { ALL_LEADERS, ALL_ANTIQUITY_CIVS } from '@hex/engine';
import type { GameSetupConfig } from '../../providers/GameProvider';

const SAVE_KEY = 'hex-empires-save';

interface SaveInfo {
  turn: number;
  civName: string;
  savedAt: string | null;
}

function readSaveInfo(): SaveInfo | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    // Lightweight parse — only pull top-level fields we need
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const turn = typeof obj.turn === 'number' ? obj.turn : 1;
    // players is a serialized Map: { __type: 'Map', entries: [['player1', {...}], ...] }
    let civName = 'Unknown Civilization';
    const playersRaw = obj.players as { __type?: string; entries?: [string, Record<string, unknown>][] } | undefined;
    if (playersRaw?.entries) {
      const humanEntry = playersRaw.entries.find(([, p]) => p.isHuman === true);
      if (humanEntry) {
        const civId = humanEntry[1].civilizationId as string | undefined;
        const matched = ALL_ANTIQUITY_CIVS.find(c => c.id === civId);
        civName = matched?.name ?? civId ?? 'Unknown';
      }
    }
    const savedAt = localStorage.getItem(SAVE_KEY + '-meta');
    return { turn, civName, savedAt };
  } catch {
    return null;
  }
}

interface SetupScreenProps {
  onStart: (config: GameSetupConfig) => void;
  onLoadGame?: () => void;
}

const MAP_SIZES = [
  { label: 'Small', width: 40, height: 30 },
  { label: 'Medium', width: 60, height: 40 },
  { label: 'Large', width: 80, height: 50 },
] as const;

export function SetupScreen({ onStart, onLoadGame }: SetupScreenProps) {
  const [leaderId, setLeaderId] = useState<string>(ALL_LEADERS[0].id);
  const [civId, setCivId] = useState<string>(ALL_ANTIQUITY_CIVS[0].id);
  const [mapSizeIndex, setMapSizeIndex] = useState<number>(1); // default Medium
  const [numAI, setNumAI] = useState<number>(1);
  const [saveInfo, setSaveInfo] = useState<SaveInfo | null>(null);

  useEffect(() => {
    setSaveInfo(readSaveInfo());
  }, []);

  const selectedLeader = ALL_LEADERS.find(l => l.id === leaderId)!;
  const selectedCiv = ALL_ANTIQUITY_CIVS.find(c => c.id === civId)!;
  const selectedMapSize = MAP_SIZES[mapSizeIndex];

  function handleStart() {
    onStart({
      civId,
      leaderId,
      mapWidth: selectedMapSize.width,
      mapHeight: selectedMapSize.height,
      numAI,
    });
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto py-8"
      style={{
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212, 168, 83, 0.08) 0%, transparent 50%)',
      }}
    >
      {/* Title */}
      <div className="mb-6 text-center pt-8">
        <h1
          className="text-5xl font-bold tracking-[0.25em] uppercase mb-2"
          style={{
            color: 'var(--color-gold, #d4a853)',
            textShadow: '0 0 40px rgba(212, 168, 83, 0.3)',
          }}
        >
          Hex Empires
        </h1>
        <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--color-text-muted)' }}>
          A new age awaits
        </p>
      </div>

      {/* Setup card */}
      <div
        className="w-full max-w-4xl rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Leader selection */}
        <Section title="Choose Your Leader">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {ALL_LEADERS.map(leader => (
              <LeaderCard
                key={leader.id}
                leader={leader}
                selected={leaderId === leader.id}
                onSelect={() => setLeaderId(leader.id)}
              />
            ))}
          </div>
          {/* Leader ability preview */}
          {selectedLeader && (
            <div
              className="mt-3 p-3 rounded text-xs"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              <span className="font-bold" style={{ color: 'var(--color-gold, #d4a853)' }}>
                {selectedLeader.ability.name}:
              </span>{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>
                {selectedLeader.ability.description}
              </span>
            </div>
          )}
        </Section>

        <Divider />

        {/* Civilization selection */}
        <Section title="Choose Your Civilization">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {ALL_ANTIQUITY_CIVS.map(civ => (
              <CivCard
                key={civ.id}
                civ={civ}
                selected={civId === civ.id}
                onSelect={() => setCivId(civ.id)}
              />
            ))}
          </div>
          {/* Civ ability preview */}
          {selectedCiv && (
            <div
              className="mt-3 p-3 rounded text-xs"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
            >
              <span className="font-bold" style={{ color: selectedCiv.color ?? 'var(--color-gold, #d4a853)' }}>
                {selectedCiv.uniqueAbility.name}:
              </span>{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>
                {selectedCiv.uniqueAbility.description}
              </span>
            </div>
          )}
        </Section>

        <Divider />

        {/* Map size + AI opponents — side by side */}
        <div className="flex gap-0">
          <div className="flex-1" style={{ borderRight: '1px solid var(--color-border)' }}>
            <Section title="Map Size">
              <div className="flex flex-col gap-2">
                {MAP_SIZES.map((size, idx) => (
                  <button
                    key={size.label}
                    onClick={() => setMapSizeIndex(idx)}
                    className="flex items-center justify-between px-4 py-3 rounded text-sm transition-colors cursor-pointer"
                    style={{
                      backgroundColor: mapSizeIndex === idx ? 'var(--color-accent, #3b4a6b)' : 'var(--color-bg)',
                      border: `1px solid ${mapSizeIndex === idx ? 'var(--color-gold, #d4a853)' : 'var(--color-border)'}`,
                      color: mapSizeIndex === idx ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}
                  >
                    <span className="font-semibold">{size.label}</span>
                    <span className="text-xs font-mono opacity-70">{size.width}x{size.height}</span>
                  </button>
                ))}
              </div>
            </Section>
          </div>

          <div className="flex-1">
            <Section title="AI Opponents">
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(count => (
                  <button
                    key={count}
                    onClick={() => setNumAI(count)}
                    className="flex items-center gap-3 px-4 py-3 rounded text-sm transition-colors cursor-pointer"
                    style={{
                      backgroundColor: numAI === count ? 'var(--color-accent, #3b4a6b)' : 'var(--color-bg)',
                      border: `1px solid ${numAI === count ? 'var(--color-gold, #d4a853)' : 'var(--color-border)'}`,
                      color: numAI === count ? 'var(--color-text)' : 'var(--color-text-muted)',
                    }}
                  >
                    <span className="font-semibold">{count}</span>
                    <span className="text-xs opacity-70">
                      {count === 1 ? 'opponent' : 'opponents'}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          </div>
        </div>

        <Divider />

        {/* Start / Load buttons */}
        <div className="px-6 py-5 flex flex-col items-center gap-3">
          <button
            onClick={handleStart}
            className="px-12 py-4 rounded-lg font-bold text-lg tracking-wide uppercase transition-all cursor-pointer hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              minWidth: '240px',
            }}
          >
            Start Game →
          </button>

          {saveInfo && onLoadGame && (
            <button
              onClick={onLoadGame}
              className="flex flex-col items-center gap-1 px-12 py-3 rounded-lg font-semibold text-sm tracking-wide uppercase transition-all cursor-pointer hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, rgba(59,74,107,0.9) 0%, rgba(39,52,82,0.9) 100%)',
                color: 'var(--color-gold, #d4a853)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                border: '1px solid var(--color-gold, #d4a853)',
                minWidth: '240px',
              }}
            >
              <span>Load Saved Game</span>
              <span
                className="text-xs font-normal normal-case tracking-normal"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Turn {saveInfo.turn} · {saveInfo.civName}
                {saveInfo.savedAt ? ` · ${saveInfo.savedAt}` : ''}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4">
      <h2
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', backgroundColor: 'var(--color-border)' }} />;
}

function LeaderCard({
  leader,
  selected,
  onSelect,
}: {
  leader: (typeof ALL_LEADERS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 px-3 py-3 rounded transition-colors cursor-pointer text-center"
      style={{
        backgroundColor: selected ? 'var(--color-accent, #3b4a6b)' : 'var(--color-bg)',
        border: `1px solid ${selected ? 'var(--color-gold, #d4a853)' : 'var(--color-border)'}`,
      }}
    >
      {/* Avatar placeholder */}
      <div
        aria-hidden="true"
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          backgroundColor: selected ? 'var(--color-gold, #d4a853)' : 'var(--color-border)',
          color: selected ? 'var(--color-bg)' : 'var(--color-text-muted)',
        }}
      >
        {leader.name.charAt(0)}
      </div>
      <span
        className="text-xs font-semibold leading-tight"
        style={{ color: selected ? 'var(--color-text)' : 'var(--color-text-muted)' }}
      >
        {leader.name}
      </span>
    </button>
  );
}

function CivCard({
  civ,
  selected,
  onSelect,
}: {
  civ: (typeof ALL_ANTIQUITY_CIVS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 px-3 py-3 rounded transition-colors cursor-pointer text-center"
      style={{
        backgroundColor: selected ? 'var(--color-accent, #3b4a6b)' : 'var(--color-bg)',
        border: `1px solid ${selected ? (civ.color ?? 'var(--color-gold, #d4a853)') : 'var(--color-border)'}`,
      }}
    >
      {/* Color swatch */}
      <div
        aria-hidden="true"
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          backgroundColor: civ.color ?? 'var(--color-border)',
          color: '#fff',
        }}
      >
        {civ.name.charAt(0)}
      </div>
      <span
        className="text-xs font-semibold leading-tight"
        style={{ color: selected ? 'var(--color-text)' : 'var(--color-text-muted)' }}
      >
        {civ.name}
      </span>
    </button>
  );
}
