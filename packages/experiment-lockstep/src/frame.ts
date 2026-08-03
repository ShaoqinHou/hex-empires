import {
  canonicalDigest,
  canonicalStringify,
  cloneCanonical,
  type CommandEnvelope,
} from "@hex-empires/kernel";

import {
  LOCKSTEP_PROTOCOL_ID,
  ProtocolMismatchError,
  assertSessionFields,
  requireSafeNonNegativeInteger,
  type LockstepSession,
} from "./protocol.js";

export interface ClosedTickFrame<Command> {
  readonly protocolId: typeof LOCKSTEP_PROTOCOL_ID;
  readonly sessionDigest: string;
  readonly tick: number;
  readonly commands: readonly CommandEnvelope<Command>[];
  readonly frameDigest: string;
}

interface FramePayload<Command> {
  readonly protocolId: typeof LOCKSTEP_PROTOCOL_ID;
  readonly sessionDigest: string;
  readonly tick: number;
  readonly commands: readonly CommandEnvelope<Command>[];
}

export interface CanonicalFrame<Command> {
  readonly frame: ClosedTickFrame<Command>;
  readonly canonicalFrame: string;
}

function ownKeysExactly(value: object, keys: readonly string[], subject: string): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new ProtocolMismatchError(`${subject} has unexpected fields`);
  }
}

function framePayload<Command>(
  session: LockstepSession,
  tick: number,
  commands: readonly CommandEnvelope<Command>[],
): FramePayload<Command> {
  return {
    protocolId: session.protocolId,
    sessionDigest: session.sessionDigest,
    tick,
    commands,
  };
}

/** Authority-side helper. Replicas still validate every field and digest. */
export function createClosedTickFrame<Command>(
  session: LockstepSession,
  tick: number,
  commands: readonly CommandEnvelope<Command>[],
): ClosedTickFrame<Command> {
  requireSafeNonNegativeInteger(tick, "frame tick");
  const payload = framePayload(session, tick, commands);
  return cloneCanonical({ ...payload, frameDigest: canonicalDigest(payload) });
}

export function canonicalizeAndValidateFrame<Command>(
  candidate: ClosedTickFrame<Command>,
  expectedSession: LockstepSession,
): CanonicalFrame<Command> {
  let frame: ClosedTickFrame<Command>;
  try {
    frame = cloneCanonical(candidate);
  } catch (cause) {
    throw new ProtocolMismatchError(
      `tick frame is not canonical plain data: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }

  ownKeysExactly(frame, ["protocolId", "sessionDigest", "tick", "commands", "frameDigest"], "tick frame");
  assertSessionFields(frame, expectedSession, "tick frame");
  try {
    requireSafeNonNegativeInteger(frame.tick, "frame tick");
  } catch (cause) {
    throw new ProtocolMismatchError(cause instanceof Error ? cause.message : String(cause));
  }
  if (!Array.isArray(frame.commands)) {
    throw new ProtocolMismatchError("tick frame commands must be an array");
  }

  let previousSequence = -1;
  for (const [index, envelope] of frame.commands.entries()) {
    if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) {
      throw new ProtocolMismatchError(`tick frame command ${index} must be an envelope object`);
    }
    ownKeysExactly(envelope, ["tick", "sequence", "command"], `tick frame command ${index}`);
    if (!Number.isSafeInteger(envelope.tick) || envelope.tick !== frame.tick) {
      throw new ProtocolMismatchError(`tick frame command ${index} has a mismatched tick`);
    }
    if (!Number.isSafeInteger(envelope.sequence) || envelope.sequence < 0) {
      throw new ProtocolMismatchError(`tick frame command ${index} has an invalid sequence`);
    }
    if (envelope.sequence <= previousSequence) {
      throw new ProtocolMismatchError("tick frame command sequences must be strictly increasing");
    }
    previousSequence = envelope.sequence;
  }

  const expectedDigest = canonicalDigest(
    framePayload(expectedSession, frame.tick, frame.commands),
  );
  if (frame.frameDigest !== expectedDigest) {
    throw new ProtocolMismatchError("tick frame digest does not match its canonical payload");
  }
  return Object.freeze({ frame, canonicalFrame: canonicalStringify(frame) });
}
