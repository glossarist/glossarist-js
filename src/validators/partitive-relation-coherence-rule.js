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
      const compKey = _conceptRefKey(rel?.comprehensive);
      const critKey = _criterionKey(rel?.criterion);
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

    // Check 4: plurality coherence (warning).
    for (let i = 0; i < relations.length; i++) {
      const plural = relations[i]?.plurality;
      if (!plural) continue;
      if (plural.isUncertain && !plural.isShared) {
        result.addWarning(
          `${path}partitiveRelations[${i}].plurality`,
          `plurality has isUncertain=true without isShared=true (semantically odd: ` +
          `ISO 704 broken line qualifies the close-set double line plurality; ` +
          `without double, what is being qualified?)`,
        );
      }
    }
  }
}

function _conceptRefKey(ref) {
  if (!ref) return null;
  const source = ref.source ?? '';
  const id = ref.id ?? '';
  if (!source && !id) return null;
  return `${source}:${id}`;
}

function _criterionKey(criterion) {
  if (!criterion || typeof criterion !== 'object') return null;
  // Sort values for stable comparison regardless of language key order.
  const values = Object.values(criterion)
    .filter(v => typeof v === 'string')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .sort();
  return values.length > 0 ? values.join('|') : null;
}
