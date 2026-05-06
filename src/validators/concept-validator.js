import { ValidationRule } from './validation-rule.js';
import { ValidationError } from './validation-error.js';

const VALID_DESIGNATION_TYPES = new Set([
  'expression', 'abbreviation', 'symbol', 'graphical symbol', 'graphical_symbol',
]);

const VALID_ENTRY_STATUSES = new Set([
  'valid', 'draft', 'retired', 'notValid', 'superseded', 'withdrawn',
]);

export class LanguageCodeRule extends ValidationRule {
  constructor() { super('language-code'); }
  validate(value, path) {
    if (!value.localizations) return [];
    const errors = [];
    for (const lang of Object.keys(value.localizations)) {
      if (!/^[a-z]{3}$/.test(lang)) {
        errors.push(...this.error(`${path}localizations.${lang}`,
          `Invalid language code '${lang}': expected ISO 639-3 (3 lowercase letters)`));
      }
    }
    return errors;
  }
}

export class DesignationTypeRule extends ValidationRule {
  constructor() { super('designation-type'); }
  validate(value, path) {
    if (!value.localizations) return [];
    const errors = [];
    for (const [lang, lc] of Object.entries(value.localizations)) {
      for (let i = 0; i < (lc.terms?.length ?? 0); i++) {
        const t = lc.terms[i];
        if (t.type && !VALID_DESIGNATION_TYPES.has(t.type)) {
          errors.push(...this.error(`${path}localizations.${lang}.terms[${i}].type`,
            `Unknown designation type '${t.type}'`));
        }
      }
    }
    return errors;
  }
}

export class EntryStatusRule extends ValidationRule {
  constructor() { super('entry-status'); }
  validate(value, path) {
    if (!value.localizations) return [];
    const errors = [];
    for (const [lang, lc] of Object.entries(value.localizations)) {
      if (lc.entry_status && !VALID_ENTRY_STATUSES.has(lc.entry_status)) {
        errors.push(...this.error(`${path}localizations.${lang}.entry_status`,
          `Unknown entry status '${lc.entry_status}'`));
      }
    }
    return errors;
  }
}

export class ConceptValidator {
  _rules = [];

  addRule(rule) {
    this._rules.push(rule);
    return this;
  }

  validate(concept) {
    const errors = [];
    const json = typeof concept.toJSON === 'function' ? concept.toJSON() : concept;

    if (!json.id) {
      errors.push(new ValidationError('id', 'Concept must have an id'));
    }
    if (!json.localizations || Object.keys(json.localizations).length === 0) {
      errors.push(new ValidationError('localizations',
        'Concept must have at least one localization', 'warning'));
    } else {
      for (const [lang, lc] of Object.entries(json.localizations)) {
        if (!lc.terms || lc.terms.length === 0) {
          errors.push(new ValidationError(
            `localizations.${lang}.terms`,
            `Localization '${lang}' must have at least one term`, 'warning'));
        }
      }
    }

    for (const rule of this._rules) {
      errors.push(...rule.validate(json, ''));
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning'),
    };
  }
}

export class RegisterValidator {
  validate(register) {
    const errors = [];
    if (!register || typeof register !== 'object') {
      errors.push(new ValidationError('', 'Register must be a non-null object'));
      return { valid: false, errors, warnings: [] };
    }
    if (!register.schema_version) {
      errors.push(new ValidationError('schema_version', 'Register must have a schema_version', 'warning'));
    }
    if (!register.shortname) {
      errors.push(new ValidationError('shortname', 'Register should have a shortname', 'warning'));
    }
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning'),
    };
  }
}
