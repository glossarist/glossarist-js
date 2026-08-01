import { GlossaristModel } from '../models/base.js';
import { PartitiveHyperedge } from '../models/partitive-hyperedge.js';
import { GenericHyperedge } from '../models/generic-hyperedge.js';
import { Added, Removed, Changed } from './change.js';
import { ListDiff, diffList, diffSet } from './list-diff.js';
import { identityOf } from './identity.js';
import { canonicalJson } from './canonical-json.js';
import { computeSimilarity } from './similarity.js';

// Metadata field lists for the diff layer.
//
// Concept and LocalizedConcept also expose static DIFF_FIELDS that
// mirror these arrays. The duplication is intentional: concept-diff.js
// cannot import Concept (Concept imports diffConcepts from this module,
// creating a cycle). Instead, a spec (test/diff/field-sync.test.js)
// asserts the two stay in sync. Adding a new scalar metadata field
// requires editing both sites; forgetting one fails the test loudly.
//
// (Invariant N2 — TODO.hyperedges-v2/07.)
const CONCEPT_METADATA_FIELDS = Object.freeze([
  'status', 'term', 'uri', 'schemaVersion',
]);

const LOCALIZATION_METADATA_FIELDS = Object.freeze([
  'entryStatus', 'classification', 'reviewType', 'domain', 'release',
  'lineageSourceSimilarity', 'script', 'system',
  'reviewDate', 'reviewDecisionDate', 'reviewDecisionEvent',
  'reviewStatus', 'reviewDecision', 'reviewDecisionNotes',
]);

// Metadata field lists are sourced from the models per invariant N2.
// (See file-top comment about why they're duplicated rather than imported.)

export class DiffStats extends GlossaristModel {
  constructor(data: Record<string, unknown> = {}) {
    super();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._added = data.added ?? 0;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._removed = data.removed ?? 0;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._changed = data.changed ?? 0;
  }

  // @ts-expect-error TODO(Phase 2e): type this fully
  get added() { return this._added; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get removed() { return this._removed; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get changed() { return this._changed; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get total() { return this._added + this._removed + this._changed; }

  toJSON() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return { added: this._added, removed: this._removed, changed: this._changed };
  }

  static fromJSON(data) {
    return new DiffStats(data ?? {});
  }
}

export class MetadataDiff extends GlossaristModel {
  constructor(data: Record<string, unknown> = {}) {
    super();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._changes = {};
    const raw = data.changes ?? data ?? {};
    for (const [field, change] of Object.entries(raw)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._changes[field] = change instanceof Changed ? change : Changed.fromJSON(change);
    }
  }

  get changes() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._changes;
  }

  get hasChanges() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return Object.keys(this._changes).length > 0;
  }

  get count() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return Object.keys(this._changes).length;
  }

  *walk(section) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (const [field, change] of Object.entries(this._changes)) {
      const path = section ? `${section}.${field}` : field;
      yield { path, change };
    }
  }

  toJSON() {
    const obj = {};
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (const [field, change] of Object.entries(this._changes)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      obj[field] = change.toJSON();
    }
    return obj;
  }

  static fromJSON(data) {
    return new MetadataDiff({ changes: data ?? {} });
  }
}

export class ConceptLevelDiff extends GlossaristModel {
  constructor(data: Record<string, unknown> = {}) {
    super();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._sources = wrapListDiff(data.sources);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._dates = wrapListDiff(data.dates);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._relatedConcepts = wrapListDiff(data.relatedConcepts ?? data.related_concepts);
    // Unified hyperedge diff. Accepts:
    //   - data.relations                   (new unified shape)
    //   - data.partitiveRelations /
    //     data.partitive_relations /
    //     data.partitiveHyperedges /
    //     data.partitive_hyperedges        (legacy partitive-only shape)
    // Old diffs only had partitive, so the legacy fallback treats them
    // as a unified list with one type present.
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._relations = wrapListDiff(
      data.relations
        ?? data.partitiveRelations
        ?? data.partitive_relations
        ?? data.partitiveHyperedges
        ?? data.partitive_hyperedges,
    );
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._groups = wrapListDiff(data.groups);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._sections = wrapListDiff(data.sections);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._tags = wrapListDiff(data.tags);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._metadata = data.metadata instanceof MetadataDiff
      ? data.metadata
      : MetadataDiff.fromJSON(data.metadata ?? {});
  }

