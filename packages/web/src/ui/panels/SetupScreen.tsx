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
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const turn = typeof obj.turn === 'number' ? obj.turn : 1;
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
  { label: 'Small',  width: 40, height: 30, desc: '40 × 30', dots: 3 },
  { label: 'Medium', width: 60, height: 40, desc: '60 × 40', dots: 5 },
  { label: 'Large',  width: 80, height: 50, desc: '80 × 50', dots: 7 },
] as const;

/* ── Inline styles for the hero title section ── */
const TITLE_STYLE: React.CSSProperties = {
  fontFamily: 'var(--type-heading-family, "Cinzel Decorative", Cinzel, Georgia, serif)',
  fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
  fontWeight: 800,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-accent)',
  textShadow: '0 0 48px rgba(212,148,58,0.45), 0 2px 4px rgba(0,0,0,0.8)',
  lineHeight: 1.1,
};

const SUBTITLE_STYLE: React.CSSProperties = {
  fontSize: '0.75rem',
  letterSpacing: '0.35em',
  textTransform: 'uppercase',
  color: 'var(--color-text-muted)',
  marginTop: '0.5rem',
};

/* ── Card base styles ── */
const cardBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  padding: '10px 8px 8px',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'border-color 0.12s, box-shadow 0.12s',
  border: '1.5px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  outline: 'none',
};

