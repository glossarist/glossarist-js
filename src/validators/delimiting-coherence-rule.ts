// @ts-nocheck — TEMPORARY during TS migration. TODO(Phase 2e): remove and type fully.
// Validates delimiting coherence across a concept's PartitiveRelations
// per ISO 704:2022.
//
// ISO 704:2022 (§5.5.4.2.1, rake diagram semantics):
//   "Whether a part is delimiting depends on the concept system, the
//    coordinate concepts, the inheritance principle, and the criterion
//    of subdivision used."
//
// This rule surfaces three categories of issues that the model
// constructor cannot catch (they're cross-relation, not per-instance):
//
//   1. WARNING: A PartitiveHyperedge where every partitive is
//      is_delimiting=true overuses delimiting. Typically only some
//      parts distinguish the comprehensive from coordinate concepts.
//   2. ERROR: Two PartitiveRelations on the same concept with the
//      same criterion but different is_delimiting for the same
//      partitive ref — inconsistent delimiting claim about the same
//      part. ISO 704 requires delimiting claims about a given part to
//      be consistent across decompositions sharing a criterion.
//   3. WARNING: A partitive marked is_delimiting=true on a relation
//      with no criterion set. Delimiting is meaningful only relative
//      to a subdivision criterion.
//
// Per TODO.partitive-relation-v3/06.

import { ValidationRule } from './validation-rule.js';
import { refKey, criterionKey } from './ref-keys.js';

export class DelimitingCoherenceRule extends ValidationRule {
  constructor() { super('delimiting-coherence'); }

  validate(concept, path, result) {
    const relations = concept.relations ?? [];
    if (relations.length === 0) return;

    _checkOveruse(relations, path, result);
    _checkInconsistentAcrossRelations(relations, path, result, this);
    _checkDelimitingWithoutCriterion(relations, path, result);
  }
}

function _checkOveruse(relations, path, result) {
  for (let i = 0; i < relations.length; i++) {
    const rel = relations[i];
    const members = rel?.partitives ?? [];
    if (members.length < 2) continue;
    const delimitingCount = members.filter(m => m?.is_delimiting === true).length;
    if (delimitingCount === members.length) {
      result.addWarning(
        `${path}partitiveRelations[${i}]`,
        `every partitive is marked is_delimiting=true; typically only ` +
        `some parts distinguish the comprehensive from coordinate concepts`,
      );
    }
  }
}

function _checkInconsistentAcrossRelations(relations, path, result, rule) {
  const byCriterion = new Map();
  for (let i = 0; i < relations.length; i++) {
    const rel = relations[i];
    const critKey = criterionKey(rel?.criterion);
    if (critKey == null) continue;
    if (!byCriterion.has(critKey)) byCriterion.set(critKey, []);
    byCriterion.get(critKey).push({ rel, i });
  }

  for (const [, group] of byCriterion) {
    const refDelimiting = new Map();
    for (const { rel, i } of group) {
      for (const m of rel?.partitives ?? []) {
        const key = refKey(m?.ref);
        if (key == null) continue;
        const delimiting = m?.is_delimiting === true;
        const existing = refDelimiting.get(key);
        if (existing != null && existing.delimiting !== delimiting) {
          rule.addIssue(result,
            `${path}partitiveRelations[${i}].partitives`,
            `inconsistent is_delimiting for ref (${key}) across ` +
            `relations ${existing.relIdx} and ${i} with the same ` +
            `criterion; ISO 704 requires delimiting claims about the ` +
            `same part to be consistent`,
          );
        } else if (existing == null) {
          refDelimiting.set(key, { delimiting, relIdx: i });
        }
      }
    }
  }
}

function _checkDelimitingWithoutCriterion(relations, path, result) {
  for (let i = 0; i < relations.length; i++) {
    const rel = relations[i];
    if (rel?.criterion) continue;
    const anyDelimiting = (rel?.partitives ?? []).some(m => m?.is_delimiting === true);
    if (anyDelimiting) {
      result.addWarning(
        `${path}partitiveRelations[${i}].criterion`,
        `relation has is_delimiting=true on partitives but no criterion; ` +
        `delimiting is meaningful only relative to a subdivision criterion`,
      );
    }
  }
}
