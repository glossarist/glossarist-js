// v1 → v2 PartitiveRelation migration.
//
// Pure function: takes a v1 PartitiveHyperedge hash, returns a v2
// PartitiveRelation hash. Idempotent. Used by the parser when loading
// legacy YAML; available as a public API for one-shot dataset migrations.
//
// Field mapping (per TODO.partitive-relation-v2 items 01–05):
//
//   comprehensive      → comprehensive     (unchanged shape)
//   parts: [ref, ...]  → partitives: [{ ref, certainty: 'confirmed' }, ...]
//   enumeration: open  → completeness: partial
//   enumeration: closed→ completeness: complete
//   markers: [double]                 ┐
//   markers: [dashed]                 ├→ plurality: { is_shared, is_uncertain }
//   markers: [double, dashed]         ┘
//   content: "..."    → (dropped — structural edges carry no prose)
//
// Cardinality check: v1 allowed [1..*] parts; v2 requires [2..*].
// A v1 hyperedge with exactly 1 part cannot migrate to v2 and is
// returned with a `migrationWarning` field set so callers can decide
// whether to surface it (the parser drops these with a warning).

const MARKER_DOUBLE = 'double';
const MARKER_DASHED = 'dashed';

export function migrateHyperedgeToRelation(v1Hash) {
  if (v1Hash == null) return null;
  if (Array.isArray(v1Hash)) {
    return v1Hash.map(migrateHyperedgeToRelation);
  }

  const out = {
    comprehensive: { ...(v1Hash.comprehensive ?? {}) },
  };

  const parts = Array.isArray(v1Hash.parts) ? v1Hash.parts : [];
  out.partitives = parts.map(ref => ({
    ref: { ...ref },
    certainty: 'confirmed',
  }));

  out.completeness = _migrateEnumeration(v1Hash.enumeration);

  const plurality = _migrateMarkers(v1Hash.markers);
  if (plurality != null) out.plurality = plurality;

  // v1 content field is dropped per TODO.partitive-relation-v2 item 04.
  // Caller (parser) may surface this as a warning if the text matters.

  if (parts.length < 2) {
    out.migrationWarning =
      `v1 PartitiveHyperedge had ${parts.length} part(s); v2 requires ≥2. ` +
      `Either add more partitives or convert to a binary has_part edge.`;
  }

  if (v1Hash.content != null) {
    out.migrationWarning = (out.migrationWarning ?? '') +
      ` v1 'content' field was dropped (v2 PartitiveRelation carries no prose; ` +
      `move valuable text to the comprehensive concept's notes).`;
  }

  return out;
}

// Inverse — v2 → v1 — exists only for tooling that must round-trip
// through v1 consumers. NOT used by the parser; the serializer emits
// v2 only.
export function downgradeRelationToHyperedge(v2Hash) {
  if (v2Hash == null) return null;
  if (Array.isArray(v2Hash)) {
    return v2Hash.map(downgradeRelationToHyperedge);
  }

  const out = {
    comprehensive: { ...(v2Hash.comprehensive ?? {}) },
  };

  out.parts = (v2Hash.partitives ?? []).map(m => ({ ...(m.ref ?? {}) }));
  out.enumeration = _downgradeCompleteness(v2Hash.completeness);

  const markers = _downgradePlurality(v2Hash.plurality);
  if (markers.length > 0) out.markers = markers;

  // criterion has no v1 equivalent — dropped silently
  // per-member certainty has no v1 equivalent — dropped silently

  return out;
}

function _migrateEnumeration(value) {
  if (value === 'open') return 'partial';
  if (value === 'closed') return 'complete';
  if (value == null) return 'complete';
  // Unknown values default to complete (safe default — v2's safe default).
  return 'complete';
}

function _downgradeCompleteness(value) {
  if (value === 'partial') return 'open';
  return 'closed';
}

function _migrateMarkers(markers) {
  if (!Array.isArray(markers) || markers.length === 0) return null;

  const isShared = markers.includes(MARKER_DOUBLE);
  const isUncertain = markers.includes(MARKER_DASHED);

  // Per TODO.partitive-relation-v2 item 03 migration table:
  //   [dashed] alone is semantically odd (broken line qualifies
  //   plurality; without double, what's being qualified?). We
  //   migrate it to is_shared=false, is_uncertain=true and rely on
  //   the PartitiveRelationCoherenceRule to warn.
  if (!isShared && !isUncertain) return null;

  return { is_shared: isShared, is_uncertain: isUncertain };
}

function _downgradePlurality(plurality) {
  if (plurality == null) return [];
  const markers = [];
  if (plurality.is_shared) markers.push(MARKER_DOUBLE);
  if (plurality.is_uncertain) markers.push(MARKER_DASHED);
  return markers;
}
