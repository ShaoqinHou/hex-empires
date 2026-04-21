/**
 * Relic types — F-09 Relic subsystem scaffold.
 *
 * Relics are collectible items that provide faith and culture yields when
 * displayed in a city's Reliquary buildings. They contribute to the
 * Cultural Legacy Path and cultural victory progress.
 *
 * Relics are acquired through exploration, religious gameplay, and events.
 * Each relic has a unique id and fixed per-turn yields.
 */

// ── Branded ID ──

/**
 * Identifier for a `RelicDef` entry.
 */
export type RelicId = string;

// ── Definition type (content) ──

/**
 * A Relic definition. Pure data — no game logic.
 *
 * - `id`           — unique relic identifier
 * - `name`         — display name
 * - `description`  — flavour text
 * - `faithPerTurn`  — faith yield contributed when displayed in a city
 * - `culturePerTurn` — culture yield contributed when displayed in a city
 */
export interface RelicDef {
  readonly id: RelicId;
  readonly name: string;
  readonly description: string;
  readonly faithPerTurn: number;
  readonly culturePerTurn: number;
}
