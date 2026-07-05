// Helpers for normalizing enumeration values that get interpolated into
// URIs. Source data may contain compound forms ("preferred/admitted") or
// path-like values that must be reduced to a single local name before
// being embedded in a URI, otherwise the URI is malformed.

// Returns the last path segment of an enumeration value.
// Examples:
//   'preferred'             → 'preferred'
//   'preferred/admitted'    → 'admitted'
//   'http://x/ns#preferred' → 'preferred'
//   '' / null / undefined   → '' (caller decides whether to skip emission)
export function normalizeEnum(value) {
  if (value == null) return '';
  const s = String(value).trim();
  if (!s) return '';
  const parts = s.split(/[/#]/);
  return parts[parts.length - 1];
}

// True when normalizeEnum would produce a non-empty token.
export function hasEnumValue(value) {
  return normalizeEnum(value).length > 0;
}
