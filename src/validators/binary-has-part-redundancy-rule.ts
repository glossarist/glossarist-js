// Warns when binary `has_part` / `is_part_of` edges duplicate
// PartitiveHyperedge members, or when a concept has many binary
// has_part edges that should be consolidated into a PartitiveHyperedge.
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
import type { Concept } from '../models/concept.js';
import type { ValidationResult } from './validation-result.js';
import { refKey } from './ref-keys.js';

interface PartitiveMemberShape { ref?: { source?: string; id?: string } | null }
interface PartitiveRelationShape {
  comprehensive?: { source?: string; id?: string } | null;
  partitives?: ReadonlyArray<PartitiveMemberShape>;
  parts?: ReadonlyArray<PartitiveMemberShape>;
}
interface RelatedConceptShape {
  type: string;
  ref?: { source?: string; id?: string } | null;
}

const BINARY_HAS_PART_TYPES = new Set(['has_part', 'is_part_of']);

export class BinaryHasPartRedundancyRule extends ValidationRule {
  constructor() { super('binary-has-part-redundancy', 'warning'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const relations = concept.relations ?? [];

    // Collect partitive refs from PartitiveRelations.
    const relationTargets = new Set<string>();
    for (const rel of relations as unknown as PartitiveRelationShape[]) {
      const compKey = refKey(rel?.comprehensive ?? null);
      const members = rel?.partitives ?? rel?.parts ?? [];
      for (const member of members) {
        const ref = (member?.ref ?? member ?? null) as { source?: string; id?: string } | null;
        const key = refKey(ref);
        if (key && key !== compKey) relationTargets.add(key);
      }
    }

    // Collect binary has_part refs.
    const binaryTargets = new Set<string>();
    const related = concept.relatedConcepts ?? [];
    for (const rc of related as unknown as RelatedConceptShape[]) {
      if (!BINARY_HAS_PART_TYPES.has(rc.type)) continue;
      const key = refKey((rc?.ref ?? null) as { source?: string; id?: string } | null);
      if (key) binaryTargets.add(key);
    }

    // Redundancy: refs in both.
    for (const target of relationTargets) {
      if (binaryTargets.has(target)) {
        this.addIssue(result,
          `${path}relatedConcepts`,
          `binary has_part edge for (${target}) is redundant — already in a ` +
          `PartitiveHyperedge member; pick one encoding to avoid divergence`,
        );
      }
    }

    // Cluster: 3+ binary has_part edges suggests PartitiveHyperedge territory.
    if (binaryTargets.size >= 3) {
      this.addIssue(result,
        `${path}relatedConcepts`,
        `${binaryTargets.size} binary has_part edges on this concept; ` +
        `consider converting to a PartitiveHyperedge (which can carry ` +
        `completeness, multiplicity, and criterion metadata)`,
      );
    }
  }
}
