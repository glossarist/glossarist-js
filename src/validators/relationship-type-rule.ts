import { ValidationRule } from './validation-rule.js';
import type { Concept } from '../models/concept.js';
import type { ValidationResult } from './validation-result.js';
import { RELATIONSHIP_TYPES } from '../models/related-concept.js';
import { DESIGNATION_RELATIONSHIP_TYPES } from '../models/designation-relationship.js';

interface RelatedLike { type?: string }
interface TermLike { related?: ReadonlyArray<RelatedLike> }
interface LocalizationLike {
  related?: ReadonlyArray<RelatedLike>;
  terms: ReadonlyArray<TermLike>;
}
interface ConceptLike {
  relatedConcepts?: ReadonlyArray<RelatedLike>;
  related?: ReadonlyArray<RelatedLike>;
  languages: readonly string[];
  localization?: (lang: string) => LocalizationLike | null | undefined;
}

const KNOWN_CONCEPT_TYPES = new Set(RELATIONSHIP_TYPES);
const KNOWN_DESIGNATION_TYPES = new Set(DESIGNATION_RELATIONSHIP_TYPES);

export class RelationshipTypeRule extends ValidationRule {
  constructor() { super('relationship-type', 'warning'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const c = concept as unknown as ConceptLike;
    const related = c.relatedConcepts ?? c.related ?? [];
    this._checkRelated(related, `${path}related`, KNOWN_CONCEPT_TYPES, result);

    const langs = c.languages ?? [];
    for (const lang of langs) {
      const lc = c.localization?.(lang);
      if (!lc) continue;

      this._checkRelated(lc.related, `${path}localizations.${lang}.related`, KNOWN_CONCEPT_TYPES, result);

      for (let ti = 0; ti < lc.terms.length; ti++) {
        this._checkRelated(lc.terms[ti]?.related,
          `${path}localizations.${lang}.terms[${ti}].related`, KNOWN_DESIGNATION_TYPES, result);
      }
    }
  }

  _checkRelated(arr: ReadonlyArray<RelatedLike> | null | undefined, basePath: string, knownTypes: Set<string>, result: ValidationResult) {
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
