import { GlossaristModel } from '../models/base.js';
import { PartitiveHyperedge } from '../models/partitive-hyperedge.js';
import { GenericHyperedge } from '../models/generic-hyperedge.js';
import { Added, Removed, Changed } from './change.js';
import type { Added as AddedType, Removed as RemovedType, Changed as ChangedType } from './change.js';
import { ListDiff, diffList, diffSet } from './list-diff.js';
import { identityOf } from './identity.js';
import { canonicalJson } from './canonical-json.js';
import { computeSimilarity } from './similarity.js';
import type { Concept } from '../models/concept.js';
import type { LocalizedConcept } from '../models/localized-concept.js';

const CONCEPT_METADATA_FIELDS = Object.freeze([
  'status', 'term', 'uri', 'schemaVersion',
]) as readonly string[];

const LOCALIZATION_METADATA_FIELDS = Object.freeze([
  'entryStatus', 'classification', 'reviewType', 'domain', 'release',
  'lineageSourceSimilarity', 'script', 'system',
  'reviewDate', 'reviewDecisionDate', 'reviewDecisionEvent',
  'reviewStatus', 'reviewDecision', 'reviewDecisionNotes',
]) as readonly string[];

interface DiffStatsData { added?: number; removed?: number; changed?: number }

export class DiffStats extends GlossaristModel {
  private _added: number;
  private _removed: number;
  private _changed: number;

  constructor(data: DiffStatsData = {}) {
    super();
    this._added = data.added ?? 0;
    this._removed = data.removed ?? 0;
    this._changed = data.changed ?? 0;
  }

  get added(): number { return this._added; }
  get removed(): number { return this._removed; }
  get changed(): number { return this._changed; }
  get total(): number { return this._added + this._removed + this._changed; }

  override toJSON(): DiffStatsData {
    return { added: this._added, removed: this._removed, changed: this._changed };
  }

  static override fromJSON(data: DiffStatsData): DiffStats {
    return new DiffStats(data ?? {});
  }
}

interface MetadataDiffData {
  changes?: Record<string, ChangedType | Record<string, unknown>>;
}

export class MetadataDiff extends GlossaristModel {
  private _changes: Record<string, ChangedType>;

  constructor(data: MetadataDiffData = {}) {
    super();
    this._changes = {};
    const raw = data.changes ?? data ?? {};
    for (const [field, change] of Object.entries(raw)) {
      this._changes[field] = change instanceof Changed ? change : Changed.fromJSON(change);
    }
  }

  get changes(): Record<string, ChangedType> {
    return this._changes;
  }

  get hasChanges(): boolean {
    return Object.keys(this._changes).length > 0;
  }

  get count(): number {
    return Object.keys(this._changes).length;
  }

  *walk(section?: string): Generator<{ path: string; change: ChangedType }> {
    for (const [field, change] of Object.entries(this._changes)) {
      const path = section ? `${section}.${field}` : field;
      yield { path, change };
    }
  }

  override toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [field, change] of Object.entries(this._changes)) {
      obj[field] = change.toJSON();
    }
    return obj;
  }

  static override fromJSON(data: Record<string, unknown>): MetadataDiff {
    return new MetadataDiff({ changes: data as Record<string, ChangedType> });
  }
}

interface ConceptLevelDiffData {
  sources?: ListDiff;
  dates?: ListDiff;
  relatedConcepts?: ListDiff;
  related_concepts?: ListDiff;
  relations?: ListDiff;
  partitiveRelations?: ListDiff;
  partitive_relations?: ListDiff;
  partitiveHyperedges?: ListDiff;
  partitive_hyperedges?: ListDiff;
  groups?: ListDiff;
  sections?: ListDiff;
  tags?: ListDiff;
  metadata?: MetadataDiff | Record<string, unknown>;
}

function asMetadataDiff(m: MetadataDiff | Record<string, unknown> | undefined): MetadataDiff {
  return m instanceof MetadataDiff ? m : MetadataDiff.fromJSON(m ?? {});
}

export class ConceptLevelDiff extends GlossaristModel {
  private _sources: ListDiff;
  private _dates: ListDiff;
  private _relatedConcepts: ListDiff;
  private _relations: ListDiff;
  private _groups: ListDiff;
  private _sections: ListDiff;
  private _tags: ListDiff;
  private _metadata: MetadataDiff;