  // @ts-expect-error TODO(Phase 2e): type this fully
  get sources() { return this._sources; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get dates() { return this._dates; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get relatedConcepts() { return this._relatedConcepts; }
  /** Unified hyperedge diff (PartitiveHyperedge + GenericHyperedge). */
  // @ts-expect-error TODO(Phase 2e): type this fully
  get relations() { return this._relations; }
  /**
   * Filtered view of `relations` containing only PartitiveHyperedge
   * entries. Backward compat for callers that read .partitiveRelations
   * directly on a ConceptLevelDiff.
   */
  get partitiveRelations() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return filterListDiffByType(this._relations, PartitiveHyperedge);
  }
  /** @deprecated use .relations */ get partitiveHyperedges() { return this.partitiveRelations; }
  /**
   * Filtered view of `relations` containing only GenericHyperedge
   * entries. Backward compat for callers that read .genericRelations
   * directly on a ConceptLevelDiff.
   */
  get genericRelations() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return filterListDiffByType(this._relations, GenericHyperedge);
  }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get groups() { return this._groups; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get sections() { return this._sections; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get tags() { return this._tags; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get metadata() { return this._metadata; }

  get hasChanges() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._sources.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._dates.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._relatedConcepts.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._relations.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._groups.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._sections.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._tags.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._metadata.hasChanges;
  }

  *walk() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('concept.sources', this._sources);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('concept.dates', this._dates);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('concept.relatedConcepts', this._relatedConcepts);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('concept.relations', this._relations);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('concept.groups', this._groups);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('concept.sections', this._sections);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('concept.tags', this._tags);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* this._metadata.walk('concept.metadata');
  }

  toJSON() {
    return {
      // @ts-expect-error TODO(Phase 2e): type this fully
      sources: this._sources.toJSON(),
      // @ts-expect-error TODO(Phase 2e): type this fully
      dates: this._dates.toJSON(),
      // @ts-expect-error TODO(Phase 2e): type this fully
      related_concepts: this._relatedConcepts.toJSON(),
      // @ts-expect-error TODO(Phase 2e): type this fully
      relations: this._relations.toJSON(),
      // @ts-expect-error TODO(Phase 2e): type this fully
      groups: this._groups.toJSON(),
      // @ts-expect-error TODO(Phase 2e): type this fully
      sections: this._sections.toJSON(),
      // @ts-expect-error TODO(Phase 2e): type this fully
      tags: this._tags.toJSON(),
      // @ts-expect-error TODO(Phase 2e): type this fully
      metadata: this._metadata.toJSON(),
    };
  }

  static fromJSON(data) {
    return new ConceptLevelDiff(data);
  }
}

export class LocalizedConceptDiff extends GlossaristModel {
  constructor(data: Record<string, unknown> = {}) {
    super();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this.languageCode = data.languageCode ?? data.language_code ?? null;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._designations = wrapListDiff(data.designations);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._definitions = wrapListDiff(data.definitions);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._notes = wrapListDiff(data.notes);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._examples = wrapListDiff(data.examples);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._sources = wrapListDiff(data.sources);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._dates = wrapListDiff(data.dates);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._related = wrapListDiff(data.related);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._metadata = data.metadata instanceof MetadataDiff
      ? data.metadata
      : MetadataDiff.fromJSON(data.metadata ?? {});
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._totalItems = data.totalItems ?? data.total_items ?? 0;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._statsCache = undefined;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._similarityCache = undefined;
  }

