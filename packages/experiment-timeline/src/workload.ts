import type { DenseSyntheticState, SyntheticChange, SyntheticEntity, SyntheticState, TimelineFixture } from "./contracts.js";
import { assertSafeNonNegativeInteger, validateContiguousAppendTick } from "./contracts.js";

export const timelineFixtures: readonly TimelineFixture[] = [
  { id: "n32-sparse-k2", entityCount: 32, tickCount: 12, changesPerTick: 2, keyframeInterval: 2, pageSize: 8, retention: 13 },
  { id: "n32-sparse-k8", entityCount: 32, tickCount: 12, changesPerTick: 2, keyframeInterval: 8, pageSize: 8, retention: 13 },
  { id: "n32-dense-k8", entityCount: 32, tickCount: 12, changesPerTick: 32, keyframeInterval: 8, pageSize: 8, retention: 13 },
  { id: "n128-sparse-k4", entityCount: 128, tickCount: 16, changesPerTick: 4, keyframeInterval: 4, pageSize: 16, retention: 17 },
  { id: "n128-mid-k8", entityCount: 128, tickCount: 16, changesPerTick: 32, keyframeInterval: 8, pageSize: 16, retention: 17 },
  { id: "n128-dense-k8", entityCount: 128, tickCount: 16, changesPerTick: 128, keyframeInterval: 8, pageSize: 16, retention: 17 },
] as const;

export function createInitialObjectState(entityCount: number, tick = 0): SyntheticState {
  assertSafeNonNegativeInteger(entityCount, "entityCount");
  assertSafeNonNegativeInteger(tick, "tick");
  const entities: SyntheticEntity[] = [];
  for (let id = 0; id < entityCount; id += 1) {
    entities.push({ id, influence: initialInfluence(id), supply: initialSupply(id) });
  }
  return { tick, entities };
}

export function createInitialDenseState(entityCount: number, tick = 0): DenseSyntheticState {
  const objectState = createInitialObjectState(entityCount, tick);
  return objectToDense(objectState);
}

export function changesForTick(fixture: TimelineFixture, tick: number): readonly SyntheticChange[] {
  validateFixture(fixture);
  if (!Number.isSafeInteger(tick) || tick < 1 || tick > fixture.tickCount) {
    throw new RangeError(`tick must be between 1 and ${fixture.tickCount}`);
  }
  const selected: number[] = [];
  const rotation = multiplyModulo(tick % fixture.entityCount, 17, fixture.entityCount);
  for (let index = 0; index < fixture.entityCount; index += 1) {
    // A rotated contiguous permutation stays unique for every entity count; sorting
    // gives the timeline a canonical input order without a density-dependent search.
    const candidate = addModulo(rotation, index, fixture.entityCount);
    selected.push(candidate);
    if (selected.length === fixture.changesPerTick) break;
  }
  selected.sort((left, right) => left - right);
  return selected.map((entityIndex) => ({
    entityIndex,
    influence: deterministicValue(tick, entityIndex, 0x9e37),
    supply: deterministicValue(tick, entityIndex, 0x85eb),
  }));
}

export function applyOracleChanges(state: SyntheticState, tick: number, changes: readonly SyntheticChange[]): SyntheticState {
  validateContiguousAppendTick(state.tick, tick);
  const byIndex = new Map(changes.map((change) => [change.entityIndex, change]));
  return {
    tick,
    entities: state.entities.map((entity, index) => {
      const change = byIndex.get(index);
      return change === undefined ? { ...entity } : { id: entity.id, influence: change.influence, supply: change.supply };
    }),
  };
}

export function objectToDense(state: SyntheticState): DenseSyntheticState {
  const influence = new Uint32Array(state.entities.length);
  const supply = new Uint32Array(state.entities.length);
  for (let index = 0; index < state.entities.length; index += 1) {
    const entity = state.entities[index];
    if (entity === undefined || entity.id !== index) throw new Error("object state IDs must equal their canonical array indices");
    influence[index] = entity.influence;
    supply[index] = entity.supply;
  }
  return { tick: state.tick, influence, supply };
}

export function denseToObject(state: DenseSyntheticState): SyntheticState {
  if (state.influence.length !== state.supply.length) throw new Error("dense fields must have equal lengths");
  const entities: SyntheticEntity[] = [];
  for (let id = 0; id < state.influence.length; id += 1) {
    entities.push({ id, influence: state.influence[id] ?? 0, supply: state.supply[id] ?? 0 });
  }
  return { tick: state.tick, entities };
}

export function validateFixture(fixture: TimelineFixture): void {
  for (const [label, value] of [
    ["entityCount", fixture.entityCount], ["tickCount", fixture.tickCount], ["changesPerTick", fixture.changesPerTick],
    ["keyframeInterval", fixture.keyframeInterval], ["pageSize", fixture.pageSize], ["retention", fixture.retention],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${label} must be a positive safe integer`);
  }
  if (fixture.changesPerTick > fixture.entityCount) throw new RangeError("changesPerTick cannot exceed entityCount");
}

function initialInfluence(id: number): number {
  return Math.imul(id + 1, 2_654_435_761) >>> 0;
}

function initialSupply(id: number): number {
  return Math.imul(id + 3, 2_246_822_519) >>> 0;
}

function deterministicValue(tick: number, entityIndex: number, salt: number): number {
  const tickUint32 = ((tick % 0x1_0000_0000) + salt) >>> 0;
  return (Math.imul(tickUint32, 1_664_525) + Math.imul(entityIndex + 1, 1_013_904_223)) >>> 0;
}

function addModulo(left: number, right: number, modulus: number): number {
  // Inputs are in [0, modulus), so this subtraction form never evaluates an unsafe sum.
  return left >= modulus - right ? left - (modulus - right) : left + right;
}

function multiplyModulo(value: number, multiplier: number, modulus: number): number {
  let result = 0;
  for (let count = 0; count < multiplier; count += 1) result = addModulo(result, value, modulus);
  return result;
}
