import type { DenseSyntheticState, SyntheticChange } from "./contracts.js";
import {
  assertSafeNonNegativeInteger,
  cloneDenseState,
  validateChanges,
  validateContiguousAppendTick,
  validateRetention,
} from "./contracts.js";

interface DenseKeyframe {
  readonly kind: "keyframe";
  readonly tick: number;
  readonly influence: Uint32Array;
  readonly supply: Uint32Array;
}

interface DenseDirtyPage {
  readonly pageIndex: number;
  readonly elementCount: number;
  readonly influence: Uint32Array;
  readonly supply: Uint32Array;
}

interface DenseDelta {
  readonly kind: "delta";
  readonly tick: number;
  readonly pages: readonly DenseDirtyPage[];
}

type DenseRecord = DenseKeyframe | DenseDelta;

export interface DenseTimelineAccounting {
  readonly measuredAs: "logical-dense-pages-v1";
  readonly payloadBytes: number;
  readonly metadataBytes: number;
  readonly totalBytes: number;
  readonly retainedVersions: number;
  readonly keyframeCount: number;
  readonly deltaCount: number;
  readonly dirtyPageCount: number;
}

export interface DenseSeekResult {
  readonly state: DenseSyntheticState;
  readonly reconstructionSteps: {
    readonly keyframeTick: number;
    readonly recordsRead: number;
    readonly deltaRecordsApplied: number;
    readonly dirtyPagesApplied: number;
  };
}

/** Experiment-only periodic full keyframes plus complete deterministic dirty pages. */
export class DensePagedTimeline {
  readonly #retention: number;
  readonly #keyframeInterval: number;
  readonly #pageSize: number;
  readonly #entityCount: number;
  #records: DenseRecord[];
  #current: DenseSyntheticState;

  public constructor(initial: DenseSyntheticState, options: {
    readonly retention: number;
    readonly keyframeInterval: number;
    readonly pageSize: number;
  }) {
    validateRetention(options.retention);
    validatePositiveInteger(options.keyframeInterval, "keyframeInterval");
    validatePositiveInteger(options.pageSize, "pageSize");
    validateDenseState(initial);
    this.#retention = options.retention;
    this.#keyframeInterval = options.keyframeInterval;
    this.#pageSize = options.pageSize;
    this.#entityCount = initial.influence.length;
    this.#current = cloneDenseState(initial);
    this.#records = [this.#makeKeyframe(this.#current)];
  }