  // @ts-expect-error TODO(Phase 2e): type this fully
  get designations() { return this._designations; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get definitions() { return this._definitions; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get notes() { return this._notes; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get examples() { return this._examples; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get sources() { return this._sources; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get dates() { return this._dates; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get related() { return this._related; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get metadata() { return this._metadata; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get totalItems() { return this._totalItems; }

  get hasChanges() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._designations.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._definitions.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._notes.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._examples.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._sources.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._dates.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._related.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._metadata.hasChanges;
  }

  get stats() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._statsCache === undefined) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._statsCache = collectStats(this.walk());
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._statsCache;
  }

  get similarity() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._similarityCache === undefined) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._similarityCache = computeSimilarity(this.stats.total, this._totalItems);
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._similarityCache;
  }

  *walk(prefix) {
    const base = prefix ?? '';
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList(`${base}.designations`, this._designations);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList(`${base}.definitions`, this._definitions);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList(`${base}.notes`, this._notes);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList(`${base}.examples`, this._examples);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList(`${base}.sources`, this._sources);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList(`${base}.dates`, this._dates);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList(`${base}.related`, this._related);
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* this._metadata.walk(`${base}.metadata`);
  }

  toJSON() {
    const obj = {};
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this.languageCode != null) obj.language_code = this.languageCode;
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.designations = this._designations.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.definitions = this._definitions.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.notes = this._notes.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.examples = this._examples.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.sources = this._sources.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.dates = this._dates.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.related = this._related.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.metadata = this._metadata.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.total_items = this._totalItems;
    return obj;
  }

  static fromJSON(data) {
    return new LocalizedConceptDiff(data);
  }
}

export class ConceptDiff extends GlossaristModel {
  constructor(data: Record<string, unknown> = {}) {
    super();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._oldId = data.oldId ?? data.old_id ?? null;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._newId = data.newId ?? data.new_id ?? null;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._concept = data.concept instanceof ConceptLevelDiff
      ? data.concept
      : ConceptLevelDiff.fromJSON(data.concept ?? {});
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._languages = wrapListDiff(data.languages);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._localizations = {};
    const raw = data.localizations ?? {};
    for (const [lang, lcDiff] of Object.entries(raw)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._localizations[lang] = lcDiff instanceof LocalizedConceptDiff
        ? lcDiff
        : LocalizedConceptDiff.fromJSON(lcDiff);
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._totalItems = data.totalItems ?? data.total_items ?? 0;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._statsCache = undefined;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._similarityCache = undefined;
  }

  // @ts-expect-error TODO(Phase 2e): type this fully
  get oldId() { return this._oldId; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get newId() { return this._newId; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get concept() { return this._concept; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get languages() { return this._languages; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get localizations() { return this._localizations; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get totalItems() { return this._totalItems; }

  get localizationLanguages() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return Object.keys(this._localizations);
  }

  get hasChanges() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._concept.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._languages.hasChanges
      // @ts-expect-error TODO(Phase 2e): type this fully
      || Object.values(this._localizations).some(lc => lc.hasChanges);
  }

  localization(lang) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._localizations[lang] ?? null;
  }

  get stats() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._statsCache === undefined) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._statsCache = collectStats(this.walk());
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._statsCache;
  }

  get similarity() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._similarityCache === undefined) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._similarityCache = computeSimilarity(this.stats.total, this._totalItems);
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._similarityCache;
  }

  *walk() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* this._concept.walk();
    // @ts-expect-error TODO(Phase 2e): type this fully
    yield* walkList('languages', this._languages);
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (const [lang, lc] of Object.entries(this._localizations)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      for (const { path, change } of lc.walk(`localizations.${lang}`)) {
        yield { path, change, language: lang };
      }
    }
  }

  toJSON() {
    const obj = {};
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._oldId != null) obj.old_id = this._oldId;
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._newId != null) obj.new_id = this._newId;
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.concept = this._concept.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.languages = this._languages.toJSON();
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.localizations = {};
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (const [lang, lc] of Object.entries(this._localizations)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      obj.localizations[lang] = lc.toJSON();
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    obj.total_items = this._totalItems;
    return obj;
  }

  static fromJSON(data) {
    return new ConceptDiff(data);
  }
}

