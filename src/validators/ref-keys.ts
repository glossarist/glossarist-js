// Shared identity-key helpers for cross-relation validators.
//
// Extracted from HyperedgeCoherenceRule and
// BinaryHasPartRedundancyRule.
// Eliminates drift: both rules now use the same notion of "same ref"
// and "same criterion" instead of each defining its own _refKey and
// _criterionKey with subtly different behaviors.

export function refKey(ref) {
  if (!ref) return null;
  const source = ref.source ?? '';
  const id = ref.id ?? '';
  if (!source && !id) return null;
  return `${source}:${id}`;
}

// Hashable key for a criterion (lang-keyed hash). Returns null when
// no criterion is set OR when the criterion contains no string values.
// Values are sorted so two criteria with the same strings in different
// language-key order produce the same key (ISO 12620 coordinate-
// concept coherence cares about the criterion's content, not the
// language label order).
export function criterionKey(criterion) {
  if (!criterion || typeof criterion !== 'object') return null;
  const values = Object.values(criterion)
    .filter(v => typeof v === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .sort();
  return values.length > 0 ? values.join('|') : null;
}
