export interface SyntheticEntity {
  readonly id: number;
  readonly influence: number;
  readonly supply: number;
}

export interface SyntheticChange {
  readonly entityIndex: number;
  readonly influence: number;
  readonly supply: number;
}

export interface SyntheticState {
  readonly tick: number;
  readonly entities: readonly SyntheticEntity[];
}

export interface DenseSyntheticState {
  readonly tick: number;
  readonly influence: Uint32Array;
  readonly supply: Uint32Array;
}

export interface TimelineFixture {
  readonly id: string;
  readonly entityCount: number;
  readonly tickCount: number;
  readonly changesPerTick: number;
  readonly keyframeInterval: number;
  readonly pageSize: number;
  readonly retention: number;
}

export function assertSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

export function assertUint32(value: number, label: string): void {
  assertSafeNonNegativeInteger(value, label);
  if (value > 0xffff_ffff) {
    throw new RangeError(`${label} must fit in uint32`);
  }
}

export function validateChanges(changes: readonly SyntheticChange[], entityCount: number): void {
  let previousIndex = -1;
  for (const change of changes) {
    assertSafeNonNegativeInteger(change.entityIndex, "change.entityIndex");
    if (change.entityIndex >= entityCount) {
      throw new RangeError(`change.entityIndex ${change.entityIndex} is outside entity count ${entityCount}`);
    }
    if (change.entityIndex <= previousIndex) {
      throw new Error("changes must use unique entity indices in ascending order");
    }
    assertUint32(change.influence, "change.influence");
    assertUint32(change.supply, "change.supply");
    previousIndex = change.entityIndex;
  }
}

export function validateRetention(retention: number): void {
  if (!Number.isSafeInteger(retention) || retention < 1) {
    throw new RangeError("retention must be a positive safe integer");
  }
}

export function validateContiguousAppendTick(currentTick: number, requestedTick: number): void {
  // Validate caller input before doing any arithmetic with it or with the retained tick.
  assertSafeNonNegativeInteger(requestedTick, "tick");
  if (currentTick === Number.MAX_SAFE_INTEGER) {
    throw new RangeError("cannot append after Number.MAX_SAFE_INTEGER");
  }
  const expectedTick = currentTick + 1;
  if (requestedTick !== expectedTick) {
    throw new Error(`tick ${requestedTick} is not contiguous after ${currentTick}`);
  }
}

export function cloneDenseState(state: DenseSyntheticState): DenseSyntheticState {
  return {
    tick: state.tick,
    influence: state.influence.slice(),
    supply: state.supply.slice(),
  };
}
