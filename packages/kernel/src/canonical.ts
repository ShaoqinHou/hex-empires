import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export const CANONICAL_FORMAT = "sorted-json-plain-data/v1";

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalizationError";
  }
}

function encode(value: unknown, path: string, ancestors: Set<object>): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new CanonicalizationError(`${path} contains a non-finite number`);
      }
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "object":
      break;
    default:
      throw new CanonicalizationError(`${path} contains unsupported ${typeof value}`);
  }

  if (ancestors.has(value)) {
    throw new CanonicalizationError(`${path} contains a cycle`);
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      const expectedKeys = new Set(["length", ...Array.from({ length: value.length }, (_, index) => String(index))]);
      if (ownKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key))) {
        throw new CanonicalizationError(`${path} contains non-index array properties`);
      }
      const entries = Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        if (descriptor === undefined) throw new CanonicalizationError(`${path}[${index}] is a sparse array hole`);
        if (!descriptor.enumerable || !("value" in descriptor)) {
          throw new CanonicalizationError(`${path}[${index}] must be an enumerable data property`);
        }
        return encode(descriptor.value, `${path}[${index}]`, ancestors);
      });
      return `[${entries.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CanonicalizationError(`${path} must contain only arrays and plain objects`);
    }

    const record = value as Record<string, unknown>;
    const ownKeys = Reflect.ownKeys(record);
    if (ownKeys.some((key) => typeof key !== "string")) {
      throw new CanonicalizationError(`${path} contains a symbol key`);
    }
    const entries = (ownKeys as string[]).map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        throw new CanonicalizationError(`${path}.${key} must be an enumerable data property`);
      }
      return { key, value: descriptor.value };
    });
    entries.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
    const properties = entries.map(
      ({ key, value: entryValue }) =>
        `${JSON.stringify(key)}:${encode(entryValue, `${path}.${key}`, ancestors)}`,
    );
    return `{${properties.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalStringify(value: unknown): string {
  return encode(value, "$", new Set());
}

export function digestCanonical(canonicalValue: string): string {
  return bytesToHex(sha256(utf8ToBytes(canonicalValue)));
}

export function canonicalDigest(value: unknown): string {
  return digestCanonical(canonicalStringify(value));
}

function freezeParsedValue(_key: string, value: unknown): unknown {
  return value !== null && typeof value === "object" ? Object.freeze(value) : value;
}

export function parseCanonical<Value>(canonicalValue: string): Value {
  return JSON.parse(canonicalValue, freezeParsedValue) as Value;
}

export function cloneCanonical<Value>(value: Value): Value {
  return parseCanonical<Value>(canonicalStringify(value));
}
