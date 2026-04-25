/**
 * MementoPanel — display and manage the player's unlocked mementos.
 *
 * Mementos are persistent cross-session keepsakes that the player
 * equips before a game starts to gain bonus effects. This panel
 * shows the full pool of unlocked mementos from AccountState and,
 * for items already equipped in the current run, highlights them.
 *
 * Equipping/unequipping during a live game is not yet supported by
 * the engine (mementos are applied at game-start via MementoApply).
 * The panel is read-only for in-progress games — the equip UI is
 * intended for the SetupScreen flow (deferred).
 */

import { useMemo } from 'react';
import type { MementoDef } from '@hex/engine';
import { useGame } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';

interface MementoPanelProps {
  readonly onClose: () => void;
}

export function MementoPanel({ onClose }: MementoPanelProps) {
  const { state, account } = useGame();

  // Collect memento definitions from config registry.
  const allMementos = useMemo<ReadonlyArray<MementoDef>>(
    () => (state?.config.mementos ? [...state.config.mementos.values()] : []),
    [state?.config.mementos],
  );

  // Which mementos the player has unlocked across all sessions.
  const unlockedIds = useMemo(() => new Set(account.unlockedMementos), [account.unlockedMementos]);

  // Which mementos are currently equipped in this game run.
  const equippedIds = useMemo<ReadonlySet<string>>(() => {
    if (!state) return new Set();
    const player = state.players.get(state.currentPlayerId);
    return new Set(player?.equippedMementos ?? []);
  }, [state]);

  const unlocked = allMementos.filter(m => unlockedIds.has(m.id));
  const locked   = allMementos.filter(m => !unlockedIds.has(m.id));

  const foundationLevel = account.foundationLevel;

  return (
    <PanelShell
      id="mementos"
      title="Mementos"
      onClose={onClose}
      priority="overlay"
      width="wide"
    >
      {/* Foundation level summary */}
      <div
        style={{
          color: 'var(--panel-muted-color)',
          fontSize: '12px',
          marginBottom: 'var(--panel-padding-md)',
        }}
      >
        Foundation Level {foundationLevel} &middot; {unlocked.length} of {allMementos.length} unlocked
      </div>

      {unlocked.length === 0 && (
        <div
          style={{
            color: 'var(--panel-muted-color)',
            fontSize: '12px',
            textAlign: 'center',
            padding: 'var(--panel-padding-lg) 0',
          }}
        >
          No mementos unlocked yet. Complete challenges to unlock keepsakes from history.
        </div>
      )}

      {unlocked.length > 0 && (
        <>
          <SectionHeader label="Unlocked" />
          <div className="space-y-2">
            {unlocked.map(m => (
              <MementoCard
                key={m.id}
                memento={m}
                unlocked
                equipped={equippedIds.has(m.id)}
              />
            ))}
          </div>
        </>
      )}

      {unlocked.length > 0 && locked.length > 0 && (
        <div
          style={{
            height: 1,
            background: 'var(--panel-border)',
            margin: 'var(--panel-padding-lg) 0',
          }}
        />
      )}

      {locked.length > 0 && (
        <>
          <SectionHeader label="Locked" />
          <div className="space-y-2">
            {locked.map(m => (
              <MementoCard
                key={m.id}
                memento={m}
                unlocked={false}
                equipped={false}
              />
            ))}
          </div>
        </>
      )}
    </PanelShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  readonly label: string;
}

function SectionHeader({ label }: SectionHeaderProps) {
  return (
    <div
      style={{
        color: 'var(--panel-muted-color)',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 'var(--panel-padding-sm)',
      }}
    >
      {label}
    </div>
  );
}

interface MementoCardProps {
  readonly memento: MementoDef;
  readonly unlocked: boolean;
  readonly equipped: boolean;
}

function MementoCard({ memento, unlocked, equipped }: MementoCardProps) {
  return (
    <div
      className="p-3 rounded"
      style={{
        backgroundColor: unlocked
          ? 'color-mix(in srgb, var(--panel-accent-gold) 8%, var(--panel-bg))'
          : 'var(--panel-bg)',
        border: equipped
          ? '1px solid var(--panel-accent-gold)'
          : '1px solid var(--panel-border)',
        opacity: unlocked ? 1 : 0.45,
      }}
    >
      <div className="flex items-start gap-3">
        <span style={{ fontSize: '22px', lineHeight: 1 }}>🗿</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              style={{
                color: 'var(--panel-text-color)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {memento.name}
            </span>
            {equipped && (
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--panel-accent-gold)',
                  border: '1px solid var(--panel-accent-gold)',
                  borderRadius: '2px',
                  padding: '0 4px',
                }}
              >
                Equipped
              </span>
            )}
            {memento.age && (
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--panel-muted-color)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: '2px',
                  padding: '0 4px',
                  textTransform: 'capitalize',
                }}
              >
                {memento.age}
              </span>
            )}
          </div>
          <div
            style={{
              color: 'var(--panel-muted-color)',
              fontSize: '11px',
              marginTop: 2,
            }}
          >
            {memento.description}
          </div>
        </div>
        {unlocked && !equipped && (
          <span
            style={{ color: 'var(--color-gold)', fontSize: '14px', lineHeight: 1 }}
            aria-label="unlocked"
          >
            ✓
          </span>
        )}
      </div>
    </div>
  );
}
