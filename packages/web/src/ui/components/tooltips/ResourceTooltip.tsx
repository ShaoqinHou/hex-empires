// @ts-nocheck
import React from 'react';
import type { ResourceDef } from '@hex/engine';
import { TooltipContent, type TooltipSection } from '../Tooltip';

interface ResourceTooltipProps {
  resource: ResourceDef;
}

/**
 * Tooltip for resources showing type, bonus yields, and strategic value.
 */
export function ResourceTooltip({ resource }: ResourceTooltipProps) {
  const sections: TooltipSection[] = [];

  // Resource type
  const typeLabels: Record<string, { label: string; color: string }> = {
    'luxury': { label: 'Luxury Resource', color: 'var(--color-gold)' },
    'strategic': { label: 'Strategic Resource', color: 'var(--color-production)' },
    'bonus': { label: 'Bonus Resource', color: 'var(--color-food)' },
  };

  const typeInfo = typeLabels[resource.type] || { label: resource.type, color: 'var(--color-text-muted)' };

  sections.push({
    title: 'Type',
    items: [
      {
        label: 'Category',
        value: typeInfo.label,
        color: typeInfo.color,
      },
    ],
  });

  // Yields
  const yieldItems = [];
  if (resource.yieldBonus.food) {
    yieldItems.push({ label: 'Food', value: `+${resource.yieldBonus.food}`, color: 'var(--color-food)' });
  }
  if (resource.yieldBonus.production) {
    yieldItems.push({ label: 'Production', value: `+${resource.yieldBonus.production}`, color: 'var(--color-production)' });
  }
  if (resource.yieldBonus.gold) {
    yieldItems.push({ label: 'Gold', value: `+${resource.yieldBonus.gold}`, color: 'var(--color-gold)' });
  }
  if (resource.yieldBonus.science) {
    yieldItems.push({ label: 'Science', value: `+${resource.yieldBonus.science}`, color: 'var(--color-science)' });
  }
  if (resource.yieldBonus.culture) {
    yieldItems.push({ label: 'Culture', value: `+${resource.yieldBonus.culture}`, color: 'var(--color-culture)' });
  }
  if (resource.yieldBonus.faith) {
    yieldItems.push({ label: 'Faith', value: `+${resource.yieldBonus.faith}`, color: 'var(--color-faith)' });
  }

  if (yieldItems.length > 0) {
    sections.push({
      title: 'Yield Bonus',
      items: yieldItems,
    });
  }

  // Special effects by resource type
  if (resource.type === 'luxury' && resource.happinessBonus > 0) {
    sections.push({
      title: 'Luxury Benefits',
      items: [
        {
          label: 'Happiness',
          value: `+${resource.happinessBonus} per copy`,
          color: 'var(--color-culture)',
        },
        {
          label: 'Amenity',
          value: 'Provides +1 amenity to 4 cities',
          color: 'var(--color-text-muted)',
        },
      ],
    });
  }

  if (resource.type === 'strategic') {
    sections.push({
      title: 'Strategic Value',
      items: [
        {
          label: 'Required for',
          value: 'Advanced military units',
          color: 'var(--color-production)',
        },
        {
          label: 'Usage',
          value: 'Consumed when unit is built',
          color: 'var(--color-text-muted)',
        },
      ],
    });
  }

  // Buildable info
  sections.push({
    title: 'Improvement',
    items: [
      {
        label: 'Required improvement',
        value: resource.improvement || 'None',
      },
      {
        label: 'Builder action',
        value: 'Charges: 1-3 depending on tech',
        color: 'var(--color-text-muted)',
      },
    ],
  });

  return (
    <TooltipContent
      title={resource.name}
      subtitle={`${resource.type} resource`}
      sections={sections}
    />
  );
}