  constructor(data: ConceptLevelDiffData = {}) {
    super();
    this._sources = wrapListDiff(data.sources);
    this._dates = wrapListDiff(data.dates);
    this._relatedConcepts = wrapListDiff(data.relatedConcepts ?? data.related_concepts);
    this._relations = wrapListDiff(
      data.relations
        ?? data.partitiveRelations
        ?? data.partitive_relations
        ?? data.partitiveHyperedges
        ?? data.partitive_hyperedges,
    );
    this._groups = wrapListDiff(data.groups);
    this._sections = wrapListDiff(data.sections);
    this._tags = wrapListDiff(data.tags);
    this._metadata = asMetadataDiff(data.metadata);
  }

  get sources(): ListDiff { return this._sources; }
  get dates(): ListDiff { return this._dates; }
  get relatedConcepts(): ListDiff { return this._relatedConcepts; }
  get relations(): ListDiff { return this._relations; }
  get partitiveRelations(): ListDiff {
    return filterListDiffByType(this._relations, PartitiveHyperedge);
  }
  /** @deprecated use .relations */ get partitiveHyperedges(): ListDiff { return this.partitiveRelations; }
  get genericRelations(): ListDiff {
    return filterListDiffByType(this._relations, GenericHyperedge);
  }
  get groups(): ListDiff { return this._groups; }
  get sections(): ListDiff { return this._sections; }
  get tags(): ListDiff { return this._tags; }
  get metadata(): MetadataDiff { return this._metadata; }

  get hasChanges(): boolean {
    return this._sources.hasChanges
      || this._dates.hasChanges
      || this._relatedConcepts.hasChanges
      || this._relations.hasChanges
      || this._groups.hasChanges
      || this._sections.hasChanges
      || this._tags.hasChanges
      || this._metadata.hasChanges;
  }

  *walk(): Generator<{ path: string; change: AddedType | RemovedType | ChangedType }> {
    yield* walkList('concept.sources', this._sources);
    yield* walkList('concept.dates', this._dates);
    yield* walkList('concept.relatedConcepts', this._relatedConcepts);
    yield* walkList('concept.relations', this._relations);
    yield* walkList('concept.groups', this._groups);
    yield* walkList('concept.sections', this._sections);
    yield* walkList('concept.tags', this._tags);
    yield* this._metadata.walk('concept.metadata');
  }

  override toJSON(): Record<string, unknown> {
    return {
      sources: this._sources.toJSON(),
      dates: this._dates.toJSON(),
      related_concepts: this._relatedConcepts.toJSON(),
      relations: this._relations.toJSON(),
      groups: this._groups.toJSON(),
      sections: this._sections.toJSON(),
      tags: this._tags.toJSON(),
      metadata: this._metadata.toJSON(),
    };
  }

  static override fromJSON(data: ConceptLevelDiffData): ConceptLevelDiff {
    return new ConceptLevelDiff(data);
  }
}

interface LocalizedConceptDiffData {
  languageCode?: string | null;
  language_code?: string | null;
  designations?: ListDiff;
  definitions?: ListDiff;
  notes?: ListDiff;
  examples?: ListDiff;
  sources?: ListDiff;
  dates?: ListDiff;
  related?: ListDiff;
  metadata?: MetadataDiff | Record<string, unknown>;
  totalItems?: number;
  total_items?: number;
}

export class LocalizedConceptDiff extends GlossaristModel {
  languageCode: string | null;
  private _designations: ListDiff;
  private _definitions: ListDiff;
  private _notes: ListDiff;
  private _examples: ListDiff;
  private _sources: ListDiff;
  private _dates: ListDiff;
  private _related: ListDiff;
  private _metadata: MetadataDiff;
  private _totalItems: number;
  private _statsCache?: DiffStats;
  private _similarityCache?: number;

  constructor(data: LocalizedConceptDiffData = {}) {
    super();
    this.languageCode = data.languageCode ?? data.language_code ?? null;
    this._designations = wrapListDiff(data.designations);
    this._definitions = wrapListDiff(data.definitions);
    this._notes = wrapListDiff(data.notes);
    this._examples = wrapListDiff(data.examples);
    this._sources = wrapListDiff(data.sources);
    this._dates = wrapListDiff(data.dates);
    this._related = wrapListDiff(data.related);
    this._metadata = asMetadataDiff(data.metadata);
    this._totalItems = data.totalItems ?? data.total_items ?? 0;
    this._statsCache = undefined;
    this._similarityCache = undefined;
  }

