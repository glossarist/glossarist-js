import { GlossaristModel } from './base.js';
import { Designation } from './designation.js';
import { DetailedDefinition } from './detailed-definition.js';
import { ConceptSource } from './concept-source.js';
import { ConceptDate } from './concept-date.js';
import { NonVerbRep } from './non-verb-rep.js';
import { RelatedConcept } from './related-concept.js';

export class LocalizedConcept extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.languageCode = data.language_code ?? data.languageCode ?? null;
    this.script = data.script ?? null;
    this.system = data.system ?? null;
    this.entryStatus = data.entry_status ?? data.entryStatus ?? null;
    this.classification = data.classification ?? null;
    this.reviewType = data.review_type ?? data.reviewType ?? null;
    this.domain = data.domain ?? null;
    this.release = data.release ?? null;
    this.lineageSourceSimilarity = data.lineage_source_similarity ?? data.lineageSourceSimilarity ?? null;

    this.reviewDate = data.review_date ?? data.reviewDate ?? null;
    this.reviewDecisionDate = data.review_decision_date ?? data.reviewDecisionDate ?? null;
    this.reviewDecisionEvent = data.review_decision_event ?? data.reviewDecisionEvent ?? null;
    this.reviewStatus = data.review_status ?? data.reviewStatus ?? null;
    this.reviewDecision = data.review_decision ?? data.reviewDecision ?? null;
    this.reviewDecisionNotes = data.review_decision_notes ?? data.reviewDecisionNotes ?? null;

    this._rawTerms = data.terms ?? [];
    this._rawDefinition = data.definition ?? [];
    this._rawSources = data.sources ?? [];
    this._rawNotes = data.notes ?? [];
    this._rawExamples = data.examples ?? [];
    this._rawDates = data.dates ?? [];
    this._rawNonVerbal = data.non_verbal_rep ?? data.non_verb ?? [];
    this._rawRelated = data.related ?? [];

    this._terms = null;
    this._definitions = null;
    this._sources = null;
    this._notes = null;
    this._examples = null;
    this._dates = null;
    this._nonVerbal = null;
    this._related = null;
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

  get notes() {
    if (this._notes === null) {
      this._notes = this._rawNotes.map(
        n => n instanceof DetailedDefinition ? n : new DetailedDefinition(n)
      );
    }
    return this._notes;
  }

  get examples() {
    if (this._examples === null) {
      this._examples = this._rawExamples.map(
        e => e instanceof DetailedDefinition ? e : new DetailedDefinition(e)
      );
    }
    return this._examples;
  }

  get dates() {
    if (this._dates === null) {
      this._dates = this._rawDates.map(
        d => d instanceof ConceptDate ? d : new ConceptDate(d)
      );
    }
    return this._dates;
  }

  get nonVerbalRep() {
    if (this._nonVerbal === null) {
      this._nonVerbal = this._rawNonVerbal.map(
        n => n instanceof NonVerbRep ? n : new NonVerbRep(n)
      );
    }
    return this._nonVerbal;
  }

  get related() {
    if (this._related === null) {
      this._related = this._rawRelated.map(
        r => r instanceof RelatedConcept ? r : new RelatedConcept(r)
      );
    }
    return this._related;
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
    if (this.script) obj.script = this.script;
    if (this.system) obj.system = this.system;
    if (this.entryStatus) obj.entry_status = this.entryStatus;
    if (this.classification) obj.classification = this.classification;
    if (this.reviewType) obj.review_type = this.reviewType;
    if (this.domain) obj.domain = this.domain;
    if (this.release) obj.release = this.release;
    if (this.lineageSourceSimilarity != null) obj.lineage_source_similarity = this.lineageSourceSimilarity;

    if (this.reviewDate) obj.review_date = this.reviewDate;
    if (this.reviewDecisionDate) obj.review_decision_date = this.reviewDecisionDate;
    if (this.reviewDecisionEvent) obj.review_decision_event = this.reviewDecisionEvent;
    if (this.reviewStatus) obj.review_status = this.reviewStatus;
    if (this.reviewDecision) obj.review_decision = this.reviewDecision;
    if (this.reviewDecisionNotes) obj.review_decision_notes = this.reviewDecisionNotes;

    const terms = this._terms ?? this._rawTerms;
    if (terms.length > 0) {
      obj.terms = terms.map(t => (typeof t.toJSON === 'function') ? t.toJSON() : t);
    }

    const defs = this._definitions ?? (this._rawDefinition.length > 0 ? this._rawDefinition : []);
    if (defs.length > 0) {
      obj.definition = defs.map(d => (typeof d.toJSON === 'function') ? d.toJSON() : d);
    }

    const notes = this._notes ?? (this._rawNotes.length > 0 ? this._rawNotes : []);
    if (notes.length > 0) {
      obj.notes = notes.map(n => (typeof n.toJSON === 'function') ? n.toJSON() : n);
    }

    const examples = this._examples ?? (this._rawExamples.length > 0 ? this._rawExamples : []);
    if (examples.length > 0) {
      obj.examples = examples.map(e => (typeof e.toJSON === 'function') ? e.toJSON() : e);
    }

    const sources = this._sources ?? (this._rawSources.length > 0 ? this._rawSources : []);
    if (sources.length > 0) {
      obj.sources = sources.map(s => (typeof s.toJSON === 'function') ? s.toJSON() : s);
    }

    const dates = this._dates ?? (this._rawDates.length > 0 ? this._rawDates : []);
    if (dates.length > 0) {
      obj.dates = dates.map(d => (typeof d.toJSON === 'function') ? d.toJSON() : d);
    }

    const nonVerbal = this._nonVerbal ?? (this._rawNonVerbal.length > 0 ? this._rawNonVerbal : []);
    if (nonVerbal.length > 0) {
      obj.non_verbal_rep = nonVerbal.map(n => (typeof n.toJSON === 'function') ? n.toJSON() : n);
    }

    const related = this._related ?? (this._rawRelated.length > 0 ? this._rawRelated : []);
    if (related.length > 0) {
      obj.related = related.map(r => (typeof r.toJSON === 'function') ? r.toJSON() : r);
    }

    return obj;
  }

  static fromJSON(data) {
    return new LocalizedConcept(data);
  }
}