  public append(tick: number, changes: readonly SyntheticChange[]): void {
    validateContiguousAppendTick(this.#current.tick, tick);
    validateChanges(changes, this.#entityCount);
    const next: DenseSyntheticState = {
      tick,
      influence: this.#current.influence.slice(),
      supply: this.#current.supply.slice(),
    };
    for (const change of changes) {
      next.influence[change.entityIndex] = change.influence;
      next.supply[change.entityIndex] = change.supply;
    }
    const dirtyPageIndices = [...new Set(changes.map((change) => Math.floor(change.entityIndex / this.#pageSize)))].sort((a, b) => a - b);
    const record = tick % this.#keyframeInterval === 0
      ? this.#makeKeyframe(next, tick)
      : this.#makeDelta(next, tick, dirtyPageIndices);
    this.#current = next;
    this.#records.push(record);
    this.#evictToBound();
  }

  public seek(tick: number): DenseSeekResult {
    assertSafeNonNegativeInteger(tick, "tick");
    const targetIndex = this.#records.findIndex((record) => record.tick === tick);
    if (targetIndex < 0) throw new RangeError(this.#unavailableMessage(tick));
    let keyframeIndex = targetIndex;
    while (keyframeIndex >= 0 && this.#records[keyframeIndex]?.kind !== "keyframe") keyframeIndex -= 1;
    const keyframe = this.#records[keyframeIndex];
    if (keyframe === undefined || keyframe.kind !== "keyframe") throw new Error("timeline invariant: retained target has no keyframe");
    const state = {
      tick: keyframe.tick,
      influence: keyframe.influence.slice(),
      supply: keyframe.supply.slice(),
    };
    let deltaRecordsApplied = 0;
    let dirtyPagesApplied = 0;
    for (let index = keyframeIndex + 1; index <= targetIndex; index += 1) {
      const record = this.#records[index];
      if (record === undefined) throw new Error("timeline invariant: missing record");
      if (record.kind === "keyframe") {
        state.influence.set(record.influence);
        state.supply.set(record.supply);
      } else {
        deltaRecordsApplied += 1;
        for (const page of record.pages) {
          const start = page.pageIndex * this.#pageSize;
          state.influence.set(page.influence, start);
          state.supply.set(page.supply, start);
          dirtyPagesApplied += 1;
        }
      }
      state.tick = record.tick;
    }
    return {
      state,
      reconstructionSteps: {
        keyframeTick: keyframe.tick,
        recordsRead: targetIndex - keyframeIndex + 1,
        deltaRecordsApplied,
        dirtyPagesApplied,
      },
    };
  }

  public forkAt(tick: number): DensePagedTimeline {
    return new DensePagedTimeline(this.seek(tick).state, {
      retention: this.#retention,
      keyframeInterval: this.#keyframeInterval,
      pageSize: this.#pageSize,
    });
  }

  public retainedRange(): Readonly<{ earliestTick: number; latestTick: number }> {
    return { earliestTick: this.#first().tick, latestTick: this.#last().tick };
  }

  public accounting(): DenseTimelineAccounting {
    let payloadBytes = 0;
    let metadataBytes = 0;
    let keyframeCount = 0;
    let deltaCount = 0;
    let dirtyPageCount = 0;
    for (const record of this.#records) {
      metadataBytes += 16; // uint64 tick + uint8 kind + 3 reserved bytes + uint32 entity/page count
      if (record.kind === "keyframe") {
        keyframeCount += 1;
        payloadBytes += record.influence.byteLength + record.supply.byteLength;
      } else {
        deltaCount += 1;
        dirtyPageCount += record.pages.length;
        metadataBytes += record.pages.length * 8; // uint32 page index + uint32 element count
        for (const page of record.pages) payloadBytes += page.influence.byteLength + page.supply.byteLength;
      }
    }
    return {
      measuredAs: "logical-dense-pages-v1",
      payloadBytes,
      metadataBytes,
      totalBytes: payloadBytes + metadataBytes,
      retainedVersions: this.#records.length,
      keyframeCount,
      deltaCount,
      dirtyPageCount,
    };
  }

  #makeKeyframe(state: DenseSyntheticState, tick = state.tick): DenseKeyframe {
    return { kind: "keyframe", tick, influence: state.influence.slice(), supply: state.supply.slice() };
  }

  #makeDelta(state: DenseSyntheticState, tick: number, pageIndices: readonly number[]): DenseDelta {
    const pages = pageIndices.map((pageIndex): DenseDirtyPage => {
      const start = pageIndex * this.#pageSize;
      const end = Math.min(start + this.#pageSize, this.#entityCount);
      return {
        pageIndex,
        elementCount: end - start,
        influence: state.influence.slice(start, end),
        supply: state.supply.slice(start, end),
      };
    });
    return { kind: "delta", tick, pages };
  }

  #evictToBound(): void {
    while (this.#records.length > this.#retention) {
      const nextEarliest = this.#records[1];
      if (nextEarliest === undefined) throw new Error("timeline invariant: cannot evict sole record");
      const promoted = nextEarliest.kind === "keyframe" ? undefined : this.seek(nextEarliest.tick).state;
      this.#records.shift();
      if (promoted !== undefined) this.#records[0] = this.#makeKeyframe(promoted);
    }
  }

  #first(): DenseRecord {
    const record = this.#records[0];
    if (record === undefined) throw new Error("timeline invariant: no first record");
    return record;
  }

  #last(): DenseRecord {
    const record = this.#records[this.#records.length - 1];
    if (record === undefined) throw new Error("timeline invariant: no last record");
    return record;
  }

  #unavailableMessage(tick: number): string {
    const range = this.retainedRange();
    return `tick ${tick} is outside retained range ${range.earliestTick}..${range.latestTick}`;
  }
}

function validateDenseState(state: DenseSyntheticState): void {
  assertSafeNonNegativeInteger(state.tick, "initial.tick");
  if (!(state.influence instanceof Uint32Array) || !(state.supply instanceof Uint32Array)) {
    throw new TypeError("dense fields must be Uint32Array instances");
  }
  if (state.influence.length !== state.supply.length) throw new Error("dense fields must have equal lengths");
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${label} must be a positive safe integer`);
}
