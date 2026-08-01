import { ValidationRule } from './validation-rule.js';
import type { Concept } from '../models/concept.js';
import type { ValidationResult } from './validation-result.js';
import { refKey, criterionKey } from './ref-keys.js';

interface ConceptRefShape { source?: string; id?: string }
interface PartitiveMember { ref?: ConceptRefShape | null; is_delimiting?: boolean }
interface PartitiveRelation {
  partitives?: ReadonlyArray<PartitiveMember>;
  criterion?: Record<string, unknown> | null;
}

export class DelimitingCoherenceRule extends ValidationRule {
  constructor() { super('delimiting-coherence'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const relations = concept.relations ?? [];
    if (relations.length === 0) return;

    _checkOveruse(relations as readonly unknown[] as readonly PartitiveRelation[], path, result);
    _checkInconsistentAcrossRelations(relations as readonly unknown[] as readonly PartitiveRelation[], path, result, this);
    _checkDelimitingWithoutCriterion(relations as readonly unknown[] as readonly PartitiveRelation[], path, result);
  }
}

function _checkOveruse(relations: ReadonlyArray<PartitiveRelation>, path: string, result: ValidationResult) {
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

function _checkInconsistentAcrossRelations(relations: ReadonlyArray<PartitiveRelation>, path: string, result: ValidationResult, rule: DelimitingCoherenceRule) {
  const byCriterion = new Map<string, Array<{ rel: PartitiveRelation; i: number }>>();
  for (let i = 0; i < relations.length; i++) {
    const rel = relations[i];
    const critKey = criterionKey(rel?.criterion ?? null);
    if (critKey == null) continue;
    if (!byCriterion.has(critKey)) byCriterion.set(critKey, []);
    byCriterion.get(critKey)!.push({ rel: rel!, i });
  }

  for (const [, group] of byCriterion) {
    const refDelimiting = new Map<string, { delimiting: boolean; relIdx: number }>();
    for (const { rel, i } of group) {
      for (const m of rel?.partitives ?? []) {
        const key = refKey(m?.ref ?? null);
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

function _checkDelimitingWithoutCriterion(relations: ReadonlyArray<PartitiveRelation>, path: string, result: ValidationResult) {
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
