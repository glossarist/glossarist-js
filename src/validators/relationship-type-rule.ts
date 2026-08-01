import { ValidationRule } from './validation-rule.js';
import type { Concept } from '../models/concept.js';
import type { ValidationResult } from './validation-result.js';
import { RELATIONSHIP_TYPES } from '../models/related-concept.js';
import { DESIGNATION_RELATIONSHIP_TYPES } from '../models/designation-relationship.js';

const KNOWN_CONCEPT_TYPES = new Set(RELATIONSHIP_TYPES);
const KNOWN_DESIGNATION_TYPES = new Set(DESIGNATION_RELATIONSHIP_TYPES);

export class RelationshipTypeRule extends ValidationRule {
  constructor() { super('relationship-type', 'warning'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const related = (concept as any).relatedConcepts ?? (concept as any).related ?? [];
    this._checkRelated(related, `${path}related`, KNOWN_CONCEPT_TYPES, result);

    const langs = concept.languages ?? [];
    for (const lang of langs) {
      const lc = concept.localization?.(lang);
      if (!lc) continue;

      this._checkRelated((lc as any).related, `${path}localizations.${lang}.related`, KNOWN_CONCEPT_TYPES, result);

      for (let ti = 0; ti < lc.terms.length; ti++) {
        this._checkRelated((lc.terms[ti] as any)?.related,
          `${path}localizations.${lang}.terms[${ti}].related`, KNOWN_DESIGNATION_TYPES, result);
      }
    }
  }

  _checkRelated(arr: ReadonlyArray<any> | null | undefined, basePath: string, knownTypes: Set<string>, result: ValidationResult) {
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) {
      const type = arr[i]?.type;
      if (type && !knownTypes.has(type)) {
        this.addIssue(result, `${basePath}[${i}].type`,
          `Unknown relationship type '${type}'`);
      }
    }
  }
}
