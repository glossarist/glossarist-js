// Shared identity-key helpers for cross-relation validators.
//
// Extracted from HyperedgeCoherenceRule and
// BinaryHasPartRedundancyRule.
// Eliminates drift: both rules now use the same notion of "same ref"
// and "same criterion" instead of each defining its own _refKey and
// _criterionKey with subtly different behaviors.

interface ConceptRef {
  source?: string;
  id?: string;
}

export function refKey(ref: ConceptRef | null | undefined): string | null {
  if (!ref) return null;
  const source = ref.source ?? '';
  const id = ref.id ?? '';
  if (!source && !id) return null;
  return `${source}:${id}`;
}

export function criterionKey(criterion: Record<string, unknown> | null | undefined): string | null {
  if (!criterion || typeof criterion !== 'object') return null;
  const values = Object.values(criterion)
    .filter(v => typeof v === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .sort();
  return values.length > 0 ? values.join('|') : null;
}