  get designations(): ListDiff { return this._designations; }
  get definitions(): ListDiff { return this._definitions; }
  get notes(): ListDiff { return this._notes; }
  get examples(): ListDiff { return this._examples; }
  get sources(): ListDiff { return this._sources; }
  get dates(): ListDiff { return this._dates; }
  get related(): ListDiff { return this._related; }
  get metadata(): MetadataDiff { return this._metadata; }
  get totalItems(): number { return this._totalItems; }

  get hasChanges(): boolean {
    return this._designations.hasChanges
      || this._definitions.hasChanges
      || this._notes.hasChanges
      || this._examples.hasChanges
      || this._sources.hasChanges
      || this._dates.hasChanges
      || this._related.hasChanges
      || this._metadata.hasChanges;
  }

  get stats(): DiffStats {
    if (this._statsCache === undefined) {
      this._statsCache = collectStats(this.walk());
    }
    return this._statsCache;
  }

  get similarity(): number {
    if (this._similarityCache === undefined) {
      this._similarityCache = computeSimilarity(this.stats.total, this._totalItems);
    }
    return this._similarityCache;
  }

  *walk(prefix?: string): Generator<{ path: string; change: AddedType | RemovedType | ChangedType }> {
    const base = prefix ?? '';
    yield* walkList(`${base}.designations`, this._designations);
    yield* walkList(`${base}.definitions`, this._definitions);
    yield* walkList(`${base}.notes`, this._notes);
    yield* walkList(`${base}.examples`, this._examples);
    yield* walkList(`${base}.sources`, this._sources);
    yield* walkList(`${base}.dates`, this._dates);
    yield* walkList(`${base}.related`, this._related);
    yield* this._metadata.walk(`${base}.metadata`);
  }

  override toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    if (this.languageCode != null) obj.language_code = this.languageCode;
    obj.designations = this._designations.toJSON();
    obj.definitions = this._definitions.toJSON();
    obj.notes = this._notes.toJSON();
    obj.examples = this._examples.toJSON();
    obj.sources = this._sources.toJSON();
    obj.dates = this._dates.toJSON();
    obj.related = this._related.toJSON();
    obj.metadata = this._metadata.toJSON();
    obj.total_items = this._totalItems;
    return obj;
  }

  static override fromJSON(data: LocalizedConceptDiffData): LocalizedConceptDiff {
    return new LocalizedConceptDiff(data);
  }
}

interface ConceptDiffData {
  oldId?: string | null;
  old_id?: string | null;
  newId?: string | null;
  new_id?: string | null;
  concept?: ConceptLevelDiff | Record<string, unknown>;
  languages?: ListDiff;
  localizations?: Record<string, LocalizedConceptDiff | Record<string, unknown>>;
  totalItems?: number;
  total_items?: number;
}

export class ConceptDiff extends GlossaristModel {
  private _oldId: string | null;
  private _newId: string | null;
  private _concept: ConceptLevelDiff;
  private _languages: ListDiff;
  private _localizations: Record<string, LocalizedConceptDiff>;
  private _totalItems: number;
  private _statsCache?: DiffStats;
  private _similarityCache?: number;

  constructor(data: ConceptDiffData = {}) {
    super();
    this._oldId = data.oldId ?? data.old_id ?? null;
    this._newId = data.newId ?? data.new_id ?? null;
    this._concept = data.concept instanceof ConceptLevelDiff
      ? data.concept
      : ConceptLevelDiff.fromJSON(data.concept ?? {});
    this._languages = wrapListDiff(data.languages);
    this._localizations = {};
    const raw = data.localizations ?? {};
    for (const [lang, lcDiff] of Object.entries(raw)) {
      this._localizations[lang] = lcDiff instanceof LocalizedConceptDiff
        ? lcDiff
        : LocalizedConceptDiff.fromJSON(lcDiff);
    }
    this._totalItems = data.totalItems ?? data.total_items ?? 0;
    this._statsCache = undefined;
    this._similarityCache = undefined;
  }

  get oldId(): string | null { return this._oldId; }
  get newId(): string | null { return this._newId; }
  get concept(): ConceptLevelDiff { return this._concept; }
  get languages(): ListDiff { return this._languages; }
  get localizations(): Record<string, LocalizedConceptDiff> { return this._localizations; }
  get totalItems(): number { return this._totalItems; }

