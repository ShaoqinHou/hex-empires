import {
  CANONICAL_FORMAT,
  SIMULATION_PROTOCOL,
  canonicalDigest,
  cloneCanonical,
  type ScenarioDefinition,
} from "@hex-empires/kernel";

export const LOCKSTEP_PROTOCOL_ID = "transport-free-closed-tick-lockstep/v1";

export interface InputLeadPolicy {
  /** A request accepted while N is the earliest open tick is assigned to N + inputLeadTicks. */
  readonly inputLeadTicks: number;
}

export interface LockstepSession {
  readonly protocolId: typeof LOCKSTEP_PROTOCOL_ID;
  readonly canonicalFormat: typeof CANONICAL_FORMAT;
  readonly simulationProtocol: typeof SIMULATION_PROTOCOL;
  readonly scenarioId: string;
  readonly scenarioSchemaVersion: number;
  readonly rulesetId: string;
  readonly inputLeadTicks: number;
  readonly runSeedDigest: string;
  readonly sessionDigest: string;
}

interface SessionDescriptor {
  readonly protocolId: typeof LOCKSTEP_PROTOCOL_ID;
  readonly canonicalFormat: typeof CANONICAL_FORMAT;
  readonly simulationProtocol: typeof SIMULATION_PROTOCOL;
  readonly scenarioId: string;
  readonly scenarioSchemaVersion: number;
  readonly rulesetId: string;
  readonly inputLeadTicks: number;
  readonly runSeedDigest: string;
}

export class LockstepConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LockstepConfigurationError";
  }
}

export class ProtocolMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolMismatchError";
  }
}

export function requireSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LockstepConfigurationError(`${label} must be a non-negative safe integer`);
  }
}

export function createLockstepSession<World, Command, Snapshot>(
  scenario: ScenarioDefinition<World, Command, Snapshot>,
  runSeed: string,
  rulesetId: string,
  inputLead: InputLeadPolicy,
): LockstepSession {
  if (scenario.id.length === 0) {
    throw new LockstepConfigurationError("scenario id must not be empty");
  }
  if (!Number.isSafeInteger(scenario.schemaVersion) || scenario.schemaVersion < 1) {
    throw new LockstepConfigurationError("scenario schema version must be a positive safe integer");
  }
  if (typeof rulesetId !== "string" || rulesetId.length === 0) {
    throw new LockstepConfigurationError("ruleset id must be a non-empty string");
  }
  requireSafeNonNegativeInteger(inputLead.inputLeadTicks, "input lead ticks");
  const descriptor: SessionDescriptor = {
    protocolId: LOCKSTEP_PROTOCOL_ID,
    canonicalFormat: CANONICAL_FORMAT,
    simulationProtocol: SIMULATION_PROTOCOL,
    scenarioId: scenario.id,
    scenarioSchemaVersion: scenario.schemaVersion,
    rulesetId,
    inputLeadTicks: inputLead.inputLeadTicks,
    runSeedDigest: canonicalDigest({ runSeed }),
  };
  return cloneCanonical({ ...descriptor, sessionDigest: canonicalDigest(descriptor) });
}

export function assertSessionFields(
  value: { readonly protocolId: string; readonly sessionDigest: string },
  expected: LockstepSession,
  subject: string,
): void {
  if (value.protocolId !== expected.protocolId) {
    throw new ProtocolMismatchError(
      `${subject} protocol ${value.protocolId} does not match ${expected.protocolId}`,
    );
  }
  if (value.sessionDigest !== expected.sessionDigest) {
    throw new ProtocolMismatchError(`${subject} belongs to a different lockstep session`);
  }
}
