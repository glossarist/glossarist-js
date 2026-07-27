// Validates PartitiveRelation coherence per ISO 704 / ISO 12620.
//
// Checks (per TODO.partitive-relation-v2 item 13):
//   1. ERROR: each relation has ≥2 partitives (ISO 704 "two or more")
//   2. ERROR: no two relations on the same concept share the same
//      comprehensive + same criterion (duplicate decomposition —
//      violates ISO 12620 coordinate-concept coherence)
//   3. WARNING: a concept with multiple relations where any relation
//      lacks criterion (cannot verify distinctness from siblings)
//   4. WARNING: a TypeSharedPlurality with is_uncertain=true but
//      is_shared=false (semantically odd — broken line qualifies
//      the close-set double line; without `double`, what's being
//      qualified?)
//
// Lives in the validator framework, not the model constructor, per
// invariant I8 (TODO.hyperedges-v2/00). Constructors enforce type-shape;
// validators enforce semantics.

import { ValidationRule } from './validation-rule.js';
import { refKey, criterionKey } from './ref-keys.js';

export class PartitiveRelationCoherenceRule extends ValidationRule {
  constructor() { super('partitive-relation-coherence'); }

  validate(concept, path, result) {
    const relations = concept.partitiveRelations ?? concept.partitiveHyperedges ?? [];
    if (relations.length === 0) return;

    // Check 1: ≥2 partitives per relation. (The constructor also
    // rejects this, but a warning here surfaces it in the result
    // bundle for CI visibility.)
    for (let i = 0; i < relations.length; i++) {
      const partitiveCount = (relations[i]?.partitives ?? []).length;
      if (partitiveCount < 2) {
        this.addIssue(result,
          `${path}partitiveRelations[${i}].partitives`,
          `PartitiveRelation ${i + 1} has ${partitiveCount} partitive(s); ` +
          `ISO 704 requires ≥2 (use a binary has_part edge for pairwise facts)`,
        );
      }
    }

    // Check 2: no duplicate (comprehensive + criterion) on the same concept.
    const seen = new Map();
    for (let i = 0; i < relations.length; i++) {
      const rel = relations[i];
      const compKey = refKey(rel?.comprehensive);
      const critKey = criterionKey(rel?.criterion);
      if (compKey == null || critKey == null) continue;
      const key = `${compKey}|${critKey}`;
      if (seen.has(key)) {
        this.addIssue(result,
          `${path}partitiveRelations[${i}]`,
          `duplicate PartitiveRelation (same comprehensive + same criterion ` +
          `as relation ${seen.get(key) + 1}); violates ISO 12620 coordinate-concept coherence`,
        );
      } else {
        seen.set(key, i);
      }
    }

    // Check 3: criterion documentation (warning) when concept has multiple relations.
    if (relations.length > 1) {
      for (let i = 0; i < relations.length; i++) {
        if (!relations[i]?.criterion) {
          result.addWarning(
            `${path}partitiveRelations[${i}].criterion`,
            `concept has multiple PartitiveRelations but relation ${i + 1} ` +
            `has no criterion; cannot verify distinctness from siblings`,
          );
        }
      }
    }

    // (Check 4 — plurality coherence — removed. The prior plurality
    // block was based on a misreading of ISO 704; the corrected model
    // uses per-member multiplicity + is_delimiting, which are validated
    // at construction by PartitiveMember itself.)
  }
}
