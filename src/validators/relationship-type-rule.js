import { ValidationRule } from './validation-rule.js';
import { RELATIONSHIP_TYPES } from '../models/related-concept.js';
import { DESIGNATION_RELATIONSHIP_TYPES } from '../models/designation-relationship.js';

const KNOWN_CONCEPT_TYPES = new Set(RELATIONSHIP_TYPES);
const KNOWN_DESIGNATION_TYPES = new Set(DESIGNATION_RELATIONSHIP_TYPES);

export class RelationshipTypeRule extends ValidationRule {
  constructor() { super('relationship-type', 'warning'); }

  validate(value, path) {
    const errors = [];
    this._checkRelated(value.related, `${path}related`, KNOWN_CONCEPT_TYPES, errors);

    if (value.localizations) {
      for (const [lang, lc] of Object.entries(value.localizations)) {
        this._checkRelated(lc.related, `${path}localizations.${lang}.related`, KNOWN_CONCEPT_TYPES, errors);

        if (lc.terms) {
          for (let ti = 0; ti < lc.terms.length; ti++) {
            this._checkRelated(lc.terms[ti]?.related,
              `${path}localizations.${lang}.terms[${ti}].related`, KNOWN_DESIGNATION_TYPES, errors);
          }
        }
      }
    }
    return errors;
  }

  _checkRelated(arr, basePath, knownTypes, errors) {
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) {
      const type = arr[i]?.type;
      if (type && !knownTypes.has(type)) {
        errors.push(...this.error(`${basePath}[${i}].type`,
          `Unknown relationship type '${type}'`));
      }
    }
  }
}
