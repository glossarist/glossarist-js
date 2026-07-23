// Warns when a concept expresses the same partitive relationship via
// BOTH a binary edge (broader_partitive / narrower_partitive /
// has_part / is_part_of) AND a PartitiveHyperedge part targeting the
// same concept. Round 1's decision (TODO.hyperedges/24) was "binary
// and hyperedge coexist, no automatic reconciliation." This rule is
// the detector for the resulting drift: pure warning, doesn't block
// save, just surfaces the duplication so the author can pick one
// encoding.
//
// See TODO.hyperedges-v2/21 for the design rationale.

import { ValidationRule } from './validation-rule.js';

const BINARY_PARTITIVE_TYPES = new Set([
  'broader_partitive', 'narrower_partitive',
  'has_part', 'is_part_of',
]);

export class PartitiveDriftRule extends ValidationRule {
  constructor() { super('partitive-drift', 'warning'); }

  validate(concept, path, result) {
    const hyperedgeTargets = new Set();
    for (const he of concept.partitiveHyperedges ?? []) {
      const comp = he.comprehensive;
      const compKey = `${comp?.source ?? ''}|${comp?.id ?? ''}`;
      for (const part of he.parts ?? []) {
        const key = `${part.source ?? ''}|${part.id ?? ''}`;
        if (key === '|' || key === compKey) continue;
        hyperedgeTargets.add(key);
      }
    }

    if (hyperedgeTargets.size === 0) return;

    const related = concept.relatedConcepts ?? [];
    for (let i = 0; i < related.length; i++) {
      const rc = related[i];
      if (!BINARY_PARTITIVE_TYPES.has(rc.type)) continue;
      const ref = rc.ref;
      const key = `${ref?.source ?? ''}|${ref?.id ?? ''}`;
      if (hyperedgeTargets.has(key)) {
        this.addIssue(result,
          `${path}relatedConcepts[${i}]`,
          `concept has both a binary '${rc.type}' edge and a ` +
          `PartitiveHyperedge part targeting (${ref?.source ?? '?'}, ` +
          `${ref?.id ?? '?'}); pick one encoding to avoid divergence`);
      }
    }
  }
}
