import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

import type { RandomSource, RandomStreamProvider } from "./types.js";

const MASK_64 = (1n << 64n) - 1n;
const UINT32_RANGE = 0x1_0000_0000;

export const RANDOM_ALGORITHM = "splitmix64-sha256-streams/v1";

function requireName(name: string): void {
  if (name.length === 0) throw new TypeError("random stream name must not be empty");
}

function deriveState(runSeed: string, streamName: string): bigint {
  const digest = sha256(utf8ToBytes(JSON.stringify([runSeed, streamName])));
  let state = 0n;
  for (let index = 0; index < 8; index += 1) {
    state = (state << 8n) | BigInt(digest[index] ?? 0);
  }
  return state;
}

class SplitMix64Source implements RandomSource {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = seed;
  }

  private nextUint64(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & MASK_64;
    let value = this.state;
    value = ((value ^ (value >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64;
    value = ((value ^ (value >> 27n)) * 0x94d049bb133111ebn) & MASK_64;
    return (value ^ (value >> 31n)) & MASK_64;
  }

  nextUint32(): number {
    return Number(this.nextUint64() >> 32n);
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
      throw new RangeError("maxExclusive must be a positive safe integer no greater than 2^32");
    }

    const acceptanceLimit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
    let value = this.nextUint32();
    while (value >= acceptanceLimit) value = this.nextUint32();
    return value % maxExclusive;
  }

  nextFloat(): number {
    const upper = this.nextUint32() >>> 5;
    const lower = this.nextUint32() >>> 6;
    return (upper * 67_108_864 + lower) / 9_007_199_254_740_992;
  }
}

export class NamedRandomStreams implements RandomStreamProvider {
  private readonly streams = new Map<string, RandomSource>();

  constructor(private readonly runSeed: string) {
    if (runSeed.length === 0) throw new TypeError("run seed must not be empty");
  }

  stream(name: string): RandomSource {
    requireName(name);
    const existing = this.streams.get(name);
    if (existing !== undefined) return existing;

    const created = new SplitMix64Source(deriveState(this.runSeed, name));
    this.streams.set(name, created);
    return created;
  }
}
