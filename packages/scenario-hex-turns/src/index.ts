import type { CommandEnvelope, ScenarioDefinition } from "@hex-empires/kernel";

export interface HexPosition {
  readonly q: number;
  readonly r: number;
}

export interface HexUnit {
  readonly id: string;
  readonly position: HexPosition;
}

export interface MoveCommand {
  readonly kind: "move";
  readonly unitId: string;
  readonly destination: HexPosition;
}

interface PendingMove {
  readonly sequence: number;
  readonly unitId: string;
  readonly destination: HexPosition;
}

interface MoveOutcome {
  readonly sequence: number;
  readonly unitId: string;
  readonly result: "moved" | "blocked";
}

export interface HexTurnWorld {
  readonly turn: number;
  readonly radius: number;
  readonly units: Readonly<Record<string, HexUnit>>;
  readonly pendingMoves: readonly PendingMove[];
  readonly lastOutcomes: readonly MoveOutcome[];
}

export interface HexTurnSnapshot {
  readonly turn: number;
  readonly radius: number;
  readonly units: readonly HexUnit[];
  readonly lastOutcomes: readonly MoveOutcome[];
}

function positionKey(position: HexPosition): string {
  return `${position.q},${position.r}`;
}

function isIntegerPosition(position: HexPosition): boolean {
  return Number.isSafeInteger(position.q) && Number.isSafeInteger(position.r);
}

function isInside(position: HexPosition, radius: number): boolean {
  return (
    Math.abs(position.q) <= radius &&
    Math.abs(position.r) <= radius &&
    Math.abs(position.q + position.r) <= radius
  );
}

function isAdjacent(left: HexPosition, right: HexPosition): boolean {
  const dq = right.q - left.q;
  const dr = right.r - left.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) === 1;
}

function initialWorld(): HexTurnWorld {
  return {
    turn: 0,
    radius: 2,
    units: {
      alpha: { id: "alpha", position: { q: -1, r: 0 } },
      bravo: { id: "bravo", position: { q: 1, r: 0 } },
    },
    pendingMoves: [],
    lastOutcomes: [],
  };
}

export const hexTurnScenario: ScenarioDefinition<HexTurnWorld, MoveCommand, HexTurnSnapshot> = {
  id: "hex-turns",
  schemaVersion: 1,
  createWorld: initialWorld,
  validateCommand(world, command) {
    if (command.kind !== "move") throw new Error("unsupported command");
    const unit = world.units[command.unitId];
    if (unit === undefined) throw new Error(`unknown unit: ${command.unitId}`);
    if (!isIntegerPosition(command.destination)) throw new Error("destination must use integer coordinates");
    if (!isInside(command.destination, world.radius)) throw new Error("destination is outside the map");
    if (!isAdjacent(unit.position, command.destination)) throw new Error("destination is not adjacent");
    if (world.pendingMoves.some((move) => move.unitId === command.unitId)) {
      throw new Error(`unit already has a command this tick: ${command.unitId}`);
    }
  },
  applyCommand(world, command, context) {
    return {
      ...world,
      pendingMoves: [
        ...world.pendingMoves,
        { sequence: context.sequence, unitId: command.unitId, destination: command.destination },
      ],
    };
  },
  systems: [
    {
      name: "resolve-moves",
      run(world) {
        const units: Record<string, HexUnit> = { ...world.units };
        const occupied = new Set(Object.values(units).map((unit) => positionKey(unit.position)));
        const outcomes: MoveOutcome[] = [];

        for (const move of world.pendingMoves) {
          const unit = units[move.unitId];
          if (unit === undefined) throw new Error(`pending move references missing unit: ${move.unitId}`);
          const destinationKey = positionKey(move.destination);
          if (occupied.has(destinationKey)) {
            outcomes.push({ sequence: move.sequence, unitId: move.unitId, result: "blocked" });
            continue;
          }

          occupied.delete(positionKey(unit.position));
          occupied.add(destinationKey);
          units[move.unitId] = { ...unit, position: move.destination };
          outcomes.push({ sequence: move.sequence, unitId: move.unitId, result: "moved" });
        }

        return { ...world, units, pendingMoves: [], lastOutcomes: outcomes };
      },
    },
    {
      name: "advance-turn",
      run(world) {
        return { ...world, turn: world.turn + 1 };
      },
    },
  ],
  snapshot(world) {
    return {
      turn: world.turn,
      radius: world.radius,
      units: Object.values(world.units).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)),
      lastOutcomes: world.lastOutcomes,
    };
  },
};

export const hexTurnReplayFixture: {
  readonly runSeed: string;
  readonly tickCount: number;
  readonly commands: readonly CommandEnvelope<MoveCommand>[];
} = {
  runSeed: "hex-fixture-v1",
  tickCount: 3,
  commands: [
    { tick: 0, sequence: 0, command: { kind: "move", unitId: "alpha", destination: { q: 0, r: 0 } } },
    { tick: 0, sequence: 1, command: { kind: "move", unitId: "bravo", destination: { q: 0, r: 0 } } },
    { tick: 1, sequence: 2, command: { kind: "move", unitId: "alpha", destination: { q: 0, r: 1 } } },
    { tick: 2, sequence: 3, command: { kind: "move", unitId: "bravo", destination: { q: 0, r: 0 } } },
  ],
};
