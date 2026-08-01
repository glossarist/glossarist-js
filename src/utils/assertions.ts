import { InvalidInputError } from '../errors.js';

export function assertDir(dir: unknown, fnName: string): asserts dir is string {
  if (typeof dir !== 'string' || dir.trim() === '') {
    throw new InvalidInputError(`${fnName} requires a directory path`, 'non-empty string');
  }
}

export function assertNonEmptyString(value: unknown, fnName: string, fieldName: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidInputError(`${fnName} requires ${fieldName}`, 'non-empty string');
  }
}

export function assertRequiredOption<T>(value: T | null | undefined, fnName: string, optionName: string, reason: string): asserts value is T {
  if (value == null) {
    throw new Error(`${fnName} requires ${optionName} — ${reason}`);
  }
}
