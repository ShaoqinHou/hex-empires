import { describe, it, expect } from 'vitest';
import {
  ALL_ANTIQUITY_TECHS,
  FUTURE_TECH_ANTIQUITY,
} from '../technologies/antiquity/index';
import {
  ALL_EXPLORATION_TECHS,
  FUTURE_TECH_EXPLORATION,
} from '../technologies/exploration/index';
import {
  ALL_MODERN_TECHS,
  FUTURE_TECH_MODERN,
} from '../technologies/modern/index';

/**
 * F-13: Future Tech must require ALL non-future techs of its age.
 * Civ VII rule: repeatable Future Tech is only accessible once the player
 * has researched every other technology in the current age.
 */
describe('Future Tech prerequisites (tech-tree F-13)', () => {
  function getNonFutureTechIds(techs: ReadonlyArray<{ id: string; isFutureTech?: boolean }>): string[] {
    return techs.filter(t => !t.isFutureTech).map(t => t.id);
  }

  describe('Antiquity Future Tech', () => {
    const nonFutureTechIds = getNonFutureTechIds(ALL_ANTIQUITY_TECHS);

    it('has prerequisites equal to all non-future antiquity techs', () => {
      const prereqs = [...FUTURE_TECH_ANTIQUITY.prerequisites].sort();
      expect(prereqs).toEqual([...nonFutureTechIds].sort());
    });

    it('does not include itself in prerequisites', () => {
      expect(FUTURE_TECH_ANTIQUITY.prerequisites).not.toContain('future_tech_antiquity');
    });

    it('covers all 18 non-future antiquity techs', () => {
      expect(FUTURE_TECH_ANTIQUITY.prerequisites).toHaveLength(18);
    });

    it('includes all expected individual antiquity tech IDs', () => {
      const prereqs = FUTURE_TECH_ANTIQUITY.prerequisites;
      expect(prereqs).toContain('pottery');
      expect(prereqs).toContain('mathematics');
      expect(prereqs).toContain('iron_working');
      expect(prereqs).toContain('navigation');
      expect(prereqs).toContain('military_training');
    });
  });

  describe('Exploration Future Tech', () => {
    const nonFutureTechIds = getNonFutureTechIds(ALL_EXPLORATION_TECHS);

    it('has prerequisites equal to all non-future exploration techs', () => {
      const prereqs = [...FUTURE_TECH_EXPLORATION.prerequisites].sort();
      expect(prereqs).toEqual([...nonFutureTechIds].sort());
    });

    it('does not include itself in prerequisites', () => {
      expect(FUTURE_TECH_EXPLORATION.prerequisites).not.toContain('future_tech_exploration');
    });

    it('covers all 18 non-future exploration techs', () => {
      expect(FUTURE_TECH_EXPLORATION.prerequisites).toHaveLength(18);
    });

    it('includes all expected individual exploration tech IDs', () => {
      const prereqs = FUTURE_TECH_EXPLORATION.prerequisites;
      expect(prereqs).toContain('printing');
      expect(prereqs).toContain('economics');
      expect(prereqs).toContain('military_science');
      expect(prereqs).toContain('metal_casting');
      expect(prereqs).toContain('feudalism');
    });
  });

  describe('Modern Future Tech', () => {
    const nonFutureTechIds = getNonFutureTechIds(ALL_MODERN_TECHS);

    it('has prerequisites equal to all non-future modern techs', () => {
      const prereqs = [...FUTURE_TECH_MODERN.prerequisites].sort();
      expect(prereqs).toEqual([...nonFutureTechIds].sort());
    });

    it('does not include itself in prerequisites', () => {
      expect(FUTURE_TECH_MODERN.prerequisites).not.toContain('future_tech_modern');
    });

    it('covers all 23 non-future modern techs', () => {
      expect(FUTURE_TECH_MODERN.prerequisites).toHaveLength(23);
    });

    it('includes all expected individual modern tech IDs', () => {
      const prereqs = FUTURE_TECH_MODERN.prerequisites;
      expect(prereqs).toContain('scientific_theory');
      expect(prereqs).toContain('rocketry');
      expect(prereqs).toContain('nuclear_fission');
      expect(prereqs).toContain('aerodynamics');
      expect(prereqs).toContain('military_science_modern');
    });
  });

  describe('cross-age invariant', () => {
    it('all three future techs have isFutureTech: true', () => {
      expect(FUTURE_TECH_ANTIQUITY.isFutureTech).toBe(true);
      expect(FUTURE_TECH_EXPLORATION.isFutureTech).toBe(true);
      expect(FUTURE_TECH_MODERN.isFutureTech).toBe(true);
    });

    it('no age has more than one future tech', () => {
      const antiquityFuture = ALL_ANTIQUITY_TECHS.filter(t => t.isFutureTech);
      const explorationFuture = ALL_EXPLORATION_TECHS.filter(t => t.isFutureTech);
      const modernFuture = ALL_MODERN_TECHS.filter(t => t.isFutureTech);

      expect(antiquityFuture).toHaveLength(1);
      expect(explorationFuture).toHaveLength(1);
      expect(modernFuture).toHaveLength(1);
    });
  });
});
