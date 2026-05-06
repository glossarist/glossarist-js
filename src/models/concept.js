import { GlossaristModel } from './base.js';
import { LocalizedConcept } from './localized-concept.js';
import { RelatedConcept } from './related-concept.js';
import { ConceptDate } from './concept-date.js';
import { ConceptSource } from './concept-source.js';

export class Concept extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.id = String(data.id ?? data.termid ?? '');
    this.term = data.term ?? null;
    this._rawLocalizations = data.localizations ?? {};
    this._cache = {};

    this.relatedConcepts = _mapInstances(data.relatedConcepts ?? data.related_concepts ?? [], RelatedConcept);
    this.dates = _mapInstances(data.dates ?? [], ConceptDate);
    this.sources = _mapInstances(data.sources ?? [], ConceptSource);
    this.status = data.status ?? null;
    this.raw = data.raw ?? null;
  }

  get termid() { return this.id; }

  get languages() {
    return Object.keys(this._rawLocalizations);
  }

  get localizations() {
    return this._rawLocalizations;
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

  toJSON() {
    const obj = { id: this.id };
    if (this.term != null) obj.term = this.term;

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
      obj.relatedConcepts = this.relatedConcepts.map(rc => rc.toJSON());
    }
    if (this.dates.length > 0) {
      obj.dates = this.dates.map(d => d.toJSON());
    }
    if (this.sources.length > 0) {
      obj.sources = this.sources.map(s => s.toJSON());
    }
    if (this.status != null) obj.status = this.status;
    return obj;
  }

  static fromJSON(data) {
    return new Concept(data);
  }
}

function _mapInstances(arr, Cls) {
  return arr.map(item => item instanceof Cls ? item : new Cls(item));
}
