/**
 * AchievementsPanel — player milestone tracker.
 *
 * Shows which achievements the active player has unlocked and which
 * are still locked. Data flows from `getAchievementsForPlayer` on the
 * engine side; this component is a read-only view.
 */

import { useMemo } from 'react';
import type { AchievementDef } from '@hex/engine';
import { useGameState } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';

interface AchievementsPanelProps {
  readonly onClose: () => void;
}

export function AchievementsPanel({ onClose }: AchievementsPanelProps) {
  const { state } = useGameState();

  const unlocked = useMemo<ReadonlySet<string>>(() => {
    const list = state.unlockedAchievements?.get(state.currentPlayerId) ?? [];
    return new Set(list);
  }, [state]);

  const allAchievements = useMemo(() => [...state.config.achievements.values()], [state.config.achievements]);
  const earned = allAchievements.filter(a => unlocked.has(a.id));
  const locked = allAchievements.filter(a => !unlocked.has(a.id));

  return (
    <PanelShell
      id="achievements"
      title="Achievements"
      onClose={onClose}
      priority="overlay"
      width="wide"
    >
      <div
        style={{
          color: 'var(--panel-muted-color)',
          fontSize: '12px',
          marginBottom: 'var(--panel-padding-md)',
        }}
      >
        {earned.length} of {allAchievements.length} unlocked
      </div>

      {earned.length > 0 && (
        <>
          <SectionHeader label="Earned" />
          <div className="space-y-2">
            {earned.map(a => (
              <AchievementCard key={a.id} achievement={a} earned />
            ))}
          </div>
        </>
      )}

      {earned.length > 0 && locked.length > 0 && (
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
            {locked.map(a => (
              <AchievementCard key={a.id} achievement={a} earned={false} />
            ))}
          </div>
        </>
      )}
    </PanelShell>
  );
}

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

interface AchievementCardProps {
  readonly achievement: AchievementDef;
  readonly earned: boolean;
}

function AchievementCard({ achievement, earned }: AchievementCardProps) {
  return (
    <div
      className="p-3 rounded"
      style={{
        backgroundColor: earned
          ? 'var(--panel-card-earned-bg)'
          : 'var(--panel-card-locked-bg)',
        border: earned
          ? '1px solid var(--panel-border)'
          : '1px solid var(--panel-border)',
        opacity: earned ? 1 : 0.55,
      }}
    >
      <div className="flex items-start gap-3">
        <span style={{ fontSize: '20px', lineHeight: 1 }}>{achievement.icon}</span>
        <div className="flex-1 min-w-0">
          <div
            style={{
              color: 'var(--panel-text-color)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {achievement.name}
          </div>
          <div
            style={{
              color: 'var(--panel-muted-color)',
              fontSize: '11px',
              marginTop: 2,
            }}
          >
            {achievement.description}
          </div>
        </div>
        {earned && (
          <span
            style={{
              color: 'var(--color-gold)',
              fontSize: '14px',
              lineHeight: 1,
            }}
            aria-label="unlocked"
          >
            ✓
          </span>
        )}
      </div>
    </div>
  );
}