export function diffConcepts(oldConcept, newConcept, language) {
  if (!oldConcept && !newConcept) {
    return new ConceptDiff({});
  }

  const oldId = oldConcept?.id ?? null;
  const newId = newConcept?.id ?? null;
  const oldLangs = oldConcept?.languages ?? [];
  const newLangs = newConcept?.languages ?? [];

  let langs;
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
    // No language specified: diff everything that exists. Avoids the
    // silent 'eng' fallback that masked changes in concepts without an
    // English localization.
    langs = union(oldLangs, newLangs);
  }

  const conceptDiff = diffConceptLevel(oldConcept ?? null, newConcept ?? null);
  const languageDiff = diffLanguageSets(oldLangs, newLangs);
  const localizations = {};
  for (const lang of langs) {
    const oldLoc = oldConcept?.localization(lang) ?? null;
    const newLoc = newConcept?.localization(lang) ?? null;
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

export function diffLocalizedConcepts(oldLoc, newLoc) {
  if (!oldLoc && !newLoc) {
    return new LocalizedConceptDiff({ languageCode: null });
  }

  const lang = newLoc?.languageCode ?? oldLoc?.languageCode ?? null;

  if (!oldLoc) {
    return fullyDiff(newLoc, lang, 'added');
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

function diffConceptLevel(oldConcept, newConcept) {
  if (!oldConcept && !newConcept) {
    return new ConceptLevelDiff({});
  }

  const Direction = !oldConcept ? 'added' : !newConcept ? 'removed' : null;

  if (Direction) {
    const c = (oldConcept ?? newConcept);
    return new ConceptLevelDiff({
      sources: fullListDiff(c.sources ?? [], Direction),
      dates: fullListDiff(c.dates ?? [], Direction),
      relatedConcepts: fullListDiff(c.relatedConcepts ?? [], Direction),
      relations: fullListDiff(c.relations ?? [], Direction),
      groups: fullListDiff(c.groups ?? [], Direction),
      sections: fullListDiff(c.sections ?? [], Direction),
      tags: fullListDiff(c.tags ?? [], Direction),
      metadata: fullMetadataDiff(c, CONCEPT_METADATA_FIELDS, Direction),
    });
  }

  return new ConceptLevelDiff({
    sources: diffSources(oldConcept.sources ?? [], newConcept.sources ?? []),
    dates: diffDates(oldConcept.dates ?? [], newConcept.dates ?? []),
    relatedConcepts: diffRelatedConcepts(oldConcept.relatedConcepts ?? [], newConcept.relatedConcepts ?? []),
    relations: diffHyperedges(
      oldConcept.relations ?? [],
      newConcept.relations ?? [],
    ),
    groups: diffStringSet(oldConcept.groups ?? [], newConcept.groups ?? []),
    sections: diffStringSet(oldConcept.sections ?? [], newConcept.sections ?? []),
    tags: diffStringSet(oldConcept.tags ?? [], newConcept.tags ?? []),
    metadata: diffMetadata(oldConcept, newConcept, CONCEPT_METADATA_FIELDS),
  });
}

function diffLanguageSets(oldLangs, newLangs) {
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

function fullyDiff(loc, lang, direction) {
  const ChangeClass = direction === 'added' ? Added : Removed;
  const key = direction;
  const lc = new LocalizedConceptDiff({
    languageCode: lang,
    designations: new ListDiff({ [key]: (loc.terms ?? []).map(v => new ChangeClass({ value: v })) }),
    definitions: new ListDiff({ [key]: (loc.definitions ?? []).map(v => new ChangeClass({ value: v })) }),
    notes: new ListDiff({ [key]: (loc.notes ?? []).map(v => new ChangeClass({ value: v })) }),
    examples: new ListDiff({ [key]: (loc.examples ?? []).map(v => new ChangeClass({ value: v })) }),
    sources: new ListDiff({ [key]: (loc.sources ?? []).map(v => new ChangeClass({ value: v })) }),
    dates: new ListDiff({ [key]: (loc.dates ?? []).map(v => new ChangeClass({ value: v })) }),
    related: new ListDiff({ [key]: (loc.related ?? []).map(v => new ChangeClass({ value: v })) }),
    metadata: fullMetadataDiff(loc, LOCALIZATION_METADATA_FIELDS, direction),
    totalItems: countLocalizedItems(direction === 'added' ? null : loc, direction === 'added' ? loc : null),
  });
  return lc;
}

function fullListDiff(items, direction) {
  const ChangeClass = direction === 'added' ? Added : Removed;
  return new ListDiff({ [direction]: items.map(v => new ChangeClass({ value: v })) });
}

function fullMetadataDiff(obj, fields, direction) {
  const changes = {};
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

function diffDesignations(oldTerms, newTerms) {
  return diffSet(oldTerms, newTerms, {
    identityKey: identityOf,
    // @ts-expect-error TODO(Phase 2e): type this fully
    textKey: d => d?.designation ?? '',
  });
}

function diffTextList(oldItems, newItems) {
  return diffList(oldItems, newItems, {
    // @ts-expect-error TODO(Phase 2e): type this fully
    textKey: d => d?.content ?? '',
  });
}

function diffSources(oldSources, newSources) {
  return diffSet(oldSources, newSources, {
    identityKey: identityOf,
  });
}

function diffDates(oldDates, newDates) {
  return diffSet(oldDates, newDates, {
    identityKey: identityOf,
    // @ts-expect-error TODO(Phase 2e): type this fully
    textKey: d => d?.date ?? '',
  });
}

function diffRelated(oldRelated, newRelated) {
  return diffSet(oldRelated, newRelated, {
    identityKey: identityOf,
  });
}

function diffRelatedConcepts(oldRC, newRC) {
  return diffSet(oldRC, newRC, {
    identityKey: identityOf,
  });
}

// Diff two unified hyperedge arrays. Identity is polymorphic —
// dispatches via value.constructor.identityOf so PartitiveHyperedge
// and GenericHyperedge (and any future hyperedge subclass) coexist in
// the same list. Cross-type entries with matching identity are still
// treated as different (because their constructor differs and they
// live under different wire keys).
function diffHyperedges(oldR, newR) {
  return diffSet(oldR, newR, {
    identityKey: relationIdentityOf,
    textKey: relationText,
  });
}

function relationIdentityOf(value) {
  if (value == null) return '';
  const Cls = value.constructor;
  if (typeof Cls?.identityOf === 'function') {
    const typed = Cls.identityOf(value);
    return `${Cls.name}::${typed}`;
  }
  return identityOf(value);
}

function filterListDiffByType(listDiff, Cls) {
  if (!listDiff) return listDiff;
  return new ListDiff({
    added: listDiff.added.filter(e => e.value instanceof Cls),
    removed: listDiff.removed.filter(e => e.value instanceof Cls),
    changed: listDiff.changed.filter(e =>
      (e.oldValue == null || e.oldValue instanceof Cls) &&
      (e.newValue == null || e.newValue instanceof Cls)),
  });
}

function relationText(r) {
  if (!r) return '';
  return canonicalJson(typeof r.toJSON === 'function' ? r.toJSON() : r);
}

function diffStringSet(oldStrings, newStrings) {
  return diffSet(oldStrings, newStrings, {
    identityKey: identityOf,
  });
}

function diffMetadata(oldObj, newObj, fields) {
  const changes = {};
  for (const field of fields) {
    const oldVal = oldObj[field];
    const newVal = newObj[field];
    if (oldVal !== newVal) {
      changes[field] = new Changed({ oldValue: oldVal, newValue: newVal });
    }
  }
  return new MetadataDiff({ changes });
}

function wrapListDiff(data) {
  if (data instanceof ListDiff) return data;
  return ListDiff.fromJSON(data ?? {});
}

function collectStats(walker) {
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

function maxOf(a, b) {
  return Math.max(a ?? 0, b ?? 0);
}

function countConceptItems(oldConcept, newConcept, langs) {
  let count = 0;

  count += maxOf(oldConcept?.sources?.length, newConcept?.sources?.length);
  count += maxOf(oldConcept?.dates?.length, newConcept?.dates?.length);
  count += maxOf(oldConcept?.relatedConcepts?.length, newConcept?.relatedConcepts?.length);
  count += maxOf(
    oldConcept?.relations?.length,
    newConcept?.relations?.length,
  );
  count += maxOf(oldConcept?.groups?.length, newConcept?.groups?.length);
  count += maxOf(oldConcept?.sections?.length, newConcept?.sections?.length);
  count += maxOf(oldConcept?.tags?.length, newConcept?.tags?.length);
  count += CONCEPT_METADATA_FIELDS.length;

  const oldLangs = oldConcept?.languages ?? [];
  const newLangs = newConcept?.languages ?? [];
  count += maxOf(oldLangs.length, newLangs.length);

  for (const lang of langs) {
    const oldLoc = oldConcept?.localization(lang) ?? null;
    const newLoc = newConcept?.localization(lang) ?? null;
    count += countLocalizedItems(oldLoc, newLoc);
  }

  return count;
}

function countLocalizedItems(oldLoc, newLoc) {
  let count = 0;
  count += maxOf(oldLoc?.terms?.length, newLoc?.terms?.length);
  count += maxOf(oldLoc?.definitions?.length, newLoc?.definitions?.length);
  count += maxOf(oldLoc?.notes?.length, newLoc?.notes?.length);
  count += maxOf(oldLoc?.examples?.length, newLoc?.examples?.length);
  count += maxOf(oldLoc?.sources?.length, newLoc?.sources?.length);
  count += maxOf(oldLoc?.dates?.length, newLoc?.dates?.length);
  count += maxOf(oldLoc?.related?.length, newLoc?.related?.length);
  count += LOCALIZATION_METADATA_FIELDS.length;
  return count;
}

function* walkList(section, listDiff) {
  for (let i = 0; i < listDiff.added.length; i++) {
    yield { path: `${section}.added[${i}]`, change: listDiff.added[i] };
  }
  for (let i = 0; i < listDiff.removed.length; i++) {
    yield { path: `${section}.removed[${i}]`, change: listDiff.removed[i] };
  }
  for (let i = 0; i < listDiff.changed.length; i++) {
    yield { path: `${section}.changed[${i}]`, change: listDiff.changed[i] };
  }
}

function union(a, b) {
  return [...new Set([...a, ...b])].sort();
}
