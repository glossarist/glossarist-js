// Warns when binary `has_part` / `is_part_of` edges duplicate
// PartitiveRelation members, or when a concept has many binary
// has_part edges that should be consolidated into a PartitiveRelation.
//
// Per TODO.partitive-relation-v2 item 14, binary edges and
// PartitiveRelations coexist by design. The asymmetry is pragmatic:
// binary edges are compact for single pairwise facts; relations
// carry completeness/plurality/criterion metadata. The redundancy
// case (same fact encoded both ways) is harmless data-wise but
// wasteful and should be flagged for migration.
//
// Severity: warning. Never blocks save.

import { ValidationRule } from './validation-rule.js';

const BINARY_HAS_PART_TYPES = new Set(['has_part', 'is_part_of']);

export class BinaryHasPartRedundancyRule extends ValidationRule {
  constructor() { super('binary-has-part-redundancy', 'warning'); }

  validate(concept, path, result) {
    const relations = concept.partitiveRelations ?? concept.partitiveHyperedges ?? [];

    // Collect partitive refs from PartitiveRelations.
    const relationTargets = new Set();
    for (const rel of relations) {
      const compKey = _refKey(rel?.comprehensive);
      const members = rel?.partitives ?? rel?.parts ?? [];
      for (const member of members) {
        const ref = member?.ref ?? member;
        const key = _refKey(ref);
        if (key && key !== compKey) relationTargets.add(key);
      }
    }

    // Collect binary has_part refs.
    const binaryTargets = new Set();
    const related = concept.relatedConcepts ?? [];
    for (const rc of related) {
      if (!BINARY_HAS_PART_TYPES.has(rc.type)) continue;
      const key = _refKey(rc?.ref);
      if (key) binaryTargets.add(key);
    }

    // Redundancy: refs in both.
    for (const target of relationTargets) {
      if (binaryTargets.has(target)) {
        this.addIssue(result,
          `${path}relatedConcepts`,
          `binary has_part edge for (${target}) is redundant — already in a ` +
          `PartitiveRelation member; pick one encoding to avoid divergence`,
        );
      }
    }

    // Cluster: 3+ binary has_part edges suggests PartitiveRelation territory.
    if (binaryTargets.size >= 3) {
      this.addIssue(result,
        `${path}relatedConcepts`,
        `${binaryTargets.size} binary has_part edges on this concept; ` +
        `consider converting to a PartitiveRelation (which can carry ` +
        `completeness, plurality, and criterion metadata)`,
      );
    }
  }
}

function _refKey(ref) {
  if (!ref) return null;
  const source = ref.source ?? '';
  const id = ref.id ?? '';
  if (!source && !id) return null;
  return `${source}:${id}`;
}
