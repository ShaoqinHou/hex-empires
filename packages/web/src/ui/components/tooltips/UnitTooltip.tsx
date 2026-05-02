// @ts-nocheck
import React from 'react';
import type { UnitDef, UnitState, PromotionDef } from '@hex/engine';
import { TooltipContent, type TooltipSection } from '../Tooltip';

interface UnitTooltipProps {
  unitDef: UnitDef;
  unitState?: UnitState;
  showState?: boolean;
  /** Unit promotions registry from state.config.promotions (preferred over ALL_PROMOTIONS global). */
  promotions?: ReadonlyMap<string, PromotionDef>;
}

/**
 * Tooltip for unit definitions showing stats, abilities, and upgrade path.
 */
export function UnitTooltip({ unitDef, unitState, showState = false, promotions }: UnitTooltipProps) {
  const sections: TooltipSection[] = [];

  // Combat Stats section
  const combatItems = [
    { label: 'Combat Strength', value: unitDef.combat },
  ];

  if (unitDef.rangedCombat > 0) {
    combatItems.push({ label: 'Ranged Strength', value: unitDef.rangedCombat });
    combatItems.push({ label: 'Range', value: unitDef.range });
  }

  combatItems.push(
    { label: 'Movement', value: unitDef.movement },
    { label: 'Sight', value: unitDef.sightRange },
    { label: 'Cost', value: `${unitDef.cost} 📦` }
  );

  sections.push({
    title: 'Combat Stats',
    items: combatItems,
  });

  // State info (if provided)
  if (showState && unitState) {
    sections.push({
      title: 'Current Status',
      items: [
        { label: 'Health', value: `${unitState.health}/100`, color: unitState.health > 50 ? 'var(--color-health-high)' : 'var(--color-health-low)' },
        { label: 'Movement Left', value: unitState.movementLeft, color: unitState.movementLeft > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' },
        { label: 'Experience', value: unitState.experience },
        ...(unitState.promotions.length > 0 ? [{ label: 'Promotions', value: unitState.promotions.join(', ') }] as const : []),
        ...(unitState.fortified ? [{ label: 'Status', value: 'Fortified', color: 'var(--color-science)' }] as const : []),
      ],
    });
  }

  // Abilities section
  if (unitDef.abilities.length > 0) {
    const abilityDescriptions: Record<string, string> = {
      'ignore_terrain_cost': 'Ignores terrain movement penalties',
      'anti_cavalry': '+50% vs cavalry units',
      'found_city': 'Can found a new city',
      'build': 'Can construct improvements',
      'trade': 'Can establish trade routes',
      'religious': 'Can spread religion',
      'support': 'Can heal adjacent units',
      'charge': '+10 strength vs wounded units',
      'flank': '+5 strength on direct rear battlefront attacks',
      'volley': 'Ranged attacks deal full damage at all ranges',
      'tortoise': '+10 defense when adjacent to enemy',
      'blitz': 'Can attack multiple times per turn',
    };

    sections.push({
      title: 'Abilities',
      items: unitDef.abilities.map(ability => ({
        label: ability,
        value: abilityDescriptions[ability] || '',
      })),
    });
  }

  // Promotions (if unit has XP) — sourced from state.config.promotions via the
  // `promotions` prop; falls back to empty array if not provided (no ALL_X import).
  if (unitState && unitState.experience > 0) {
    const promotionList: ReadonlyArray<PromotionDef> = promotions
      ? [...promotions.values()]
      : [];
    const availablePromotions = promotionList.filter(p => {
      const unitXP = unitState.experience;
      const threshold = [10, 30, 50].find(t => unitXP < t) ?? 50;
      return unitXP >= threshold;
    });

    if (availablePromotions.length > 0) {
      sections.push({
        title: 'Available Promotions',
        items: availablePromotions.slice(0, 3).map(p => ({
          label: p.name,
          value: p.description,
        })),
      });
    }
  }

  // Upgrade info
  let subtitle = `${unitDef.age} ${unitDef.category}`;
  if (unitDef.requiredTech) {
    subtitle += ` • Requires ${unitDef.requiredTech.replace(/_/g, ' ')}`;
  }
  if (unitDef.upgradesTo) {
    sections.push({
      title: 'Upgrade Path',
      items: [{ label: 'Upgrades to', value: unitDef.upgradesTo }],
    });
  }

  if (unitDef.requiredResource) {
    sections.push({
      title: 'Requirements',
      items: [{ label: 'Resource', value: unitDef.requiredResource }],
    });
  }

  return (
    <TooltipContent
      title={unitDef.name}
      subtitle={subtitle}
      sections={sections}
    />
  );
}

interface UnitStateTooltipProps {
  unitState: UnitState;
  unitDef: UnitDef;
  promotions?: ReadonlyMap<string, PromotionDef>;
}

/**
 * Tooltip for active unit state on the map.
 */
export function UnitStateTooltip({ unitState, unitDef, promotions }: UnitStateTooltipProps) {
  return <UnitTooltip unitDef={unitDef} unitState={unitState} showState promotions={promotions} />;
}
