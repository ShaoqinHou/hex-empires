import React from 'react';
import type { TechnologyDef } from '@hex/engine';
import { TooltipContent, TooltipSection } from './Tooltip';

interface TechnologyTooltipProps {
  tech: TechnologyDef;
  isResearched?: boolean;
  isAvailable?: boolean;
  currentProgress?: number;
}

/**
 * Tooltip for technologies showing prerequisites, unlocks, and cost.
 */
export function TechnologyTooltip({ tech, isResearched = false, isAvailable = true, currentProgress }: TechnologyTooltipProps) {
  const sections: TooltipSection[] = [];

  // Cost and progress
  const costItems = [
    { label: 'Cost', value: `${tech.cost} 🔬` },
  ];

  if (currentProgress !== undefined) {
    costItems.push({ label: 'Progress', value: `${currentProgress}/${tech.cost}` });
  }

  sections.push({
    title: 'Research',
    items: costItems,
  });

  // Prerequisites
  if (tech.prerequisites && tech.prerequisites.length > 0) {
    sections.push({
      title: 'Prerequisites',
      items: tech.prerequisites.map(prereq => ({
        label: prereq,
        value: 'Required',
        color: 'var(--color-science)',
      })),
    });
  }

  // Unlocks
  if (tech.unlocks && tech.unlocks.length > 0) {
    const unlockItems = tech.unlocks.map(unlock => {
      const [type, id] = unlock.split(':');
      const typeLabels: Record<string, string> = {
        'unit': '🎖️',
        'building': '🏛️',
        'district': '🏘️',
        'resource': '💎',
        'improvement': '🔧',
        'wonder': '✨',
      };

      return {
        label: id.replace(/_/g, ' '),
        value: typeLabels[type] || type,
      };
    });

    sections.push({
      title: 'Unlocks',
      items: unlockItems,
    });
  }

  // Effects
  if (tech.effects && tech.effects.length > 0) {
    sections.push({
      title: 'Effects',
      items: tech.effects.map(effect => ({
        label: effect,
        value: '',
      })),
    });
  }

  // Status
  let subtitle = `${tech.age} age • eureka on turn ${tech.eurekaTurn}`;
  if (isResearched) {
    subtitle += ' • Completed';
  } else if (!isAvailable) {
    subtitle += ' • Locked';
  }

  return (
    <TooltipContent
      title={tech.name}
      subtitle={subtitle}
      sections={sections}
    />
  );
}
