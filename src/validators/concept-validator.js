import { ValidationRule } from './validation-rule.js';
import { ValidationResult } from './validation-result.js';

const VALID_DESIGNATION_TYPES = new Set([
  'expression', 'abbreviation', 'symbol', 'graphical symbol', 'graphical_symbol',
]);

const VALID_ENTRY_STATUSES = new Set([
  'valid', 'draft', 'retired', 'notValid', 'superseded', 'withdrawn',
]);

const _langs = (c) =>
  c.languages ?? (c.localizations ? Object.keys(c.localizations) : []);

const _loc = (c, lang) =>
  typeof c.localization === 'function' ? c.localization(lang) : c.localizations?.[lang];

export class LanguageCodeRule extends ValidationRule {
  constructor() { super('language-code'); }
  validate(concept, path, result) {
    for (const lang of _langs(concept)) {
      if (!/^[a-z]{3}$/.test(lang)) {
        result.addError(`${path}localizations.${lang}`,
          `Invalid language code '${lang}': expected ISO 639-3 (3 lowercase letters)`);
      }
    }
  }
}

export class DesignationTypeRule extends ValidationRule {
  constructor() { super('designation-type'); }
  validate(concept, path, result) {
    for (const lang of _langs(concept)) {
      const lc = _loc(concept, lang);
      if (!lc) continue;
      const terms = lc.terms ?? [];
      for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        const type = t.type ?? (typeof t.toJSON === 'function' ? t.toJSON().type : undefined);
        if (type && !VALID_DESIGNATION_TYPES.has(type)) {
          result.addError(`${path}localizations.${lang}.terms[${i}].type`,
            `Unknown designation type '${type}'`);
        }
      }
    }
  }
}

export class EntryStatusRule extends ValidationRule {
  constructor() { super('entry-status'); }
  validate(concept, path, result) {
    for (const lang of _langs(concept)) {
      const lc = _loc(concept, lang);
      if (!lc) continue;
      const status = lc.entryStatus ?? lc.entry_status;
      if (status && !VALID_ENTRY_STATUSES.has(status)) {
        result.addError(`${path}localizations.${lang}.entry_status`,
          `Unknown entry status '${status}'`);
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
    const hasModelApi = typeof concept.localization === 'function';

    if (!concept.id) {
      result.addError('id', 'Concept must have an id');
    }

    const langs = hasModelApi ? concept.languages : Object.keys(concept.localizations ?? {});
    if (langs.length === 0) {
      result.addWarning('localizations', 'Concept must have at least one localization');
    } else if (hasModelApi) {
      for (const lang of langs) {
        const lc = concept.localization(lang);
        if (!lc || lc.terms.length === 0) {
          result.addWarning(`localizations.${lang}.terms`,
            `Localization '${lang}' must have at least one term`);
        }
      }
    } else {
      for (const [lang, lc] of Object.entries(concept.localizations ?? {})) {
        if (!lc.terms || lc.terms.length === 0) {
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
