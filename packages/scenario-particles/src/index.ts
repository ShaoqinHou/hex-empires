import type { CommandEnvelope, ScenarioDefinition } from "@hex-empires/kernel";

export const PARTICLE_CAPACITY = 32;

export interface ParticleWorld {
  readonly capacity: number;
  readonly active: Uint8Array;
  readonly x: Int32Array;
  readonly y: Int32Array;
  readonly velocityX: Int32Array;
  readonly velocityY: Int32Array;
  readonly age: Uint16Array;
  readonly lifetime: Uint16Array;
}

export type ParticleCommand =
  | {
      readonly kind: "spawn";
      readonly slot: number;
      readonly x: number;
      readonly y: number;
      readonly velocityX: number;
      readonly velocityY: number;
      readonly lifetime: number;
    }
  | { readonly kind: "despawn"; readonly slot: number };

export interface ParticleSnapshot {
  readonly capacity: number;
  readonly activeCount: number;
  readonly active: readonly number[];
  readonly x: readonly number[];
  readonly y: readonly number[];
  readonly velocityX: readonly number[];
  readonly velocityY: readonly number[];
  readonly age: readonly number[];
  readonly lifetime: readonly number[];
}

function createParticleWorld(): ParticleWorld {
  return {
    capacity: PARTICLE_CAPACITY,
    active: new Uint8Array(PARTICLE_CAPACITY),
    x: new Int32Array(PARTICLE_CAPACITY),
    y: new Int32Array(PARTICLE_CAPACITY),
    velocityX: new Int32Array(PARTICLE_CAPACITY),
    velocityY: new Int32Array(PARTICLE_CAPACITY),
    age: new Uint16Array(PARTICLE_CAPACITY),
    lifetime: new Uint16Array(PARTICLE_CAPACITY),
  };
}

function requireSlot(world: ParticleWorld, slot: number): void {
  if (!Number.isSafeInteger(slot) || slot < 0 || slot >= world.capacity) {
    throw new Error(`slot is outside fixed capacity: ${slot}`);
  }
}

function requireInt32(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < -2_147_483_648 || value > 2_147_483_647) {
    throw new Error(`${label} must be an int32`);
  }
}

export const particleScenario: ScenarioDefinition<ParticleWorld, ParticleCommand, ParticleSnapshot> = {
  id: "fixed-particles",
  schemaVersion: 1,
  createWorld: createParticleWorld,
  validateCommand(world, command) {
    requireSlot(world, command.slot);
    if (command.kind === "spawn") {
      if (world.active[command.slot] === 1) throw new Error(`slot is already active: ${command.slot}`);
      requireInt32(command.x, "x");
      requireInt32(command.y, "y");
      requireInt32(command.velocityX, "velocityX");
      requireInt32(command.velocityY, "velocityY");
      if (!Number.isSafeInteger(command.lifetime) || command.lifetime < 1 || command.lifetime > 65_535) {
        throw new Error("lifetime must be an integer from 1 through 65535");
      }
    } else if (command.kind !== "despawn") {
      throw new Error("unsupported command");
    } else if (world.active[command.slot] === 0) {
      throw new Error(`slot is not active: ${command.slot}`);
    }
  },
  applyCommand(world, command) {
    const slot = command.slot;
    if (command.kind === "despawn") {
      world.active[slot] = 0;
      return;
    }

    world.active[slot] = 1;
    world.x[slot] = command.x;
    world.y[slot] = command.y;
    world.velocityX[slot] = command.velocityX;
    world.velocityY[slot] = command.velocityY;
    world.age[slot] = 0;
    world.lifetime[slot] = command.lifetime;
  },
  systems: [
    {
      name: "apply-drift",
      run(world, context) {
        const random = context.random.stream("authoritative-drift");
        for (let slot = 0; slot < world.capacity; slot += 1) {
          if (world.active[slot] === 0) continue;
          world.velocityX[slot] = (world.velocityX[slot] ?? 0) + random.nextInt(3) - 1;
          world.velocityY[slot] = (world.velocityY[slot] ?? 0) + random.nextInt(3) - 1;
        }
      },
    },
    {
      name: "integrate",
      run(world) {
        for (let slot = 0; slot < world.capacity; slot += 1) {
          if (world.active[slot] === 0) continue;
          world.x[slot] = (world.x[slot] ?? 0) + (world.velocityX[slot] ?? 0);
          world.y[slot] = (world.y[slot] ?? 0) + (world.velocityY[slot] ?? 0);
          world.age[slot] = (world.age[slot] ?? 0) + 1;
        }
      },
    },
    {
      name: "retire-expired",
      run(world) {
        for (let slot = 0; slot < world.capacity; slot += 1) {
          if (world.active[slot] === 1 && (world.age[slot] ?? 0) >= (world.lifetime[slot] ?? 0)) {
            world.active[slot] = 0;
          }
        }
      },
    },
  ],
  snapshot(world) {
    let activeCount = 0;
    for (const value of world.active) activeCount += value;
    return {
      capacity: world.capacity,
      activeCount,
      active: Array.from(world.active),
      x: Array.from(world.x),
      y: Array.from(world.y),
      velocityX: Array.from(world.velocityX),
      velocityY: Array.from(world.velocityY),
      age: Array.from(world.age),
      lifetime: Array.from(world.lifetime),
    };
  },
};

export const particleReplayFixture: {
  readonly runSeed: string;
  readonly tickCount: number;
  readonly commands: readonly CommandEnvelope<ParticleCommand>[];
} = {
  runSeed: "particle-fixture-v1",
  tickCount: 6,
  commands: [
    {
      tick: 0,
      sequence: 0,
      command: { kind: "spawn", slot: 0, x: 10, y: -4, velocityX: 2, velocityY: 1, lifetime: 9 },
    },
    {
      tick: 0,
      sequence: 1,
      command: { kind: "spawn", slot: 7, x: -3, y: 8, velocityX: 0, velocityY: -2, lifetime: 8 },
    },
    { tick: 2, sequence: 2, command: { kind: "despawn", slot: 7 } },
    {
      tick: 3,
      sequence: 3,
      command: { kind: "spawn", slot: 3, x: 100, y: 20, velocityX: -3, velocityY: 0, lifetime: 2 },
    },
  ],
};
