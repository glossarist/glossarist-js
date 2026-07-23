import { GlossaristModel } from '../models/base.js';
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
  constructor(data = {}) {
    super();
    this._added = data.added ?? 0;
    this._removed = data.removed ?? 0;
    this._changed = data.changed ?? 0;
  }

  get added() { return this._added; }
  get removed() { return this._removed; }
  get changed() { return this._changed; }
  get total() { return this._added + this._removed + this._changed; }

  toJSON() {
    return { added: this._added, removed: this._removed, changed: this._changed };
  }

  static fromJSON(data) {
    return new DiffStats(data ?? {});
  }
}

export class MetadataDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this._changes = {};
    const raw = data.changes ?? data ?? {};
    for (const [field, change] of Object.entries(raw)) {
      this._changes[field] = change instanceof Changed ? change : Changed.fromJSON(change);
    }
  }

  get changes() {
    return this._changes;
  }

  get hasChanges() {
    return Object.keys(this._changes).length > 0;
  }

  get count() {
    return Object.keys(this._changes).length;
  }

  *walk(section) {
    for (const [field, change] of Object.entries(this._changes)) {
      const path = section ? `${section}.${field}` : field;
      yield { path, change };
    }
  }

  toJSON() {
    const obj = {};
    for (const [field, change] of Object.entries(this._changes)) {
      obj[field] = change.toJSON();
    }
    return obj;
  }

  static fromJSON(data) {
    return new MetadataDiff({ changes: data ?? {} });
  }
}

export class ConceptLevelDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this._sources = wrapListDiff(data.sources);
    this._dates = wrapListDiff(data.dates);
    this._relatedConcepts = wrapListDiff(data.relatedConcepts ?? data.related_concepts);
    // v2 canonical name is partitiveRelations. Accept v1 names
    // (partitiveHyperedges / partitive_hyperedges) for backward compat
    // with diffs serialized by older glossarist-js versions.
    this._partitiveRelations = wrapListDiff(
      data.partitiveRelations
        ?? data.partitive_relations
        ?? data.partitiveHyperedges
        ?? data.partitive_hyperedges,
    );
    this._groups = wrapListDiff(data.groups);
    this._sections = wrapListDiff(data.sections);
    this._tags = wrapListDiff(data.tags);
    this._metadata = data.metadata instanceof MetadataDiff
      ? data.metadata
      : MetadataDiff.fromJSON(data.metadata ?? {});
  }

  get sources() { return this._sources; }
  get dates() { return this._dates; }
  get relatedConcepts() { return this._relatedConcepts; }
  get partitiveRelations() { return this._partitiveRelations; }
  /** @deprecated use partitiveRelations */ get partitiveHyperedges() { return this._partitiveRelations; }
  get groups() { return this._groups; }
  get sections() { return this._sections; }
  get tags() { return this._tags; }
  get metadata() { return this._metadata; }

  get hasChanges() {
    return this._sources.hasChanges
      || this._dates.hasChanges
      || this._relatedConcepts.hasChanges
      || this._partitiveRelations.hasChanges
      || this._groups.hasChanges
      || this._sections.hasChanges
      || this._tags.hasChanges
      || this._metadata.hasChanges;
  }

  *walk() {
    yield* walkList('concept.sources', this._sources);
    yield* walkList('concept.dates', this._dates);
    yield* walkList('concept.relatedConcepts', this._relatedConcepts);
    yield* walkList('concept.partitiveRelations', this._partitiveRelations);
    yield* walkList('concept.groups', this._groups);
    yield* walkList('concept.sections', this._sections);
    yield* walkList('concept.tags', this._tags);
    yield* this._metadata.walk('concept.metadata');
  }

  toJSON() {
    return {
      sources: this._sources.toJSON(),
      dates: this._dates.toJSON(),
      related_concepts: this._relatedConcepts.toJSON(),
      partitive_relations: this._partitiveRelations.toJSON(),
      groups: this._groups.toJSON(),
      sections: this._sections.toJSON(),
      tags: this._tags.toJSON(),
      metadata: this._metadata.toJSON(),
    };
  }

  static fromJSON(data) {
    return new ConceptLevelDiff(data);
  }
}

