// Validates hyperedge coherence per ISO 704 / ISO 12620.
//
// Applies to every AbstractHyperedge subclass (PartitiveHyperedge,
// GenericHyperedge, future TemporalHyperedge / AssociativeHyperedge /
// SequentialHyperedge). The ISO 704 / ISO 12620 invariants are
// type-blind:
//
//   1. ERROR: each hyperedge has ≥2 members (ISO 704 "two or more")
//   2. ERROR: no two hyperedges of the same type on the same concept
//      share the same comprehensive + same criterion (duplicate
//      decomposition — violates ISO 12620 coordinate-concept coherence)
//   3. WARNING: a concept with multiple hyperedges of the same type
//      where any lacks criterion (cannot verify distinctness from
//      siblings)
//
// Lives in the validator framework, not the model constructor, per
// invariant I8 (TODO.hyperedges-v2/00). Constructors enforce type-shape;
// validators enforce semantics.
//
// Per TODO Phase 7: rule renamed from PartitiveRelationCoherenceRule
// to HyperedgeCoherenceRule. The rule applies to all hyperedges; the
// duplicate check is scoped per type so a Partitive and a Generic with
// the same comprehensive+criterion don't false-positive.

import { ValidationRule } from './validation-rule.js';
import { refKey, criterionKey } from './ref-keys.js';
import { AbstractHyperedge } from '../models/abstract-hyperedge.js';

export class HyperedgeCoherenceRule extends ValidationRule {
  constructor() { super('hyperedge-coherence'); }

  validate(concept, path, result) {
    const hyperedges = (concept.relations ?? []).filter(r => r instanceof AbstractHyperedge);
    if (hyperedges.length === 0) return;

    // Check 1: ≥2 members per hyperedge. (The constructor also
    // rejects this, but a warning here surfaces it in the result
    // bundle for CI visibility.)
    for (let i = 0; i < hyperedges.length; i++) {
      const memberCount = (hyperedges[i]?.members ?? []).length;
      if (memberCount < 2) {
        this.addIssue(result,
          `${path}relations[${i}].members`,
          `hyperedge ${i + 1} has ${memberCount} member(s); ` +
          `ISO 704 requires ≥2 (use a binary edge for pairwise facts)`,
        );
      }
    }

    // Check 2: no duplicate (type + comprehensive + criterion) on the same concept.
    // Scope by type so a Partitive and a Generic with the same comp+criterion
    // don't false-positive — they're different decompositions.
    const seen = new Map();
    for (let i = 0; i < hyperedges.length; i++) {
      const rel = hyperedges[i];
      const typeTag = rel?.constructor?.typeTag ?? '';
      const compKey = refKey(rel?.comprehensive);
      const critKey = criterionKey(rel?.criterion);
      if (compKey == null || critKey == null) continue;
      const key = `${typeTag}|${compKey}|${critKey}`;
      if (seen.has(key)) {
        this.addIssue(result,
          `${path}relations[${i}]`,
          `duplicate ${rel.constructor.name} (same comprehensive + same criterion ` +
          `as relation ${seen.get(key) + 1}); violates ISO 12620 coordinate-concept coherence`,
        );
      } else {
        seen.set(key, i);
      }
    }

    // Check 3: criterion documentation (warning) when concept has multiple
    // hyperedges of the same type. Same-type-scope rationale as Check 2.
    const byType = new Map();
    for (const rel of hyperedges) {
      const typeTag = rel?.constructor?.typeTag ?? '';
      if (!byType.has(typeTag)) byType.set(typeTag, []);
      byType.get(typeTag).push(rel);
    }
    for (const [typeTag, rels] of byType) {
      if (rels.length <= 1) continue;
      for (const rel of rels) {
        if (!rel.criterion) {
          const idx = hyperedges.indexOf(rel);
          result.addWarning(
            `${path}relations[${idx}].criterion`,
            `concept has multiple ${typeTag} hyperedges but this one ` +
            `has no criterion; cannot verify distinctness from siblings`,
          );
        }
      }
    }
  }
}

// Backward-compat alias. Existing imports of PartitiveRelationCoherenceRule
// continue to work; the rule is now type-blind.
export const PartitiveRelationCoherenceRule = HyperedgeCoherenceRule;
