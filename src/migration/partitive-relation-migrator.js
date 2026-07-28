// v1 → v2 PartitiveRelation migration.
//
// Pure function: takes a v1 PartitiveHyperedge hash, returns a v2
// PartitiveRelation hash. Idempotent. Used by the parser when loading
// legacy YAML; available as a public API for one-shot dataset migrations.
//
// Field mapping (per TODO.partitive-relation-v2 items 01–05 and the
// ISO 704:2022 correction):
//
//   comprehensive      → comprehensive     (unchanged shape)
//   parts: [ref, ...]  → partitives: [{ ref, presence: 'required', count: 'exactly_one' }, ...]
//   enumeration: open  → completeness: partial
//   enumeration: closed→ completeness: complete
//   markers: [...]     → (dropped — v2 uses per-member multiplicity
//                          + is_delimiting; v1 markers encoded the
//                          same information imprecisely and cannot
//                          round-trip losslessly)
//   content: "..."     → (dropped — structural edges carry no prose)
//
// Cardinality check: v1 allowed [1..*] parts; v2 requires [2..*].
// A v1 hyperedge with exactly 1 part cannot migrate to v2 and is
// returned with a `migrationWarning` field set so callers can decide
// whether to surface it (the parser drops these with a warning).
//
// ─── Migration decision table (v1 markers → v2 multiplicity) ──────
//
// v1 markers encoded per-relation plurality claims. v2 multiplicity
// is per-member. The mapping is lossy; reviewers must set per-member
// multiplicity individually after migration.
//
//   | v1 markers              | Likely multiplicity for each partitive         | Notes                                                  |
//   |-------------------------|------------------------------------------------|--------------------------------------------------------|
//   | (none)                  | `compulsory`                                   | Default; reviewer confirms                             |
//   | `[double]`              | `compulsory_multiple` or `compulsory_at_least_one` | Reviewer distinguishes "all required" from "≥1 required" |
//   | `[dashed]`              | `optional` or `optional_multiple`              | Reviewer distinguishes single vs multiple              |
//   | `[double, dashed]`      | `optional_multiple` or `compulsory_at_least_one` | Plurality claim; reviewer distinguishes uncertain vs required |
//   | (single-part v1 edge)   | (cannot migrate — needs ≥2 partitives)         | Convert to a binary `has_part` edge                    |
//
// `is_delimiting` is NEVER set by migration. ISO 704:2022 says
// delimiting depends on the concept system and coordinate concepts,
// which migration cannot infer. Reviewer sets it based on domain
// knowledge (see DelimitingCoherenceRule for cross-relation checks).

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
    presence: 'required',
    count: 'exactly_one',
  }));

  out.completeness = _migrateEnumeration(v1Hash.enumeration);

  // v1 content + markers fields are dropped per TODO.partitive-relation-v2.
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

  if (Array.isArray(v1Hash.markers) && v1Hash.markers.length > 0) {
    out.migrationWarning = (out.migrationWarning ?? '') +
      ` v1 'markers' field (${v1Hash.markers.join(', ')}) was dropped; ` +
      `v2 uses per-member 'multiplicity' + 'is_delimiting'. Reviewer ` +
      `should set these per partitive based on ISO 704:2022 notation.`;
  }

  return out;
}

// Inverse — v2 → v1 — exists only for tooling that must round-trip
// through v1 consumers. NOT used by the parser; the serializer emits
// v2 only. Lossy: drops criterion, multiplicity, is_delimiting.
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

  // criterion, multiplicity, is_delimiting have no v1 equivalent —
  // dropped silently.

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
