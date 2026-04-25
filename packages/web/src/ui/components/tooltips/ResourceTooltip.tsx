import React from 'react';
import type { ResourceDef } from '@hex/engine';
import { TooltipContent, type TooltipSection } from '../Tooltip';

interface ResourceTooltipProps {
  resource: ResourceDef;
}

/**
 * Tooltip for resources showing type, bonus yields, and Civ VII value.
 * Civ VII taxonomy: bonus | city | empire | treasureFleet | factory
 */
export function ResourceTooltip({ resource }: ResourceTooltipProps) {
  const sections: TooltipSection[] = [];

  // Resource type — Civ VII vocabulary
  const typeLabels: Record<string, { label: string; color: string }> = {
    'city':         { label: 'City Resource',         color: 'var(--color-gold)' },
    'empire':       { label: 'Empire Resource',       color: 'var(--color-production)' },
    'bonus':        { label: 'Bonus Resource',        color: 'var(--color-food)' },
    'treasureFleet':{ label: 'Treasure Fleet Resource', color: 'var(--color-gold)' },
    'factory':      { label: 'Factory Resource',      color: 'var(--color-production)' },
  };

  const typeInfo = typeLabels[resource.type] ?? { label: resource.type, color: 'var(--color-text-muted)' };

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
  const yieldItems: { label: string; value: string; color?: string }[] = [];
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

  // Special effects by Civ VII resource type
  if (resource.type === 'city' && resource.happinessBonus > 0) {
    sections.push({
      title: 'City Benefits',
      items: [
        {
          label: 'Happiness',
          value: `+${resource.happinessBonus} per assignment`,
          color: 'var(--color-culture)',
        },
      ],
    });
  }

  if (resource.type === 'empire') {
    sections.push({
      title: 'Empire Bonus',
      items: [
        {
          label: 'Effect',
          value: 'Empire-wide bonus once owned',
          color: 'var(--color-production)',
        },
        {
          label: 'Note',
          value: 'No hard production gate (Civ VII design)',
          color: 'var(--color-text-muted)',
        },
      ],
    });
  }

  if (resource.type === 'treasureFleet') {
    sections.push({
      title: 'Treasure Fleet',
      items: [
        {
          label: 'Age',
          value: 'Exploration Age',
          color: 'var(--color-gold)',
        },
        {
          label: 'Effect',
          value: 'Triggers Treasure Fleet gold generation',
          color: 'var(--color-text-muted)',
        },
      ],
    });
  }

  if (resource.type === 'factory') {
    sections.push({
      title: 'Factory Slot',
      items: [
        {
          label: 'Age',
          value: 'Modern Age',
          color: 'var(--color-production)',
        },
        {
          label: 'Effect',
          value: 'Powers Factory Town specialization',
          color: 'var(--color-text-muted)',
        },
      ],
    });
  }

  return (
    <TooltipContent
      title={resource.name}
      subtitle={`${resource.type} resource`}
      sections={sections}
    />
  );
}
