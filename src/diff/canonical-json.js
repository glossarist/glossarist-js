// Canonical JSON for equality comparison.
//
// Sorts object keys recursively so two semantically-equal values produce
// identical strings regardless of insertion order. Arrays preserve order
// (they're ordered in domain semantics). Undefined values are dropped.
//
// Used by the diff layer to compare items whose `toJSON()` may emit keys
// in different orders depending on conditional inclusion (e.g.,
// PartitiveHyperedge#toJSON omits `markers` when empty).

export function canonicalJson(value) {
  return JSON.stringify(toCanonical(value));
}

export function deepEqualCanonical(a, b) {
  return canonicalJson(a) === canonicalJson(b);
}

function toCanonical(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(toCanonical);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      const v = toCanonical(value[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return value;
}