export class LocalizedConceptDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.languageCode = data.languageCode ?? data.language_code ?? null;
    this._designations = wrapListDiff(data.designations);
    this._definitions = wrapListDiff(data.definitions);
    this._notes = wrapListDiff(data.notes);
    this._examples = wrapListDiff(data.examples);
    this._sources = wrapListDiff(data.sources);
    this._dates = wrapListDiff(data.dates);
    this._related = wrapListDiff(data.related);
    this._metadata = data.metadata instanceof MetadataDiff
      ? data.metadata
      : MetadataDiff.fromJSON(data.metadata ?? {});
    this._totalItems = data.totalItems ?? data.total_items ?? 0;
    this._statsCache = undefined;
    this._similarityCache = undefined;
  }

  get designations() { return this._designations; }
  get definitions() { return this._definitions; }
  get notes() { return this._notes; }
  get examples() { return this._examples; }
  get sources() { return this._sources; }
  get dates() { return this._dates; }
  get related() { return this._related; }
  get metadata() { return this._metadata; }
  get totalItems() { return this._totalItems; }

  get hasChanges() {
    return this._designations.hasChanges
      || this._definitions.hasChanges
      || this._notes.hasChanges
      || this._examples.hasChanges
      || this._sources.hasChanges
      || this._dates.hasChanges
      || this._related.hasChanges
      || this._metadata.hasChanges;
  }

  get stats() {
    if (this._statsCache === undefined) {
      this._statsCache = collectStats(this.walk());
    }
    return this._statsCache;
  }

  get similarity() {
    if (this._similarityCache === undefined) {
      this._similarityCache = computeSimilarity(this.stats.total, this._totalItems);
    }
    return this._similarityCache;
  }

  *walk(prefix) {
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

  toJSON() {
    const obj = {};
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

  static fromJSON(data) {
    return new LocalizedConceptDiff(data);
  }
}

export class ConceptDiff extends GlossaristModel {
  constructor(data = {}) {
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

  get oldId() { return this._oldId; }
  get newId() { return this._newId; }
  get concept() { return this._concept; }
  get languages() { return this._languages; }
  get localizations() { return this._localizations; }
  get totalItems() { return this._totalItems; }

  get localizationLanguages() {
    return Object.keys(this._localizations);
  }

  get hasChanges() {
    return this._concept.hasChanges
      || this._languages.hasChanges
      || Object.values(this._localizations).some(lc => lc.hasChanges);
  }

  localization(lang) {
    return this._localizations[lang] ?? null;
  }

  get stats() {
    if (this._statsCache === undefined) {
      this._statsCache = collectStats(this.walk());
    }
    return this._statsCache;
  }

  get similarity() {
    if (this._similarityCache === undefined) {
      this._similarityCache = computeSimilarity(this.stats.total, this._totalItems);
    }
    return this._similarityCache;
  }

  *walk() {
    yield* this._concept.walk();
    yield* walkList('languages', this._languages);
    for (const [lang, lc] of Object.entries(this._localizations)) {
      for (const { path, change } of lc.walk(`localizations.${lang}`)) {
        yield { path, change, language: lang };
      }
    }
  }

  toJSON() {
    const obj = {};
    if (this._oldId != null) obj.old_id = this._oldId;
    if (this._newId != null) obj.new_id = this._newId;
    obj.concept = this._concept.toJSON();
    obj.languages = this._languages.toJSON();
    obj.localizations = {};
    for (const [lang, lc] of Object.entries(this._localizations)) {
      obj.localizations[lang] = lc.toJSON();
    }
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
      partitiveRelations: fullListDiff(c.partitiveRelations ?? c.partitiveHyperedges ?? [], Direction),
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
    partitiveRelations: diffPartitiveRelations(
      oldConcept.partitiveRelations ?? oldConcept.partitiveHyperedges ?? [],
      newConcept.partitiveRelations ?? newConcept.partitiveHyperedges ?? [],
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
    textKey: d => d?.designation ?? '',
  });
}

function diffTextList(oldItems, newItems) {
  return diffList(oldItems, newItems, {
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

function diffPartitiveRelations(oldR, newR) {
  return diffSet(oldR, newR, {
    identityKey: identityOf,
    textKey: relationText,
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
    oldConcept?.partitiveRelations?.length ?? oldConcept?.partitiveHyperedges?.length,
    newConcept?.partitiveRelations?.length ?? newConcept?.partitiveHyperedges?.length,
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
