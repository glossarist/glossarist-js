import { ValidationRule } from './validation-rule.js';

/**
 * GLS-305: Enforces Citation#ref is a proper Citation.Ref object
 * and RelatedConcept#ref has at least source or id.
 */
export class RefShapeRule extends ValidationRule {
  constructor() { super('ref-shape'); }

  validate(value, path) {
    const errors = [];

    // Check sources in localizations
    const localizations = value.localizations || {};
    let sourceIdx = 0;
    for (const [lang, lc] of Object.entries(localizations)) {
      const sources = lc.sources || [];
      for (let i = 0; i < sources.length; i++) {
        sourceIdx++;
        const origin = sources[i].origin;
        if (!origin) continue;

        const ref = origin.ref;
        if (!ref) {
          errors.push(...this.error(
            `${path}localizations.${lang}.sources[${i}].origin.ref`,
            `source ${sourceIdx} origin has nil ref (expected Citation.Ref hash)`,
          ));
        } else if (!ref.source && !ref.id) {
          errors.push(...this.error(
            `${path}localizations.${lang}.sources[${i}].origin.ref`,
            `source ${sourceIdx} origin.ref has neither source nor id`,
          ));
        }
      }
    }

    // Check related concepts
    const related = value.related || [];
    for (let i = 0; i < related.length; i++) {
      const ref = related[i].ref;
      if (!ref) continue;
      if (!ref.source && !ref.id) {
        errors.push(...this.error(
          `${path}related[${i}].ref`,
          `related concept ${i + 1} has empty ref (no source or id)`,
        ));
      }
    }

    return errors;
  }
}

/**
 * GLS-308: Locality must have type and reference_from when present.
 */
export class LocalityCompletenessRule extends ValidationRule {
  constructor() { super('locality-completeness', 'warning'); }

  validate(value, path) {
    const errors = [];
    const localizations = value.localizations || {};

    for (const [lang, lc] of Object.entries(localizations)) {
      const sources = lc.sources || [];
      for (let i = 0; i < sources.length; i++) {
        const origin = sources[i].origin;
        if (!origin || !origin.locality) continue;

        const loc = origin.locality;
        if (!loc.type) {
          errors.push(...this.error(
            `${path}localizations.${lang}.sources[${i}].origin.locality.type`,
            `source locality has no type`,
          ));
        }
        if (!loc.reference_from) {
          errors.push(...this.error(
            `${path}localizations.${lang}.sources[${i}].origin.locality.reference_from`,
            `source locality has no reference_from`,
          ));
        }
      }
    }

    return errors;
  }
}

/**
 * GLS-017: Localization map consistency.
 */
export class LocalizationConsistencyRule extends ValidationRule {
  constructor() { super('localization-consistency'); }

  validate(value, path) {
    const errors = [];
    const localizations = value.localizations || {};
    const data = value.raw?.data || value;

    const declaredLangs = data.localized_concepts
      ? Object.keys(data.localized_concepts)
      : Object.keys(localizations);

    for (const lang of declaredLangs) {
      if (!localizations[lang]) {
        errors.push(...this.error(
          `${path}localizations.${lang}`,
          `localized_concepts map has '${lang}' but no localization loaded`,
        ));
      }
    }

    return errors;
  }
}

/**
 * GLS-010: Schema version should be 3.
 */
export class SchemaVersionRule extends ValidationRule {
  constructor() { super('schema-version', 'warning'); }

  validate(value, path) {
    const errors = [];
    const version = value.schemaVersion || value.schema_version;

    if (version && String(version) !== '3') {
      errors.push(...this.error(
        `${path}schema_version`,
        `schema_version is '${version}', expected '3'`,
      ));
    }

    return errors;
  }
}

/**
 * GLS-309: Domain references need concept_id or urn.
 */
export class DomainRefRule extends ValidationRule {
  constructor() { super('domain-ref', 'warning'); }

  validate(value, path) {
    const errors = [];
    const domains = value.domains || [];

    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];
      if (!domain.concept_id && !domain.urn) {
        errors.push(...this.error(
          `${path}domains[${i}]`,
          `domain ${i + 1} has neither concept_id nor urn`,
        ));
      }
    }

    return errors;
  }
}

/**
 * GLS-016: UUID format validation.
 */
export class UuidFormatRule extends ValidationRule {
  constructor() { super('uuid-format'); }

  validate(value, path) {
    const errors = [];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const id = value.id || value.uuid;

    if (id && !UUID_RE.test(String(id))) {
      // Only flag if it looks like it's supposed to be a UUID
      if (String(id).includes('-') && String(id).length > 20) {
        errors.push(...this.error(
          `${path}id`,
          `concept ID '${id}' is not valid UUID format`,
        ));
      }
    }

    return errors;
  }
}

/**
 * GLS-310: URN format validation for sources.
 */
export class SourceUrnFormatRule extends ValidationRule {
  constructor() { super('source-urn-format', 'warning'); }

  validate(value, path) {
    const errors = [];
    const URN_RE = /^urn:[a-z0-9][a-z0-9-]{0,31}:[a-z0-9()+,\-.:=@;$_!*'%/?#]+$/i;

    const localizations = value.localizations || {};
    for (const [lang, lc] of Object.entries(localizations)) {
      const sources = lc.sources || [];
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i].origin?.ref?.source;
        if (!source || !source.startsWith('urn:')) continue;
        if (!URN_RE.test(source)) {
          errors.push(...this.error(
            `${path}localizations.${lang}.sources[${i}].origin.ref.source`,
            `malformed URN '${source}'`,
          ));
        }
      }
    }

    return errors;
  }
}