export function SetupScreen({ onStart, onLoadGame }: SetupScreenProps) {
  const [leaderId, setLeaderId]     = useState<string>(ALL_LEADERS[0].id);
  const [civId, setCivId]           = useState<string>(ALL_ANTIQUITY_CIVS[0].id);
  const [mapSizeIndex, setMapSizeIndex] = useState<number>(1);
  const [numAI, setNumAI]           = useState<number>(1);
  const [saveInfo, setSaveInfo]     = useState<SaveInfo | null>(null);

  useEffect(() => { setSaveInfo(readSaveInfo()); }, []);

  const selectedLeader = ALL_LEADERS.find(l => l.id === leaderId)!;
  const selectedCiv    = ALL_ANTIQUITY_CIVS.find(c => c.id === civId)!;

  function handleStart() {
    onStart({
      civId,
      leaderId,
      mapWidth:  MAP_SIZES[mapSizeIndex].width,
      mapHeight: MAP_SIZES[mapSizeIndex].height,
      numAI,
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflowY: 'auto',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        /* Warm hex-pattern radial glow + subtle hex tessellation */
        backgroundImage: [
          'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(212,148,58,0.12) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 40% at 50% 110%, rgba(90,60,20,0.18) 0%, transparent 55%)',
          /* horizontal faint hex lines */
          'repeating-linear-gradient(60deg, transparent, transparent 28px, rgba(255,255,255,0.015) 28px, rgba(255,255,255,0.015) 29px)',
          'repeating-linear-gradient(-60deg, transparent, transparent 28px, rgba(255,255,255,0.015) 28px, rgba(255,255,255,0.015) 29px)',
        ].join(', '),
      }}
    >

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem 2rem', maxWidth: '720px', width: '100%' }}>
        {/* Decorative line above */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--color-border))' }} />
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.25em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Turn-based Strategy
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--color-border))' }} />
        </div>

        <h1 style={TITLE_STYLE}>Hex Empires</h1>
        <p style={SUBTITLE_STYLE}>Build your empire. Shape history.</p>
      </div>

      {/* ── Main setup area ──────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          padding: '0 1rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >

        {/* Panel card wrapper */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >

          {/* ── Leader selection ─────────────────────────────────────────── */}
          <SectionHeader label="Choose Your Leader" />
          <div style={{ padding: '0 20px 16px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                gap: '8px',
              }}
            >
              {ALL_LEADERS.map(leader => (
                <LeaderCard
                  key={leader.id}
                  leader={leader}
                  selected={leaderId === leader.id}
                  onSelect={() => setLeaderId(leader.id)}
                />
              ))}
            </div>
            {/* Ability callout */}
            {selectedLeader && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderLeft: '3px solid var(--color-accent)',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                  {selectedLeader.ability.name}:
                </span>{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {selectedLeader.ability.description}
                </span>
              </div>
            )}
          </div>

          <PanelDivider />

          {/* ── Civilization selection ───────────────────────────────────── */}
          <SectionHeader label="Choose Your Civilization" />
          <div style={{ padding: '0 20px 16px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                gap: '8px',
              }}
            >
              {ALL_ANTIQUITY_CIVS.map(civ => (
                <CivCard
                  key={civ.id}
                  civ={civ}
                  selected={civId === civ.id}
                  onSelect={() => setCivId(civ.id)}
                />
              ))}
            </div>
            {/* Civ ability callout */}
            {selectedCiv && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderLeft: `3px solid ${selectedCiv.color ?? 'var(--color-accent)'}`,
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ fontWeight: 700, color: selectedCiv.color ?? 'var(--color-accent)' }}>
                  {selectedCiv.uniqueAbility.name}:
                </span>{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {selectedCiv.uniqueAbility.description}
                </span>
              </div>
            )}
          </div>

          <PanelDivider />

          {/* ── Map size + AI row ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 0 }}>
            {/* Map size */}
            <div style={{ flex: 1, borderRight: '1px solid var(--color-border)' }}>
              <SectionHeader label="Map Size" />
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {MAP_SIZES.map((size, idx) => {
                  const active = mapSizeIndex === idx;
                  return (
                    <button
                      key={size.label}
                      onClick={() => setMapSizeIndex(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        backgroundColor: active ? 'rgba(212,148,58,0.12)' : 'var(--color-bg)',
                        outline: 'none',
                        transition: 'border-color 0.12s',
                      }}
                    >
                      {/* Hex dot grid preview */}
                      <HexDotGrid count={size.dots} active={active} />
                      <div style={{ textAlign: 'left' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                          }}
                        >
                          {size.label}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--type-mono-family, monospace)' }}>
                          {size.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI opponents */}
            <div style={{ flex: 1 }}>
              <SectionHeader label="AI Opponents" />
              <div style={{ padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {([1, 2, 3] as const).map(count => {
                  const active = numAI === count;
                  return (
                    <button
                      key={count}
                      onClick={() => setNumAI(count)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        backgroundColor: active ? 'rgba(212,148,58,0.12)' : 'var(--color-bg)',
                        outline: 'none',
                        transition: 'border-color 0.12s',
                      }}
                    >
                      {/* Enemy icon dots */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {Array.from({ length: count }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                            }}
                          />
                        ))}
                      </div>
                      <span
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
                        }}
                      >
                        {count} {count === 1 ? 'Opponent' : 'Opponents'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <PanelDivider />

          {/* ── CTA buttons ──────────────────────────────────────────────── */}
          <div
            style={{
              padding: '24px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {saveInfo && onLoadGame ? (
              <>
                <button
                  data-testid="resume-game-button"
                  onClick={onLoadGame}
                  style={{
                    minWidth: '260px',
                    padding: '14px 32px',
                    borderRadius: '10px',
                    border: '2px solid rgba(255,255,255,0.2)',
                    background: 'linear-gradient(135deg, var(--panel-setup-resume-from) 0%, var(--panel-setup-resume-to) 100%)',
                    color: 'var(--panel-text-bright)',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                    outline: 'none',
                    transition: 'filter 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                >
                  <span>Resume Game →</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, textTransform: 'none', opacity: 0.85, letterSpacing: '0.02em' }}>
                    Turn {saveInfo.turn} · {saveInfo.civName}
                    {saveInfo.savedAt ? ` · ${saveInfo.savedAt}` : ''}
                  </span>
                </button>

                <button
                  data-testid="new-game-button"
                  onClick={handleStart}
                  style={{
                    minWidth: '260px',
                    padding: '11px 28px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--color-accent)',
                    background: 'transparent',
                    color: 'var(--color-accent)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background-color 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(212,148,58,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  New Game (overwrites save)
                </button>
              </>
            ) : (
              <button
                data-testid="start-game-button"
                onClick={handleStart}
                style={{
                  minWidth: '260px',
                  padding: '16px 40px',
                  borderRadius: '10px',
                  border: '2px solid rgba(212,148,58,0.4)',
                  background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--panel-setup-start-to) 100%)',
                  color: 'var(--color-bg)',
                  fontFamily: 'var(--type-heading-family, Cinzel, Georgia, serif)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 4px 24px rgba(212,148,58,0.4)',
                  outline: 'none',
                  transition: 'filter 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >
                Begin Your Empire →
              </button>
            )}
          </div>

        </div>

        {/* ── Footer note ────────────────────────────────────────────────── */}
        <p
          style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            color: 'var(--color-text-muted)',
            opacity: 0.6,
          }}
        >
          A Civ VII-inspired browser strategy game · ESC to open help in-game
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '14px 20px 10px',
      }}
    >
      <span
        style={{
          fontSize: '0.65rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: 'var(--color-text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-border)' }} />
    </div>
  );
}

function PanelDivider() {
  return (
    <div
      style={{
        height: '1px',
        backgroundColor: 'var(--color-border)',
        background: 'linear-gradient(to right, var(--color-border), var(--color-accent), var(--color-border))',
        opacity: 0.45,
      }}
    />
  );
}

function HexDotGrid({ count, active }: { count: number; active: boolean }) {
  /* Renders a tiny hex-grid dot pattern to visually indicate map size */
  const color = active ? 'var(--color-accent)' : 'var(--color-border)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', opacity: active ? 1 : 0.6 }}>
      {Array.from({ length: 3 }).map((_, row) => (
        <div
          key={row}
          style={{
            display: 'flex',
            gap: '3px',
            marginLeft: row % 2 === 1 ? '4px' : '0',
          }}
        >
          {Array.from({ length: Math.min(count, row === 1 ? count : count - 1) }).map((_, col) => (
            <div
              key={col}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: color,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
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
      style={{
        ...cardBase,
        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
        backgroundColor: selected ? 'rgba(212,148,58,0.08)' : 'var(--color-bg)',
        boxShadow: selected ? '0 0 0 1px var(--color-accent), inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
      }}
    >
      {/* Avatar circle */}
      <div
        aria-hidden="true"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          fontWeight: 800,
          fontFamily: 'var(--type-heading-family, Cinzel, Georgia, serif)',
          backgroundColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
          color: selected ? 'var(--color-bg)' : 'var(--color-text-muted)',
          border: selected ? '2px solid rgba(255,255,255,0.3)' : '1.5px solid transparent',
        }}
      >
        {leader.name.charAt(0)}
      </div>
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: selected ? 700 : 500,
          lineHeight: 1.2,
          textAlign: 'center',
          color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
          maxWidth: '76px',
        }}
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
  const accentColor = civ.color ?? 'var(--color-accent)';
  return (
    <button
      onClick={onSelect}
      style={{
        ...cardBase,
        borderColor: selected ? accentColor : 'var(--color-border)',
        backgroundColor: selected ? `${accentColor}14` : 'var(--color-bg)',
        boxShadow: selected ? `0 0 0 1px ${accentColor}` : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Color band at top */}
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          backgroundColor: accentColor,
          opacity: selected ? 1 : 0.45,
          marginBottom: '2px',
        }}
      />
      {/* Initial in civ color */}
      <div
        aria-hidden="true"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.9rem',
          fontWeight: 800,
          fontFamily: 'var(--type-heading-family, Cinzel, Georgia, serif)',
          backgroundColor: `${accentColor}30`,
          color: accentColor,
          border: `1.5px solid ${selected ? accentColor : 'transparent'}`,
        }}
      >
        {civ.name.charAt(0)}
      </div>
      <span
        style={{
          fontSize: '0.68rem',
          fontWeight: selected ? 700 : 500,
          lineHeight: 1.2,
          textAlign: 'center',
          color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
          maxWidth: '76px',
        }}
      >
        {civ.name}
      </span>
    </button>
  );
}
