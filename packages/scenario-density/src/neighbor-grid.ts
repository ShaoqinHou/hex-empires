import type {
  DensityGridPreparation,
  DensityNeighborSearchAlgorithm,
  DensityNeighborSearchDiagnostics,
  DensityWorkload,
} from "./contracts.js";

/** Keeps the three dense Int32 cell arrays below roughly 48 MB in aggregate. */
export const MAX_DENSITY_GRID_CELLS = 4_000_000;

export interface DensityGridGeometry {
  readonly origin: number;
  readonly coordinateLimit: number;
  readonly cellWidth: number;
  readonly cellsPerAxis: number;
  readonly addressableCells: number;
}

export interface DensityGridScratch {
  readonly counts: Int32Array;
  readonly offsets: Int32Array;
  readonly cursors: Int32Array;
  readonly particleIds: Uint32Array;
}

export interface DensityGridWorkspace {
  readonly geometry: DensityGridGeometry;
  readonly scratch: DensityGridScratch;
  readonly preparation: DensityGridPreparation;
}

export function createDensityGridGeometry(workload: DensityWorkload): DensityGridGeometry {
  const cellWidth = Math.max(1, workload.neighborRadius);
  const cellsPerAxis = Math.floor((workload.coordinateLimit * 2) / cellWidth) + 1;
  const addressableCells = cellsPerAxis * cellsPerAxis;
  if (!Number.isSafeInteger(addressableCells) || addressableCells > MAX_DENSITY_GRID_CELLS) {
    throw new Error(
      `density uniform grid requires ${addressableCells} addressable cells; maximum is ${MAX_DENSITY_GRID_CELLS}`,
    );
  }
  return {
    origin: -workload.coordinateLimit,
    coordinateLimit: workload.coordinateLimit,
    cellWidth,
    cellsPerAxis,
    addressableCells,
  };
}

export function createDensityGridScratch(
  geometry: DensityGridGeometry,
  capacity: number,
): DensityGridScratch {
  return {
    counts: new Int32Array(geometry.addressableCells),
    offsets: new Int32Array(geometry.addressableCells + 1),
    cursors: new Int32Array(geometry.addressableCells),
    particleIds: new Uint32Array(capacity),
  };
}

export function createDensityGridWorkspace(
  workload: DensityWorkload,
  particleCapacity: number,
): DensityGridWorkspace {
  const geometry = createDensityGridGeometry(workload);
  return {
    geometry,
    scratch: createDensityGridScratch(geometry, particleCapacity),
    preparation: {
      addressableCells: geometry.addressableCells,
      cellsPerAxis: geometry.cellsPerAxis,
      cellWidth: geometry.cellWidth,
      particleCapacity,
    },
  };
}

export function densityGridCellIndex(
  x: number,
  y: number,
  geometry: DensityGridGeometry,
): number {
  if (x < geometry.origin || y < geometry.origin || x > geometry.coordinateLimit || y > geometry.coordinateLimit) {
    throw new Error(`density position (${x}, ${y}) lies outside the pinned workload domain`);
  }
  const cellX = Math.floor((x - geometry.origin) / geometry.cellWidth);
  const cellY = Math.floor((y - geometry.origin) / geometry.cellWidth);
  if (
    cellX < 0 ||
    cellY < 0 ||
    cellX >= geometry.cellsPerAxis ||
    cellY >= geometry.cellsPerAxis
  ) {
    throw new Error(`density position (${x}, ${y}) lies outside the pinned workload domain`);
  }
  return cellY * geometry.cellsPerAxis + cellX;
}

/** Prefixes counts and initializes fill cursors. Returns occupancy evidence. */
export function prefixDensityGrid(scratch: DensityGridScratch): {
  readonly occupiedCells: number;
  readonly maximumOccupancy: number;
} {
  let occupiedCells = 0;
  let maximumOccupancy = 0;
  let offset = 0;
  for (let cell = 0; cell < scratch.counts.length; cell += 1) {
    const count = scratch.counts[cell] ?? 0;
    scratch.offsets[cell] = offset;
    scratch.cursors[cell] = offset;
    offset += count;
    if (count > 0) occupiedCells += 1;
    if (count > maximumOccupancy) maximumOccupancy = count;
  }
  scratch.offsets[scratch.counts.length] = offset;
  return { occupiedCells, maximumOccupancy };
}

function mix32(value: number): number {
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

/** First inexpensive order-insensitive fingerprint contribution for one unordered id pair. */
export function densityPairFingerprintXorValue(leftId: number, rightId: number): number {
  const low = Math.min(leftId, rightId) + 1;
  const high = Math.max(leftId, rightId) + 1;
  return mix32((Math.imul(low, 0x9e3779b1) ^ Math.imul(high, 0x85ebca77)) >>> 0);
}

/** Independently mixed wrapping-sum contribution for one unordered id pair. */
export function densityPairFingerprintSumValue(leftId: number, rightId: number): number {
  const low = Math.min(leftId, rightId) + 1;
  const high = Math.max(leftId, rightId) + 1;
  return mix32((Math.imul(low, 0xc2b2ae3d) + Math.imul(high, 0x27d4eb2f)) >>> 0);
}

export function densityNeighborDiagnostics(input: Omit<DensityNeighborSearchDiagnostics, "totalStructuralWork">): DensityNeighborSearchDiagnostics {
  return {
    ...input,
    totalStructuralWork:
      input.slotVisits +
      input.cellVisits +
      input.stencilVisits +
      input.candidateVisits +
      input.distanceChecks,
  };
}

export function emptyDensityNeighborDiagnostics(
  algorithm: DensityNeighborSearchAlgorithm,
): DensityNeighborSearchDiagnostics {
  return densityNeighborDiagnostics({
    algorithm,
    activeCount: 0,
    addressableCells: 0,
    occupiedCells: 0,
    maximumOccupancy: 0,
    slotVisits: 0,
    cellVisits: 0,
    stencilVisits: 0,
    candidateVisits: 0,
    distanceChecks: 0,
    acceptedPairs: 0,
    pairFingerprintXor: 0,
    pairFingerprintSum: 0,
  });
}
