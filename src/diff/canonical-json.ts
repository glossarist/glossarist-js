// Canonical JSON for equality comparison.
//
// Sorts object keys recursively so two semantically-equal values produce
// identical strings regardless of insertion order. Arrays preserve order
// (they're ordered in domain semantics). Undefined values are dropped.

type JsonInput = null | undefined | string | number | boolean | JsonInput[] | { [k: string]: JsonInput };

export function canonicalJson(value: JsonInput | unknown): string {
  return JSON.stringify(toCanonical(value as JsonInput));
}

export function deepEqualCanonical(a: JsonInput | unknown, b: JsonInput | unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function toCanonical(value: JsonInput): unknown {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(toCanonical);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      const v = toCanonical((value as Record<string, JsonInput>)[k] as JsonInput);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return value;
}
