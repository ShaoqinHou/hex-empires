export interface AIPersonality {
  readonly aggressiveness: number;   // 0-1: how likely to seek combat
  readonly expansionism: number;     // 0-1: how eagerly to found new cities
  readonly scienceFocus: number;     // 0-1: how much to prioritise science buildings/techs
  readonly militaryRatio: number;    // target military units per city
  readonly scoutFrequency: number;   // 0-1: how often to send units exploring
  readonly riskTolerance: number;    // 0-1: willingness to attack stronger enemies
}

/** Map a leader ID to their personality weights. */
export function getLeaderPersonality(leaderId: string): AIPersonality {
  switch (leaderId) {
    case 'augustus':
      return { aggressiveness: 0.3, expansionism: 0.7, scienceFocus: 0.5, militaryRatio: 2,   scoutFrequency: 0.5, riskTolerance: 0.3  };
    case 'cleopatra':
      return { aggressiveness: 0.2, expansionism: 0.5, scienceFocus: 0.4, militaryRatio: 1.5, scoutFrequency: 0.3, riskTolerance: 0.2  };
    case 'pericles':
      return { aggressiveness: 0.2, expansionism: 0.4, scienceFocus: 0.8, militaryRatio: 1,   scoutFrequency: 0.4, riskTolerance: 0.2  };
    case 'cyrus':
      return { aggressiveness: 0.8, expansionism: 0.5, scienceFocus: 0.3, militaryRatio: 3,   scoutFrequency: 0.7, riskTolerance: 0.8  };
    case 'gandhi':
      return { aggressiveness: 0.1, expansionism: 0.6, scienceFocus: 0.6, militaryRatio: 1,   scoutFrequency: 0.3, riskTolerance: 0.1  };
    case 'qin_shi_huang':
      return { aggressiveness: 0.4, expansionism: 0.9, scienceFocus: 0.5, militaryRatio: 2,   scoutFrequency: 0.5, riskTolerance: 0.4  };
    case 'alexander':
      return { aggressiveness: 0.9, expansionism: 0.3, scienceFocus: 0.3, militaryRatio: 4,   scoutFrequency: 0.8, riskTolerance: 0.9  };
    case 'hatshepsut':
      return { aggressiveness: 0.2, expansionism: 0.5, scienceFocus: 0.6, militaryRatio: 1.5, scoutFrequency: 0.4, riskTolerance: 0.3  };
    case 'genghis_khan':
      return { aggressiveness: 0.95, expansionism: 0.3, scienceFocus: 0.2, militaryRatio: 5,  scoutFrequency: 0.9, riskTolerance: 0.95 };
    default:
      return { aggressiveness: 0.5, expansionism: 0.5, scienceFocus: 0.5, militaryRatio: 2,   scoutFrequency: 0.5, riskTolerance: 0.5  };
  }
}
