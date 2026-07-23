// Shared identity helper for the diff layer.
//
// Per invariant N1 (TODO.hyperedges-v2/00-master-plan.md), identity is a
// model concern. Models expose `identity()` returning a stable string.
// This helper dispatches: if the value is a model with `identity()`,
// call it; otherwise fall back to canonical JSON of `toJSON()`.
//
// Both `concept-diff.js` (compute side) and `diff-patch.js` (apply side)
// import this — closing the duplication that previously allowed the two
// sides to drift.

import { canonicalJson } from './canonical-json.js';

export function identityOf(item) {
  if (item == null) return '';
  if (typeof item.identity === 'function') return item.identity();
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (typeof item === 'boolean') return String(item);
  if (typeof item.toJSON === 'function') return canonicalJson(item.toJSON());
  return canonicalJson(item);
}
