// @ts-nocheck
import React from 'react';
import type { BuildingDef } from '@hex/engine';
import { TooltipContent, type TooltipSection } from '../Tooltip';

interface BuildingTooltipProps {
  building: BuildingDef;
  isBuilt?: boolean;
  canBuild?: boolean;
}

/**
 * Tooltip for buildings showing yields, maintenance, effects, and prerequisites.
 */
export function BuildingTooltip({ building, isBuilt = false, canBuild = true }: BuildingTooltipProps) {
  const sections: TooltipSection[] = [];

  // Yields section
  const yieldItems = [
    ...(building.yields.food ? [{ label: 'Food', value: `+${building.yields.food}`, color: 'var(--color-food)' }] as const : []),
    ...(building.yields.production ? [{ label: 'Production', value: `+${building.yields.production}`, color: 'var(--color-production)' }] as const : []),
    ...(building.yields.gold ? [{ label: 'Gold', value: `+${building.yields.gold}`, color: 'var(--color-gold)' }] as const : []),
    ...(building.yields.science ? [{ label: 'Science', value: `+${building.yields.science}`, color: 'var(--color-science)' }] as const : []),
    ...(building.yields.culture ? [{ label: 'Culture', value: `+${building.yields.culture}`, color: 'var(--color-culture)' }] as const : []),
    ...(building.yields.faith ? [{ label: 'Faith', value: `+${building.yields.faith}`, color: 'var(--color-faith)' }] as const : []),
  ];

  if (yieldItems.length > 0) {
    sections.push({
      title: 'Yields',
      items: yieldItems,
    });
  }

  // Stats section
  const statsItems = [
    { label: 'Cost', value: `${building.cost} 📦` },
    { label: 'Maintenance', value: `-${building.maintenance} 💰/turn`, color: 'var(--color-gold)' },
  ];

  if (building.defenseBonus > 0) {
    statsItems.push({ label: 'Defense Bonus', value: `+${building.defenseBonus} HP`, color: 'var(--color-health-high)' });
  }

  sections.push({
    title: 'Stats',
    items: statsItems,
  });

  // Effects section
  if (building.effects && building.effects.length > 0) {
    const effectDescriptions: Record<string, string> = {
      'increased_population_growth': '+25% growth rate',
      'increased_production': '+10% production',
      'increased_gold': '+25% gold',
      'increased_science': '+25% science',
      'increased_culture': '+25% culture',
      'increased_faith': '+25% faith',
      'increased_happiness': '+2 happiness per population',
      'reduced_maintenance': '-50% building maintenance',
      'enables_specialists': 'Allows specialist assignment',
      'great_person_points': '+1 Great Person point per turn',
      'trade_route_bonus': '+1 trade route capacity',
      'wall_defense': '+100 city defense HP',
      'increased_exp_yield': '+25% experience from combat',
      'free_great_person': 'Provides a free Great Person',
    };

    sections.push({
      title: 'Effects',
      items: building.effects.map(effect => ({
        label: effect,
        value: effectDescriptions[effect] || '',
      })),
    });
  }

  // Requirements section
  const requirementsItems = [];
  if (building.requiredTech) {
    requirementsItems.push({ label: 'Technology', value: building.requiredTech.replace(/_/g, ' ') });
  }
  if (building.happinessCost > 0) {
    requirementsItems.push({ label: 'Happiness Cost', value: `-${building.happinessCost}`, color: 'var(--color-health-low)' });
  }

  if (requirementsItems.length > 0) {
    sections.push({
      title: 'Requirements',
      items: requirementsItems,
    });
  }

  // Status indicator
  let subtitle = `${building.age} age`;
  if (!canBuild) {
    subtitle += ' • Not available';
  } else if (isBuilt) {
    subtitle += ' • Built';
  }

  return (
    <TooltipContent
      title={building.name}
      subtitle={subtitle}
      sections={sections}
    />
  );
}
