// @ts-nocheck
import React from 'react';
import type { TerrainDef, TerrainFeatureDef } from '@hex/engine';
import type { HexTile } from '@hex/engine';
import { TooltipContent, type TooltipSection } from '../Tooltip';

interface TerrainTooltipProps {
  tile: HexTile;
  terrainDef: TerrainDef;
  featureDef?: TerrainFeatureDef;
  hasRiver?: boolean;
}

/**
 * Tooltip for terrain tiles showing movement cost, defense bonus, and yields.
 */
export function TerrainTooltip({ tile, terrainDef, featureDef, hasRiver = false }: TerrainTooltipProps) {
  const sections: TooltipSection[] = [];

  // Movement and defense
  let totalMovementCost = terrainDef.movementCost;
  let totalDefenseBonus = terrainDef.defenseBonus;

  const movementDefenseItems = [
    { label: 'Terrain', value: `${terrainDef.name}` },
    { label: 'Base Movement', value: `${terrainDef.movementCost} 📍` },
  ];

  if (featureDef) {
    totalMovementCost += featureDef.movementCostModifier;
    totalDefenseBonus += featureDef.defenseBonusModifier;
    movementDefenseItems.push({ label: 'Feature', value: featureDef.name });
  }

  if (hasRiver) {
    movementDefenseItems.push({ label: 'River', value: '+1 💰', color: 'var(--color-gold)' });
  }

  movementDefenseItems.push(
    { label: 'Total Movement', value: `${totalMovementCost} 📍` },
    { label: 'Defense Bonus', value: totalDefenseBonus > 0 ? `+${Math.round(totalDefenseBonus * 100)}%` : 'None', color: totalDefenseBonus > 0 ? 'var(--color-health-high)' : 'var(--color-text-muted)' },
  );

  sections.push({
    title: 'Terrain',
    items: movementDefenseItems,
  });

  // Yields
  const yieldItems = [];
  const baseYields = terrainDef.baseYields || {};
  const featureYields = featureDef?.yields || {};
  const totalYields = {
    food: (baseYields.food || 0) + (featureYields.food || 0),
    production: (baseYields.production || 0) + (featureYields.production || 0),
    gold: (baseYields.gold || 0) + (featureYields.gold || 0) + (hasRiver ? 1 : 0),
  };

  if (totalYields.food > 0) {
    yieldItems.push({ label: 'Food', value: `+${totalYields.food}`, color: 'var(--color-food)' });
  }
  if (totalYields.production > 0) {
    yieldItems.push({ label: 'Production', value: `+${totalYields.production}`, color: 'var(--color-production)' });
  }
  if (totalYields.gold > 0) {
    yieldItems.push({ label: 'Gold', value: `+${totalYields.gold}`, color: 'var(--color-gold)' });
  }

  if (yieldItems.length > 0) {
    sections.push({
      title: 'Yields',
      items: yieldItems,
    });
  }

  // Special properties
  const specialItems = [];
  if (terrainDef.isWater) {
    specialItems.push({ label: 'Water Terrain', value: 'Naval units only' });
  }
  if (featureDef?.isImpassable) {
    specialItems.push({ label: 'Impassable', value: 'Cannot enter', color: 'var(--color-health-low)' });
  }
  if (featureDef?.removableBy) {
    specialItems.push({ label: 'Removable by', value: featureDef.removableBy });
  }
  if (terrainDef.isWater && featureDef?.defenseBonusModifier > 0) {
    specialItems.push({ label: 'Reef', value: '+25% naval combat', color: 'var(--color-science)' });
  }

  if (specialItems.length > 0) {
    sections.push({
      title: 'Properties',
      items: specialItems,
    });
  }

  // Buildable info
  const buildableItems = [];
  if (terrainDef.isWater) {
    buildableItems.push({ label: 'Water', value: 'Improvements: Fishing Boats, Oil Platforms' });
  } else {
    buildableItems.push({ label: 'Land', value: 'Improvements: Farm, Mine, Quarry, Camp, Plantation' });
    if (!featureDef || !featureDef.isImpassable) {
      buildableItems.push({ label: 'Settlers', value: 'Can found cities' });
    }
  }

  sections.push({
    title: 'Settlement',
    items: buildableItems,
  });

  return (
    <TooltipContent
      title={terrainDef.name + (featureDef ? ` with ${featureDef.name}` : '')}
      sections={sections}
    />
  );
}
