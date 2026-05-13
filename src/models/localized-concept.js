import { GlossaristModel } from './base.js';
import { Designation } from './designation.js';
import { DetailedDefinition } from './detailed-definition.js';
import { ConceptSource } from './concept-source.js';

export class LocalizedConcept extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.languageCode = data.language_code ?? data.languageCode ?? null;
    this._rawTerms = data.terms ?? [];
    this._rawDefinition = data.definition ?? [];
    this._rawSources = data.sources ?? [];
    this.notes = data.notes ?? [];
    this.examples = data.examples ?? [];
    this.entryStatus = data.entry_status ?? data.entryStatus ?? null;
    this.reviewType = data.review_type ?? data.reviewType ?? null;
    this.classification = data.classification ?? null;
    this.domain = data.domain ?? null;

    this._terms = null;
    this._definitions = null;
    this._sources = null;
  }

  get terms() {
    if (this._terms === null) {
      this._terms = this._rawTerms.map(t => Designation.fromData(t));
    }
    return this._terms;
  }

  get definitions() {
    if (this._definitions === null) {
      this._definitions = this._rawDefinition.map(
        d => d instanceof DetailedDefinition ? d : new DetailedDefinition(d)
      );
    }
    return this._definitions;
  }

  get definition() {
    return this.definitions;
  }

  get sources() {
    if (this._sources === null) {
      this._sources = this._rawSources.map(
        s => s instanceof ConceptSource ? s : new ConceptSource(s)
      );
    }
    return this._sources;
  }

  get primaryDesignation() {
    return this.terms[0]?.designation ?? null;
  }

  get primaryDefinition() {
    return this.definitions[0]?.content ?? null;
  }

  toJSON() {
    const obj = {};
    if (this.languageCode) obj.language_code = this.languageCode;

    const terms = this._terms ?? this._rawTerms;
    if (terms.length > 0) {
      obj.terms = terms.map(t => (typeof t.toJSON === 'function') ? t.toJSON() : t);
    }

    const defs = this._definitions ?? (this._rawDefinition.length > 0 ? this._rawDefinition : []);
    if (defs.length > 0) {
      obj.definition = defs.map(d => (typeof d.toJSON === 'function') ? d.toJSON() : d);
    }

    if (this.notes.length > 0) obj.notes = this.notes;
    if (this.examples.length > 0) obj.examples = this.examples;

    const sources = this._sources ?? (this._rawSources.length > 0 ? this._rawSources : []);
    if (sources.length > 0) {
      obj.sources = sources.map(s => (typeof s.toJSON === 'function') ? s.toJSON() : s);
    }

    if (this.entryStatus != null) obj.entry_status = this.entryStatus;
    if (this.reviewType != null) obj.review_type = this.reviewType;
    if (this.classification != null) obj.classification = this.classification;
    if (this.domain != null) obj.domain = this.domain;
    return obj;
  }

  static fromJSON(data) {
    return new LocalizedConcept(data);
  }
}
