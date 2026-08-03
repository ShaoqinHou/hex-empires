import {
  canonicalDigest,
  canonicalStringify,
  cloneCanonical,
  type CommandEnvelope,
  type ScenarioDefinition,
} from "@hex-empires/kernel";

import { createClosedTickFrame, type ClosedTickFrame } from "./frame.js";
import {
  LOCKSTEP_PROTOCOL_ID,
  LockstepConfigurationError,
  ProtocolMismatchError,
  assertSessionFields,
  createLockstepSession,
  requireSafeNonNegativeInteger,
  type InputLeadPolicy,
  type LockstepSession,
} from "./protocol.js";

export interface ClientCommandRequest<Command> {
  readonly protocolId: typeof LOCKSTEP_PROTOCOL_ID;
  readonly sessionDigest: string;
  readonly clientId: string;
  readonly requestId: string;
  readonly command: Command;
}

export interface CommandReceipt {
  readonly protocolId: typeof LOCKSTEP_PROTOCOL_ID;
  readonly sessionDigest: string;
  readonly clientId: string;
  readonly requestId: string;
  readonly requestDigest: string;
  readonly tick: number;
  readonly sequence: number;
}

interface AcceptedRequest {
  readonly requestDigest: string;
  readonly receipt: CommandReceipt;
}

export class RequestConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestConflictError";
  }
}

export interface AuthorityOptions<World, Command, Snapshot> {
  readonly scenario: ScenarioDefinition<World, Command, Snapshot>;
  readonly runSeed: string;
  readonly rulesetId: string;
  readonly inputLead: InputLeadPolicy;
}

export class ClosedTickAuthority<World, Command, Snapshot> {
  readonly session: LockstepSession;
  readonly inputLead: Readonly<InputLeadPolicy>;

  private readonly acceptedRequests = new Map<string, AcceptedRequest>();
  private readonly scheduled = new Map<number, CommandEnvelope<Command>[]>();
  private readonly closedFrames = new Map<number, ClosedTickFrame<Command>>();
  private nextSequence = 0;
  private _nextTickToClose = 0;

  constructor(options: AuthorityOptions<World, Command, Snapshot>) {
    requireSafeNonNegativeInteger(options.inputLead.inputLeadTicks, "input lead ticks");
    this.session = createLockstepSession(
      options.scenario,
      options.runSeed,
      options.rulesetId,
      options.inputLead,
    );
    this.inputLead = cloneCanonical(options.inputLead);
  }

  get nextTickToClose(): number {
    return this._nextTickToClose;
  }

  accept(request: ClientCommandRequest<Command>): CommandReceipt {
    let admitted: ClientCommandRequest<Command>;
    try {
      admitted = cloneCanonical(request);
    } catch (cause) {
      throw new ProtocolMismatchError(
        `client request is not canonical plain data: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
    assertSessionFields(admitted, this.session, "client request");
    if (typeof admitted.clientId !== "string" || admitted.clientId.length === 0) {
      throw new ProtocolMismatchError("client id must be a non-empty string");
    }
    if (typeof admitted.requestId !== "string" || admitted.requestId.length === 0) {
      throw new ProtocolMismatchError("request id must be a non-empty string");
    }

    const requestKey = canonicalStringify([admitted.clientId, admitted.requestId]);
    const requestDigest = canonicalDigest(admitted);
    const prior = this.acceptedRequests.get(requestKey);
    if (prior !== undefined) {
      if (prior.requestDigest !== requestDigest) {
        throw new RequestConflictError(
          `request ${admitted.clientId}/${admitted.requestId} was retried with different canonical data`,
        );
      }
      return prior.receipt;
    }

    const tick = this._nextTickToClose + this.inputLead.inputLeadTicks;
    if (!Number.isSafeInteger(tick)) {
      throw new LockstepConfigurationError("assigned tick exceeds the safe integer range");
    }
    if (!Number.isSafeInteger(this.nextSequence)) {
      throw new LockstepConfigurationError("command sequence exceeds the safe integer range");
    }

    const envelope = cloneCanonical({ tick, sequence: this.nextSequence, command: admitted.command });
    const receipt = cloneCanonical({
      protocolId: this.session.protocolId,
      sessionDigest: this.session.sessionDigest,
      clientId: admitted.clientId,
      requestId: admitted.requestId,
      requestDigest,
      tick,
      sequence: this.nextSequence,
    });
    const atTick = this.scheduled.get(tick) ?? [];
    atTick.push(envelope);
    this.scheduled.set(tick, atTick);
    this.acceptedRequests.set(requestKey, Object.freeze({ requestDigest, receipt }));
    this.nextSequence += 1;
    return receipt;
  }

  closeNextTick(): ClosedTickFrame<Command> {
    const tick = this._nextTickToClose;
    if (tick === Number.MAX_SAFE_INTEGER) {
      throw new LockstepConfigurationError("next tick exceeds the safe integer range");
    }
    const frame = createClosedTickFrame(this.session, tick, this.scheduled.get(tick) ?? []);
    this.scheduled.delete(tick);
    this.closedFrames.set(tick, frame);
    this._nextTickToClose += 1;
    return frame;
  }

  closedFrame(tick: number): ClosedTickFrame<Command> | undefined {
    return this.closedFrames.get(tick);
  }
}

export function createClientRequest<Command>(
  session: LockstepSession,
  clientId: string,
  requestId: string,
  command: Command,
): ClientCommandRequest<Command> {
  return cloneCanonical({
    protocolId: session.protocolId,
    sessionDigest: session.sessionDigest,
    clientId,
    requestId,
    command,
  });
}