  get localizationLanguages(): string[] {
    return Object.keys(this._localizations);
  }

  get hasChanges(): boolean {
    return this._concept.hasChanges
      || this._languages.hasChanges
      || Object.values(this._localizations).some(lc => lc.hasChanges);
  }

  localization(lang: string): LocalizedConceptDiff | null {
    return this._localizations[lang] ?? null;
  }

  get stats(): DiffStats {
    if (this._statsCache === undefined) {
      this._statsCache = collectStats(this.walk());
    }
    return this._statsCache;
  }

  get similarity(): number {
    if (this._similarityCache === undefined) {
      this._similarityCache = computeSimilarity(this.stats.total, this._totalItems);
    }
    return this._similarityCache;
  }

  *walk(): Generator<{ path: string; change: AddedType | RemovedType | ChangedType; language?: string }> {
    yield* this._concept.walk();
    yield* walkList('languages', this._languages);
    for (const [lang, lc] of Object.entries(this._localizations)) {
      for (const { path, change } of lc.walk(`localizations.${lang}`)) {
        yield { path, change, language: lang };
      }
    }
  }

  override toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    if (this._oldId != null) obj.old_id = this._oldId;
    if (this._newId != null) obj.new_id = this._newId;
    obj.concept = this._concept.toJSON();
    obj.languages = this._languages.toJSON();
    obj.localizations = {};
    const localizations = obj.localizations as Record<string, unknown>;
    for (const [lang, lc] of Object.entries(this._localizations)) {
      localizations[lang] = lc.toJSON();
    }
    obj.total_items = this._totalItems;
    return obj;
  }

  static override fromJSON(data: ConceptDiffData): ConceptDiff {
    return new ConceptDiff(data);
  }
}

type ConceptLike = Concept | { id?: string; languages?: readonly string[]; localization(lang: string): unknown } & Record<string, unknown> | null;

export function diffConcepts(oldConcept: ConceptLike, newConcept: ConceptLike, language?: string | null): ConceptDiff {
  if (!oldConcept && !newConcept) {
    return new ConceptDiff({});
  }

  const oldId = oldConcept?.id ?? null;
  const newId = newConcept?.id ?? null;
  const oldLangs = oldConcept?.languages ?? [];
  const newLangs = newConcept?.languages ?? [];

  let langs: string[];
  if (language === 'all') {
    langs = union(oldLangs, newLangs);
  } else if (language) {
    if (!oldLangs.includes(language) && !newLangs.includes(language)) {
      throw new Error(
        `diffConcepts: language '${language}' not present in either concept ` +
        `(available: ${union(oldLangs, newLangs).join(', ') || 'none'})`,
      );
    }
    langs = [language];
  } else {
    langs = union(oldLangs, newLangs);
  }

  const conceptDiff = diffConceptLevel(oldConcept ?? null, newConcept ?? null);
  const languageDiff = diffLanguageSets(oldLangs, newLangs);
  const localizations: Record<string, LocalizedConceptDiff> = {};
  for (const lang of langs) {
    const oldLoc = (oldConcept?.localization?.(lang) ?? null) as LocalizedConceptLike | null;
    const newLoc = (newConcept?.localization?.(lang) ?? null) as LocalizedConceptLike | null;
    const lcDiff = diffLocalizedConcepts(oldLoc, newLoc);
    localizations[lang] = lcDiff;
  }

  const totalItems = countConceptItems(oldConcept ?? null, newConcept ?? null, langs);

  return new ConceptDiff({
    oldId,
    newId,
    concept: conceptDiff,
    languages: languageDiff,
    localizations,
    totalItems,
  });
}

interface LocalizedConceptLike {
  languageCode?: string | null;
  terms?: readonly unknown[];
  definitions?: readonly unknown[];
  notes?: readonly unknown[];
  examples?: readonly unknown[];
  sources?: readonly unknown[];
  dates?: readonly unknown[];
  related?: readonly unknown[];
  [k: string]: unknown;
}

