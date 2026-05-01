# AI Architecture Overhaul — Design Doc

## Current Problems
1. **No personality** — all AI players use identical logic
2. **No fog of war respect** — AI can see all units/cities (cheating)
3. **No threat assessment** — AI doesn't react to player military buildup
4. **No strategic planning** — pure priority list, no multi-turn goals
5. **No scouting** — doesn't use scouts to gather intelligence
6. **Uses Math.random()** — non-deterministic, can't replay games
7. **Monolithic** — 749 lines in one function, hard to extend

## New Architecture: Layered Decision System

### Layer 1: World Model (what the AI knows)
```typescript
interface AIWorldModel {
  readonly knownUnits: ReadonlyMap<UnitId, KnownUnit>;      // units AI has seen
  readonly knownCities: ReadonlyMap<CityId, KnownCity>;     // cities AI has seen
  readonly lastSeen: ReadonlyMap<string, number>;            // hex key → turn last visible
  readonly threatLevel: ReadonlyMap<string, number>;         // per-player threat score
  readonly exploredTiles: ReadonlySet<string>;               // tiles the AI has explored
}
```
- AI only knows about things within its visibility range
- Information decays — units seen 5 turns ago may have moved
- Fog of war is REAL — AI doesn't cheat

### Layer 2: Strategic Assessment
```typescript
interface StrategicState {
  readonly phase: 'expand' | 'develop' | 'military' | 'defend';
  readonly threats: ReadonlyArray<ThreatInfo>;
  readonly opportunities: ReadonlyArray<OpportunityInfo>;
  readonly militaryStrength: number;        // our total combat power
  readonly estimatedEnemyStrength: number;  // best guess of enemy power
  readonly economicScore: number;           // gold + production capacity
}
```
- Evaluates game state to determine strategic phase
- Early game: expand (settlers + cities)
- Mid game: develop (buildings + tech)
- Threat detected: military buildup
- Under attack: defend

### Layer 3: Personality (leader traits)
```typescript
interface AIPersonality {
  readonly aggressiveness: number;     // 0-1, how eager to attack
  readonly expansionism: number;       // 0-1, how many cities to aim for
  readonly scienceFocus: number;       // 0-1, priority on research
  readonly militaryRatio: number;      // target military/city ratio
  readonly scoutFrequency: number;     // how often to send scouts
  readonly riskTolerance: number;      // 0-1, willingness to take risks
}
```
- Each leader gets different personality weights
- Augustus: defensive (0.3 aggression, 0.7 expansion)
- Genghis Khan: aggressive (0.9 aggression, 0.4 expansion)
- Pericles: scientific (0.2 aggression, 0.8 science)

### Layer 4: Action Generation
Priority system with personality-weighted scoring:
1. **Emergency**: under attack → defend cities, produce military
2. **Scouting**: send scouts to explore, gather intelligence
3. **Research**: pick tech based on strategic needs + personality
4. **Production**: build based on strategic phase + personality
5. **Expansion**: found new cities when safe
6. **Military ops**: attack when advantageous
7. **Diplomacy**: react to other players based on personality

### Key Design Decisions
- AI stores its world model in PlayerState (persists across turns)
- Visibility system already tracks `player.visibility` and `player.explored`
- AI should use `player.visibility` to check what it can currently see
- Seeded RNG for all randomness (use state.rng)
- Pure function: `(state) → GameAction[]` (no side effects)

## Implementation Plan
1. Create `AIPersonality` type and assign to each leader
2. Add `aiWorldModel` field to PlayerState (or compute from visibility)
3. Refactor aiSystem into modular functions
4. Add threat assessment (count visible enemy units, estimate strength)
5. Add scouting behavior (send scouts toward unexplored areas)
6. Wire personality weights to all decisions
7. Test with AI-vs-AI matches and logging

## Testing Strategy
- AI-vs-AI automated matches with turn-by-turn logging
- Each AI gets a different personality
- Log: actions taken, strategic assessments, threat levels
- Compare strategies: rush vs eco vs balanced
- Verify: AI doesn't cheat (only acts on visible information)
