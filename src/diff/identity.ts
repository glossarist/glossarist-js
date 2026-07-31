// Shared identity helper for the diff layer.
//
// Per invariant N1, identity is a model concern. Models expose
// `identity()` returning a stable string. This helper dispatches: if
// the value is a model with `identity()`, call it; otherwise fall
// back to canonical JSON of `toJSON()`.

import { canonicalJson } from './canonical-json.js';

interface Identifiable {
  identity(): string;
}
interface HasToJSON {
  toJSON(): unknown;
}

function hasIdentity(v: unknown): v is Identifiable {
  return v != null && typeof v === 'object' && typeof (v as { identity?: unknown }).identity === 'function';
}

function hasToJSON(v: unknown): v is HasToJSON {
  return v != null && typeof v === 'object' && typeof (v as { toJSON?: unknown }).toJSON === 'function';
}

export function identityOf(item: unknown): string {
  if (item == null) return '';
  if (hasIdentity(item)) return item.identity();
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (typeof item === 'boolean') return String(item);
  if (hasToJSON(item)) return canonicalJson(item.toJSON());
  return canonicalJson(item);
}