export function diffLocalizedConcepts(oldLoc: LocalizedConceptLike | null, newLoc: LocalizedConceptLike | null): LocalizedConceptDiff {
  if (!oldLoc && !newLoc) {
    return new LocalizedConceptDiff({ languageCode: null });
  }

  const lang = newLoc?.languageCode ?? oldLoc?.languageCode ?? null;

  if (!oldLoc) {
    return fullyDiff(newLoc!, lang, 'added');
  }
  if (!newLoc) {
    return fullyDiff(oldLoc, lang, 'removed');
  }

  return new LocalizedConceptDiff({
    languageCode: lang,
    designations: diffDesignations(oldLoc.terms ?? [], newLoc.terms ?? []),
    definitions: diffTextList(oldLoc.definitions ?? [], newLoc.definitions ?? []),
    notes: diffTextList(oldLoc.notes ?? [], newLoc.notes ?? []),
    examples: diffTextList(oldLoc.examples ?? [], newLoc.examples ?? []),
    sources: diffSources(oldLoc.sources ?? [], newLoc.sources ?? []),
    dates: diffDates(oldLoc.dates ?? [], newLoc.dates ?? []),
    related: diffRelated(oldLoc.related ?? [], newLoc.related ?? []),
    metadata: diffMetadata(oldLoc, newLoc, LOCALIZATION_METADATA_FIELDS),
    totalItems: countLocalizedItems(oldLoc, newLoc),
  });
}

function diffConceptLevel(oldConcept: ConceptLike, newConcept: ConceptLike): ConceptLevelDiff {
  if (!oldConcept && !newConcept) {
    return new ConceptLevelDiff({});
  }

  const Direction = !oldConcept ? 'added' : !newConcept ? 'removed' : null;

  if (Direction) {
    const c = (oldConcept ?? newConcept) as ConceptLike & Record<string, unknown>;
    return new ConceptLevelDiff({
      sources: fullListDiff((c.sources as readonly unknown[]) ?? [], Direction),
      dates: fullListDiff((c.dates as readonly unknown[]) ?? [], Direction),
      relatedConcepts: fullListDiff((c.relatedConcepts as readonly unknown[]) ?? [], Direction),
      relations: fullListDiff((c.relations as readonly unknown[]) ?? [], Direction),
      groups: fullListDiff((c.groups as readonly unknown[]) ?? [], Direction),
      sections: fullListDiff((c.sections as readonly unknown[]) ?? [], Direction),
      tags: fullListDiff((c.tags as readonly unknown[]) ?? [], Direction),
      metadata: fullMetadataDiff(c as Record<string, unknown>, CONCEPT_METADATA_FIELDS, Direction),
    });
  }

  const oldC = oldConcept as ConceptLike & Record<string, unknown>;
  const newC = newConcept as ConceptLike & Record<string, unknown>;
  return new ConceptLevelDiff({
    sources: diffSources((oldC.sources as readonly unknown[]) ?? [], (newC.sources as readonly unknown[]) ?? []),
    dates: diffDates((oldC.dates as readonly unknown[]) ?? [], (newC.dates as readonly unknown[]) ?? []),
    relatedConcepts: diffRelatedConcepts((oldC.relatedConcepts as readonly unknown[]) ?? [], (newC.relatedConcepts as readonly unknown[]) ?? []),
    relations: diffHyperedges(
      (oldC.relations as readonly unknown[]) ?? [],
      (newC.relations as readonly unknown[]) ?? [],
    ),
    groups: diffStringSet((oldC.groups as readonly unknown[]) ?? [], (newC.groups as readonly unknown[]) ?? []),
    sections: diffStringSet((oldC.sections as readonly unknown[]) ?? [], (newC.sections as readonly unknown[]) ?? []),
    tags: diffStringSet((oldC.tags as readonly unknown[]) ?? [], (newC.tags as readonly unknown[]) ?? []),
    metadata: diffMetadata(oldC, newC, CONCEPT_METADATA_FIELDS),
  });
}

function diffLanguageSets(oldLangs: readonly string[], newLangs: readonly string[]): ListDiff {
  const oldSet = new Set(oldLangs);
  const newSet = new Set(newLangs);
  const added = newLangs
    .filter(l => !oldSet.has(l))
    .sort()
    .map(l => new Added({ value: l }));
  const removed = oldLangs
    .filter(l => !newSet.has(l))
    .sort()
    .map(l => new Removed({ value: l }));
  return new ListDiff({ added, removed, changed: [] });
}

