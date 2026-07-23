import { GlossaristModel } from './base.js';
import { Designation } from './designation.js';
import { DetailedDefinition } from './detailed-definition.js';
import { ConceptSource } from './concept-source.js';
import { ConceptDate } from './concept-date.js';
import { NonVerbRep } from './non-verb-rep.js';
import { RelatedConcept } from './related-concept.js';

function wrapAs(Cls) {
  return item => item instanceof Cls ? item : new Cls(item);
}

const LOC_WIRE_NAMES = Object.freeze({
  entryStatus: 'entry_status',
  reviewType: 'review_type',
  lineageSourceSimilarity: 'lineage_source_similarity',
  reviewDate: 'review_date',
  reviewDecisionDate: 'review_decision_date',
  reviewDecisionEvent: 'review_decision_event',
  reviewStatus: 'review_status',
  reviewDecision: 'review_decision',
  reviewDecisionNotes: 'review_decision_notes',
});

export class LocalizedConcept extends GlossaristModel {
  // Scalar metadata fields the diff layer tracks per localization.
  // Adding a new scalar field requires only appending its name here;
  // diff/patch/similarity pick it up automatically.
  // (Invariant N2 — TODO.hyperedges-v2/07.)
  static get DIFF_FIELDS() {
    return Object.freeze([
      'entryStatus', 'classification', 'reviewType', 'domain', 'release',
      'lineageSourceSimilarity', 'script', 'system',
      'reviewDate', 'reviewDecisionDate', 'reviewDecisionEvent',
      'reviewStatus', 'reviewDecision', 'reviewDecisionNotes',
    ]);
  }

  static wireNameFor(field) {
    return LOC_WIRE_NAMES[field] ?? field;
  }

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
    this._rawAnnotations = data.annotations ?? [];
    this._rawExamples = data.examples ?? [];
    this._rawDates = data.dates ?? [];
    this._rawNonVerbal = data.non_verbal_rep ?? data.non_verb ?? [];
    this._rawRelated = data.related ?? [];

    this._terms = null;
    this._definitions = null;
    this._sources = null;
    this._notes = null;
    this._annotations = null;
    this._examples = null;
    this._dates = null;
    this._nonVerbal = null;
    this._related = null;
  }

  get terms() {
    return this._lazy('_terms', '_rawTerms', t => Designation.fromData(t));
  }

  get definitions() {
    return this._lazy('_definitions', '_rawDefinition', wrapAs(DetailedDefinition));
  }

  get definition() {
    return this.definitions;
  }

  get sources() {
    return this._lazy('_sources', '_rawSources', wrapAs(ConceptSource));
  }

  get notes() {
    return this._lazy('_notes', '_rawNotes', wrapAs(DetailedDefinition));
  }

  get annotations() {
    return this._lazy('_annotations', '_rawAnnotations', wrapAs(DetailedDefinition));
  }

  get examples() {
    return this._lazy('_examples', '_rawExamples', wrapAs(DetailedDefinition));
  }

  get dates() {
    return this._lazy('_dates', '_rawDates', wrapAs(ConceptDate));
  }

  get nonVerbalRep() {
    return this._lazy('_nonVerbal', '_rawNonVerbal', wrapAs(NonVerbRep));
  }

  get related() {
    return this._lazy('_related', '_rawRelated', wrapAs(RelatedConcept));
  }

  get primaryDesignation() {
    return this.terms[0]?.designation ?? null;
  }

  get primaryDefinition() {
    return this.definitions[0]?.content ?? null;
  }

  *_textSlots() {
    yield ['definitions', this.definitions];
    yield ['notes', this.notes];
    yield ['examples', this.examples];
    yield ['annotations', this.annotations];
  }

  /**
   * Yield every content-text fragment in this localization, recursing
   * through nested examples. `basePath` prefixes every emitted
   * `source` path; pass `localizations.<lang>` to get paths consistent
   * with the rest of the codebase. Designations are not included.
   */
  *walkTexts(basePath) {
    for (const [name, arr] of this._textSlots()) {
      for (let i = 0; i < arr.length; i++) {
        yield* arr[i].walkTexts(`${basePath}.${name}[${i}]`);
      }
    }
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

    this._serialize(obj, 'terms', '_terms', '_rawTerms');
    this._serialize(obj, 'definition', '_definitions', '_rawDefinition');
    this._serialize(obj, 'notes', '_notes', '_rawNotes');
    this._serialize(obj, 'annotations', '_annotations', '_rawAnnotations');
    this._serialize(obj, 'examples', '_examples', '_rawExamples');
    this._serialize(obj, 'sources', '_sources', '_rawSources');
    this._serialize(obj, 'dates', '_dates', '_rawDates');
    this._serialize(obj, 'non_verbal_rep', '_nonVerbal', '_rawNonVerbal');
    this._serialize(obj, 'related', '_related', '_rawRelated');

    return obj;
  }

  static fromJSON(data) {
    return new LocalizedConcept(data);
  }
}
