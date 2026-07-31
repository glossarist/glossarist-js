import { GlossaristModel } from './base.js';
import { Designation } from './designation.js';
import { DetailedDefinition } from './detailed-definition.js';
import { ConceptSource } from './concept-source.js';
import { ConceptDate } from './concept-date.js';
import { NonVerbRep } from './non-verb-rep.js';
import { RelatedConcept } from './related-concept.js';

function wrapAs<T>(
  Cls: new (...args: never[]) => T,
): (item: unknown) => T {
  return (item: unknown): T =>
    item instanceof Cls ? item : new Cls(item as never);
}

const LOC_WIRE_NAMES: Readonly<Record<string, string>> = Object.freeze({
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

export interface LocalizedConceptJson {
  language_code?: string | null;
  languageCode?: string | null;
  script?: string | null;
  system?: string | null;
  entry_status?: string | null;
  entryStatus?: string | null;
  classification?: string | null;
  review_type?: string | null;
  reviewType?: string | null;
  domain?: string | null;
  release?: string | null;
  lineage_source_similarity?: string | null;
  lineageSourceSimilarity?: string | null;
  review_date?: string | null;
  reviewDate?: string | null;
  review_decision_date?: string | null;
  reviewDecisionDate?: string | null;
  review_decision_event?: string | null;
  reviewDecisionEvent?: string | null;
  review_status?: string | null;
  reviewStatus?: string | null;
  review_decision?: string | null;
  reviewDecision?: string | null;
  review_decision_notes?: string | null;
  reviewDecisionNotes?: string | null;
  terms?: ReadonlyArray<unknown>;
  definition?: ReadonlyArray<unknown>;
  sources?: ReadonlyArray<unknown>;
  notes?: ReadonlyArray<unknown>;
  annotations?: ReadonlyArray<unknown>;
  examples?: ReadonlyArray<unknown>;
  dates?: ReadonlyArray<unknown>;
  non_verbal_rep?: ReadonlyArray<unknown>;
  non_verb?: ReadonlyArray<unknown>;
  related?: ReadonlyArray<unknown>;
}

type SlotName = 'definitions' | 'notes' | 'examples' | 'annotations';

export class LocalizedConcept extends GlossaristModel {
  static get DIFF_FIELDS(): ReadonlyArray<string> {
    return Object.freeze([
      'entryStatus', 'classification', 'reviewType', 'domain', 'release',
      'lineageSourceSimilarity', 'script', 'system',
      'reviewDate', 'reviewDecisionDate', 'reviewDecisionEvent',
      'reviewStatus', 'reviewDecision', 'reviewDecisionNotes',
    ]);
  }

  static wireNameFor(field: string): string {
    return LOC_WIRE_NAMES[field] ?? field;
  }

  readonly languageCode: string | null;
  readonly script: string | null;
  readonly system: string | null;
  readonly entryStatus: string | null;
  readonly classification: string | null;
  readonly reviewType: string | null;
  readonly domain: string | null;
  readonly release: string | null;
  readonly lineageSourceSimilarity: string | null;
  readonly reviewDate: string | null;
  readonly reviewDecisionDate: string | null;
  readonly reviewDecisionEvent: string | null;
  readonly reviewStatus: string | null;
  readonly reviewDecision: string | null;
  readonly reviewDecisionNotes: string | null;

  private readonly _rawTerms: ReadonlyArray<unknown>;
  private readonly _rawDefinition: ReadonlyArray<unknown>;
  private readonly _rawSources: ReadonlyArray<unknown>;
  private readonly _rawNotes: ReadonlyArray<unknown>;
  private readonly _rawAnnotations: ReadonlyArray<unknown>;
  private readonly _rawExamples: ReadonlyArray<unknown>;
  private readonly _rawDates: ReadonlyArray<unknown>;
  private readonly _rawNonVerbal: ReadonlyArray<unknown>;
  private readonly _rawRelated: ReadonlyArray<unknown>;
  private _terms: ReadonlyArray<Designation> | null = null;
  private _definitions: ReadonlyArray<DetailedDefinition> | null = null;
  private _sources: ReadonlyArray<ConceptSource> | null = null;
  private _notes: ReadonlyArray<DetailedDefinition> | null = null;
  private _annotations: ReadonlyArray<DetailedDefinition> | null = null;
  private _examples: ReadonlyArray<DetailedDefinition> | null = null;
  private _dates: ReadonlyArray<ConceptDate> | null = null;
  private _nonVerbal: ReadonlyArray<NonVerbRep> | null = null;
  private _related: ReadonlyArray<RelatedConcept> | null = null;

  constructor(data: LocalizedConceptJson = {}) {
    super();
    this.languageCode = data.language_code ?? data.languageCode ?? null;
    this.script = data.script ?? null;
    this.system = data.system ?? null;
    this.entryStatus = data.entry_status ?? data.entryStatus ?? null;
    this.classification = data.classification ?? null;
    this.reviewType = data.review_type ?? data.reviewType ?? null;
    this.domain = data.domain ?? null;
    this.release = data.release ?? null;
    this.lineageSourceSimilarity =
      data.lineage_source_similarity ?? data.lineageSourceSimilarity ?? null;
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
  }

  get terms(): ReadonlyArray<Designation> {
    return this._lazy<Designation>(
      '_terms',
      '_rawTerms',
      (t) => Designation.fromData(t),
    );
  }

  get definitions(): ReadonlyArray<DetailedDefinition> {
    return this._lazy<DetailedDefinition>(
      '_definitions',
      '_rawDefinition',
      wrapAs(DetailedDefinition),
    );
  }

  get definition(): ReadonlyArray<DetailedDefinition> {
    return this.definitions;
  }

  get sources(): ReadonlyArray<ConceptSource> {
    return this._lazy<ConceptSource>(
      '_sources',
      '_rawSources',
      wrapAs(ConceptSource),
    );
  }

  get notes(): ReadonlyArray<DetailedDefinition> {
    return this._lazy<DetailedDefinition>(
      '_notes',
      '_rawNotes',
      wrapAs(DetailedDefinition),
    );
  }

  get annotations(): ReadonlyArray<DetailedDefinition> {
    return this._lazy<DetailedDefinition>(
      '_annotations',
      '_rawAnnotations',
      wrapAs(DetailedDefinition),
    );
  }

  get examples(): ReadonlyArray<DetailedDefinition> {
    return this._lazy<DetailedDefinition>(
      '_examples',
      '_rawExamples',
      wrapAs(DetailedDefinition),
    );
  }

  get dates(): ReadonlyArray<ConceptDate> {
    return this._lazy<ConceptDate>(
      '_dates',
      '_rawDates',
      wrapAs(ConceptDate),
    );
  }

  get nonVerbalRep(): ReadonlyArray<NonVerbRep> {
    return this._lazy<NonVerbRep>(
      '_nonVerbal',
      '_rawNonVerbal',
      wrapAs(NonVerbRep),
    );
  }

  get related(): ReadonlyArray<RelatedConcept> {
    return this._lazy<RelatedConcept>(
      '_related',
      '_rawRelated',
      wrapAs(RelatedConcept),
    );
  }

  get primaryDesignation(): string | null {
    return this.terms[0]?.designation ?? null;
  }

  get primaryDefinition(): string | null {
    return this.definitions[0]?.content ?? null;
  }

  private *_textSlots(): Generator<[SlotName, ReadonlyArray<DetailedDefinition>]> {
    yield ['definitions', this.definitions];
    yield ['notes', this.notes];
    yield ['examples', this.examples];
    yield ['annotations', this.annotations];
  }

  *walkTexts(basePath: string): Generator<{ text: string; source: string }> {
    for (const [name, arr] of this._textSlots()) {
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (!item) continue;
        yield* item.walkTexts(`${basePath}.${name}[${i}]`);
      }
    }
  }

  override toJSON(): LocalizedConceptJson {
    const obj: LocalizedConceptJson = {};
    if (this.languageCode) obj.language_code = this.languageCode;
    if (this.script) obj.script = this.script;
    if (this.system) obj.system = this.system;
    if (this.entryStatus) obj.entry_status = this.entryStatus;
    if (this.classification) obj.classification = this.classification;
    if (this.reviewType) obj.review_type = this.reviewType;
    if (this.domain) obj.domain = this.domain;
    if (this.release) obj.release = this.release;
    if (this.lineageSourceSimilarity != null) {
      obj.lineage_source_similarity = this.lineageSourceSimilarity;
    }
    if (this.reviewDate) obj.review_date = this.reviewDate;
    if (this.reviewDecisionDate) obj.review_decision_date = this.reviewDecisionDate;
    if (this.reviewDecisionEvent) obj.review_decision_event = this.reviewDecisionEvent;
    if (this.reviewStatus) obj.review_status = this.reviewStatus;
    if (this.reviewDecision) obj.review_decision = this.reviewDecision;
    if (this.reviewDecisionNotes) obj.review_decision_notes = this.reviewDecisionNotes;

    this._serialize(obj as unknown as Record<string, unknown>, 'terms', '_terms', '_rawTerms');
    this._serialize(obj as unknown as Record<string, unknown>, 'definition', '_definitions', '_rawDefinition');
    this._serialize(obj as unknown as Record<string, unknown>, 'notes', '_notes', '_rawNotes');
    this._serialize(obj as unknown as Record<string, unknown>, 'annotations', '_annotations', '_rawAnnotations');
    this._serialize(obj as unknown as Record<string, unknown>, 'examples', '_examples', '_rawExamples');
    this._serialize(obj as unknown as Record<string, unknown>, 'sources', '_sources', '_rawSources');
    this._serialize(obj as unknown as Record<string, unknown>, 'dates', '_dates', '_rawDates');
    this._serialize(obj as unknown as Record<string, unknown>, 'non_verbal_rep', '_nonVerbal', '_rawNonVerbal');
    this._serialize(obj as unknown as Record<string, unknown>, 'related', '_related', '_rawRelated');

    return obj;
  }

  static override fromJSON(data: LocalizedConceptJson): LocalizedConcept {
    return new LocalizedConcept(data);
  }
}
