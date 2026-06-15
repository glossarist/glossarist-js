import { GlossaristModel } from './base.js';
import { LocalizedConcept } from './localized-concept.js';
import { RelatedConcept } from './related-concept.js';
import { ConceptReference } from './concept-reference.js';
import { ConceptDate } from './concept-date.js';
import { ConceptSource } from './concept-source.js';

export class Concept extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.id = String(data.id ?? data.termid ?? '');
    this.term = data.term ?? null;
    this.uri = data.uri ?? null;
    this._rawLocalizations = data.localizations ?? {};
    this._cache = {};

    this.relatedConcepts = _mapInstances(data.relatedConcepts ?? data.related ?? data.related_concepts ?? [], RelatedConcept);
    this.domains = _normalizeDomains(data.domains, data.groups);
    this.tags = Array.isArray(data.tags) ? [...data.tags] : [];
    this.dates = _mapInstances(data.dates ?? [], ConceptDate);
    this.sources = _mapInstances(data.sources ?? [], ConceptSource);
    this.status = data.status ?? null;
    this.schemaVersion = data.schemaVersion ?? data.schema_version ?? '3';
    this.raw = data.raw ?? null;
  }

  get termid() { return this.id; }

  get languages() {
    return Object.keys(this._rawLocalizations);
  }

  get languageCodes() {
    return this.languages;
  }

  localization(lang) {
    if (!(lang in this._rawLocalizations)) return undefined;
    if (!this._cache[lang]) {
      const raw = this._rawLocalizations[lang];
      this._cache[lang] = new LocalizedConcept({ ...raw, language_code: lang });
    }
    return this._cache[lang];
  }

  primaryDesignation(lang) {
    return this.localization(lang)?.primaryDesignation ?? null;
  }

  definition(lang) {
    return this.localization(lang)?.primaryDefinition ?? null;
  }

  setLocalization(lang, lc) {
    if (lc instanceof LocalizedConcept) {
      this._cache[lang] = lc;
      const json = lc.toJSON();
      delete json.language_code;
      this._rawLocalizations[lang] = json;
    } else {
      this._rawLocalizations[lang] = lc;
      delete this._cache[lang];
    }
    return this;
  }

  hasLocalization(lang) {
    return lang in this._rawLocalizations;
  }

  /**
   * Find a source by its local id within this concept.
   *
   * The lookup walks concept-level, localization-level, and
   * designation-level sources in that order, returning the first
   * source whose `id` matches. Sources without an `id` are
   * skipped. The id is local to the concept; uniqueness is
   * enforced by the validator (see CiteRefIntegrityRule).
   *
   * @param {string} id
   * @returns {ConceptSource | null}
   */
  findSourceById(id) {
    if (typeof id !== 'string' || id.length === 0) return null;

    // 1. Concept-level sources.
    for (const source of this.sources) {
      if (source.id === id) return source;
    }

    // 2. Localization-level sources.
    for (const lang of this.languages) {
      const lc = this.localization(lang);
      if (!lc) continue;
      for (const source of lc.sources) {
        if (source.id === id) return source;
      }

      // 3. Designation-level sources.
      for (const designation of lc.terms) {
        for (const source of designation.sources) {
          if (source.id === id) return source;
        }
      }
    }

    return null;
  }

  toJSON() {
    const obj = { id: this.id };
    if (this.term != null) obj.term = this.term;
    if (this.uri != null) obj.uri = this.uri;

    if (Object.keys(this._rawLocalizations).length > 0) {
      obj.localizations = {};
      for (const lang of this.languages) {
        const lc = this.localization(lang);
        if (lc) {
          const json = lc.toJSON();
          delete json.language_code;
          obj.localizations[lang] = json;
        }
      }
    } else {
      obj.localizations = {};
    }

    if (this.relatedConcepts.length > 0) {
      obj.related = this.relatedConcepts.map(rc => rc.toJSON());
    }
    if (this.domains.length > 0) {
      obj.domains = this.domains.map(d => d.toJSON());
    }
    if (this.tags.length > 0) {
      obj.tags = [...this.tags];
    }
    if (this.dates.length > 0) {
      obj.dates = this.dates.map(d => d.toJSON());
    }
    if (this.sources.length > 0) {
      obj.sources = this.sources.map(s => s.toJSON());
    }
    if (this.status != null) obj.status = this.status;
    obj.schema_version = this.schemaVersion;
    return obj;
  }

  static fromJSON(data) {
    return new Concept(data);
  }
}

function _mapInstances(arr, Cls) {
  return arr.map(item => item instanceof Cls ? item : new Cls(item));
}

function _normalizeDomains(domains, groups) {
  if (domains) {
    return domains.map(d => d instanceof ConceptReference ? d : new ConceptReference(d));
  }
  if (groups) {
    return groups.map(g => typeof g === 'string'
      ? ConceptReference.domain(g)
      : new ConceptReference(g));
  }
  return [];
}