function fullyDiff(loc: LocalizedConceptLike, lang: string | null, direction: 'added' | 'removed'): LocalizedConceptDiff {
  const ChangeClass = direction === 'added' ? Added : Removed;
  const key = direction;
  const lc = new LocalizedConceptDiff({
    languageCode: lang,
    designations: new ListDiff({ [key]: (loc.terms ?? []).map((v: unknown) => new ChangeClass({ value: v })) }),
    definitions: new ListDiff({ [key]: (loc.definitions ?? []).map((v: unknown) => new ChangeClass({ value: v })) }),
    notes: new ListDiff({ [key]: (loc.notes ?? []).map((v: unknown) => new ChangeClass({ value: v })) }),
    examples: new ListDiff({ [key]: (loc.examples ?? []).map((v: unknown) => new ChangeClass({ value: v })) }),
    sources: new ListDiff({ [key]: (loc.sources ?? []).map((v: unknown) => new ChangeClass({ value: v })) }),
    dates: new ListDiff({ [key]: (loc.dates ?? []).map((v: unknown) => new ChangeClass({ value: v })) }),
    related: new ListDiff({ [key]: (loc.related ?? []).map((v: unknown) => new ChangeClass({ value: v })) }),
    metadata: fullMetadataDiff(loc, LOCALIZATION_METADATA_FIELDS, direction),
    totalItems: countLocalizedItems(direction === 'added' ? null : loc, direction === 'added' ? loc : null),
  });
  return lc;
}

function fullListDiff(items: readonly unknown[], direction: 'added' | 'removed'): ListDiff {
  const ChangeClass = direction === 'added' ? Added : Removed;
  return new ListDiff({ [direction]: items.map(v => new ChangeClass({ value: v })) });
}

function fullMetadataDiff(obj: Record<string, any>, fields: readonly string[], direction: 'added' | 'removed'): MetadataDiff {
  const changes: Record<string, ChangedType> = {};
  for (const field of fields) {
    const val = obj[field];
    if (val != null) {
      changes[field] = new Changed({
        oldValue: direction === 'added' ? null : val,
        newValue: direction === 'added' ? val : null,
      });
    }
  }
  return new MetadataDiff({ changes });
}

function diffDesignations(oldTerms: readonly unknown[], newTerms: readonly unknown[]): ListDiff {
  return diffSet(oldTerms, newTerms, {
    identityKey: identityOf,
    textKey: (d: any) => d?.designation ?? '',
  });
}

function diffTextList(oldItems: readonly unknown[], newItems: readonly unknown[]): ListDiff {
  return diffList(oldItems, newItems, {
    textKey: (d: any) => d?.content ?? '',
  });
}

function diffSources(oldSources: readonly unknown[], newSources: readonly unknown[]): ListDiff {
  return diffSet(oldSources, newSources, {
    identityKey: identityOf,
  });
}

function diffDates(oldDates: readonly unknown[], newDates: readonly unknown[]): ListDiff {
  return diffSet(oldDates, newDates, {
    identityKey: identityOf,
    textKey: (d: any) => d?.date ?? '',
  });
}

function diffRelated(oldRelated: readonly unknown[], newRelated: readonly unknown[]): ListDiff {
  return diffSet(oldRelated, newRelated, {
    identityKey: identityOf,
  });
}

function diffRelatedConcepts(oldRC: readonly unknown[], newRC: readonly unknown[]): ListDiff {
  return diffSet(oldRC, newRC, {
    identityKey: identityOf,
  });
}

function diffHyperedges(oldR: readonly unknown[], newR: readonly unknown[]): ListDiff {
  return diffSet(oldR, newR, {
    identityKey: relationIdentityOf,
    textKey: relationText,
  });
}

function relationIdentityOf(value: unknown): string {
  if (value == null) return '';
  const v = value as { constructor?: { name?: string; identityOf?: (v: unknown) => string } };
  const Cls = v.constructor;
  if (typeof Cls?.identityOf === 'function') {
    const typed = Cls.identityOf(value);
    return `${Cls.name}::${typed}`;
  }
  return identityOf(value);
}

function filterListDiffByType(listDiff: ListDiff, Cls: new (...args: any[]) => unknown): ListDiff {
  if (!listDiff) return listDiff;
  return new ListDiff({
    added: listDiff.added.filter(e => e.value instanceof Cls),
    removed: listDiff.removed.filter(e => e.value instanceof Cls),
    changed: listDiff.changed.filter(e =>
      (e.oldValue == null || e.oldValue instanceof Cls) &&
      (e.newValue == null || e.newValue instanceof Cls)),
  });
}

