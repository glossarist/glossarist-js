// v1 → v2 PartitiveHyperedge migration.
//
// Pure function: takes a v1 PartitiveHyperedge hash, returns a v2
// PartitiveHyperedge hash. Idempotent.

export interface V1HyperedgeHash {
  comprehensive?: { source?: string; id?: string; text?: string };
  parts?: ReadonlyArray<{ source?: string; id?: string }>;
  enumeration?: string;
  content?: string | null;
  markers?: ReadonlyArray<string>;
}

export interface V2HyperedgeHash {
  comprehensive: { source?: string; id?: string };
  partitives: ReadonlyArray<{
    ref: { source?: string; id?: string };
    presence: string;
    count: string;
  }>;
  completeness: string;
  migrationWarning?: string;
}

export function migrateHyperedgeToRelation(
  v1Hash: V1HyperedgeHash | ReadonlyArray<V1HyperedgeHash> | null,
): V2HyperedgeHash | ReadonlyArray<V2HyperedgeHash | null> | null {
  if (v1Hash == null) return null;
  if (Array.isArray(v1Hash)) {
    return v1Hash.map(migrateHyperedgeToRelation) as ReadonlyArray<V2HyperedgeHash | null>;
  }

  const h = v1Hash as V1HyperedgeHash;
  const out: Partial<V2HyperedgeHash> = {
    comprehensive: { ...(h.comprehensive ?? {}) },
  };

  const parts = Array.isArray(h.parts) ? h.parts : [];
  out.partitives = parts.map((ref) => ({
    ref: { ...ref },
    presence: 'required',
    count: 'exactly_one',
  }));

  out.completeness = _migrateEnumeration(h.enumeration);

  if (parts.length < 2) {
    out.migrationWarning =
      `v1 PartitiveHyperedge had ${parts.length} part(s); v2 requires ≥2. ` +
      `Either add more partitives or convert to a binary has_part edge.`;
  }

  if (h.content != null) {
    out.migrationWarning = (out.migrationWarning ?? '') +
      ` v1 'content' field was dropped (v2 PartitiveHyperedge carries no prose; ` +
      `move valuable text to the comprehensive concept's notes).`;
  }

  if (Array.isArray(h.markers) && h.markers.length > 0) {
    out.migrationWarning = (out.migrationWarning ?? '') +
      ` v1 'markers' field (${h.markers.join(', ')}) was dropped; ` +
      `v2 uses per-member 'multiplicity' + 'is_delimiting'. Reviewer ` +
      `should set these per partitive based on ISO 704:2022 notation.`;
  }

  return out as V2HyperedgeHash;
}

export function downgradeRelationToHyperedge(
  v2Hash: Partial<V2HyperedgeHash> | ReadonlyArray<Partial<V2HyperedgeHash>> | null,
): unknown {
  if (v2Hash == null) return null;
  if (Array.isArray(v2Hash)) {
    return v2Hash.map(downgradeRelationToHyperedge);
  }

  const v2 = v2Hash as V2HyperedgeHash;
  const out: {
    comprehensive: { source?: string; id?: string };
    parts: Array<{ source?: string; id?: string }>;
    enumeration: string;
  } = {
    comprehensive: { ...(v2.comprehensive ?? {}) },
    parts: [],
    enumeration: '',
  };

  out.parts = (v2.partitives ?? []).map((m) => ({ ...(m.ref ?? {}) }));
  out.enumeration = _downgradeCompleteness(v2.completeness);

  return out;
}

function _migrateEnumeration(value: string | undefined): string {
  if (value === 'open') return 'partial';
  if (value === 'closed') return 'complete';
  if (value == null) return 'complete';
  return 'complete';
}

function _downgradeCompleteness(value: string | undefined): string {
  if (value === 'partial') return 'open';
  return 'closed';
}
