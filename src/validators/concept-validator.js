import { ValidationRule } from './validation-rule.js';
import { ValidationResult } from './validation-result.js';

const VALID_DESIGNATION_TYPES = new Set([
  'expression', 'abbreviation', 'symbol', 'graphical symbol', 'graphical_symbol',
]);

const VALID_ENTRY_STATUSES = new Set([
  'valid', 'draft', 'retired', 'notValid', 'superseded', 'withdrawn',
]);

export class LanguageCodeRule extends ValidationRule {
  constructor() { super('language-code'); }
  validate(concept, path, result) {
    for (const lang of concept.languages) {
      if (!/^[a-z]{3}$/.test(lang)) {
        this.addIssue(result,
          `${path}localizations.${lang}`,
          `Invalid language code '${lang}': expected ISO 639-3 (3 lowercase letters)`);
      }
    }
  }
}

export class DesignationTypeRule extends ValidationRule {
  constructor() { super('designation-type'); }
  validate(concept, path, result) {
    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (!lc) continue;
      for (let i = 0; i < lc.terms.length; i++) {
        const type = lc.terms[i].type;
        if (type && !VALID_DESIGNATION_TYPES.has(type)) {
          this.addIssue(result,
            `${path}localizations.${lang}.terms[${i}].type`,
            `Unknown designation type '${type}'`);
        }
      }
    }
  }
}

export class EntryStatusRule extends ValidationRule {
  constructor() { super('entry-status'); }
  validate(concept, path, result) {
    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (!lc) continue;
      if (lc.entryStatus && !VALID_ENTRY_STATUSES.has(lc.entryStatus)) {
        this.addIssue(result,
          `${path}localizations.${lang}.entry_status`,
          `Unknown entry status '${lc.entryStatus}'`);
      }
    }
  }
}

export class ConceptValidator {
  _rules = [];

  addRule(rule) {
    this._rules.push(rule);
    return this;
  }

  validate(concept) {
    const result = new ValidationResult();

    if (!concept.id) {
      result.addError('id', 'Concept must have an id');
    }

    if (concept.languages.length === 0) {
      result.addWarning('localizations', 'Concept must have at least one localization');
    } else {
      for (const lang of concept.languages) {
        const lc = concept.localization(lang);
        if (!lc || lc.terms.length === 0) {
          result.addWarning(`localizations.${lang}.terms`,
            `Localization '${lang}' must have at least one term`);
        }
      }
    }

    for (const rule of this._rules) {
      rule.validate(concept, '', result);
    }

    return result;
  }
}