function relationText(r: any): string {
  if (!r) return '';
  return canonicalJson(typeof r.toJSON === 'function' ? r.toJSON() : r);
}

function diffStringSet(oldStrings: readonly unknown[], newStrings: readonly unknown[]): ListDiff {
  return diffSet(oldStrings, newStrings, {
    identityKey: identityOf,
  });
}

function diffMetadata(oldObj: Record<string, any>, newObj: Record<string, any>, fields: readonly string[]): MetadataDiff {
  const changes: Record<string, ChangedType> = {};
  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (oldVal !== newVal) {
      changes[field] = new Changed({ oldValue: oldVal, newValue: newVal });
    }
  }
  return new MetadataDiff({ changes });
}

function wrapListDiff(data: ListDiff | Record<string, unknown> | null | undefined): ListDiff {
  if (data instanceof ListDiff) return data;
  return ListDiff.fromJSON(data ?? {});
}

function collectStats(walker: Iterable<{ change: { type: string } }>): DiffStats {
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const { change } of walker) {
    if (change.type === 'added') added++;
    else if (change.type === 'removed') removed++;
    else if (change.type === 'changed') changed++;
  }
  return new DiffStats({ added, removed, changed });
}

function maxOf(a: number | undefined, b: number | undefined): number {
  return Math.max(a ?? 0, b ?? 0);
}

function countConceptItems(oldConcept: ConceptLike, newConcept: ConceptLike, langs: readonly string[]): number {
  let count = 0;
  const oldC = oldConcept as Record<string, unknown> | null;
  const newC = newConcept as Record<string, unknown> | null;
  const len = (v: unknown): number | undefined => Array.isArray(v) ? v.length : undefined;

  count += maxOf(len(oldC?.sources), len(newC?.sources));
  count += maxOf(len(oldC?.dates), len(newC?.dates));
  count += maxOf(len(oldC?.relatedConcepts), len(newC?.relatedConcepts));
  count += maxOf(len(oldC?.relations), len(newC?.relations));
  count += maxOf(len(oldC?.groups), len(newC?.groups));
  count += maxOf(len(oldC?.sections), len(newC?.sections));
  count += maxOf(len(oldC?.tags), len(newC?.tags));
  count += CONCEPT_METADATA_FIELDS.length;

  const oldLangs = oldConcept?.languages ?? [];
  const newLangs = newConcept?.languages ?? [];
  count += maxOf(oldLangs.length, newLangs.length);

  for (const lang of langs) {
    const oldLoc = (oldConcept?.localization?.(lang) as LocalizedConceptLike | null) ?? null;
    const newLoc = (newConcept?.localization?.(lang) as LocalizedConceptLike | null) ?? null;
    count += countLocalizedItems(oldLoc, newLoc);
  }

  return count;
}

function countLocalizedItems(oldLoc: LocalizedConceptLike | null, newLoc: LocalizedConceptLike | null): number {
  let count = 0;
  const len = (v: readonly unknown[] | undefined): number | undefined => v?.length;
  count += maxOf(len(oldLoc?.terms), len(newLoc?.terms));
  count += maxOf(len(oldLoc?.definitions), len(newLoc?.definitions));
  count += maxOf(len(oldLoc?.notes), len(newLoc?.notes));
  count += maxOf(len(oldLoc?.examples), len(newLoc?.examples));
  count += maxOf(len(oldLoc?.sources), len(newLoc?.sources));
  count += maxOf(len(oldLoc?.dates), len(newLoc?.dates));
  count += maxOf(len(oldLoc?.related), len(newLoc?.related));
  count += LOCALIZATION_METADATA_FIELDS.length;
  return count;
}

function* walkList(section: string, listDiff: ListDiff): Generator<{ path: string; change: AddedType | RemovedType | ChangedType }> {
  for (let i = 0; i < listDiff.added.length; i++) {
    yield { path: `${section}.added[${i}]`, change: listDiff.added[i]! };
  }
  for (let i = 0; i < listDiff.removed.length; i++) {
    yield { path: `${section}.removed[${i}]`, change: listDiff.removed[i]! };
  }
  for (let i = 0; i < listDiff.changed.length; i++) {
    yield { path: `${section}.changed[${i}]`, change: listDiff.changed[i]! };
  }
}

function union<T>(a: readonly T[], b: readonly T[]): T[] {
  return [...new Set([...a, ...b])] as T[];
}
