import { GlossaristModel } from '../models/base.js';
import { Added, Removed, Changed } from './change.js';
import { ListDiff, diffList, diffSet } from './list-diff.js';

const METADATA_FIELDS = Object.freeze([
  'entryStatus',
  'classification',
  'reviewType',
  'domain',
  'release',
  'lineageSourceSimilarity',
  'script',
  'system',
  'reviewDate',
  'reviewDecisionDate',
  'reviewDecisionEvent',
  'reviewStatus',
  'reviewDecision',
  'reviewDecisionNotes',
]);

export class MetadataDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this._changes = {};
    const raw = data.changes ?? {};
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

  *walk(prefix = '') {
    for (const [field, change] of Object.entries(this._changes)) {
      const path = prefix ? `${prefix}.${field}` : field;
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

export class LocalizedConceptDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.languageCode = data.languageCode ?? data.language_code ?? null;
    this._designations = data.designations instanceof ListDiff
      ? data.designations
      : ListDiff.fromJSON(data.designations ?? {});
    this._definitions = data.definitions instanceof ListDiff
      ? data.definitions
      : ListDiff.fromJSON(data.definitions ?? {});
    this._notes = data.notes instanceof ListDiff
      ? data.notes
      : ListDiff.fromJSON(data.notes ?? {});
    this._examples = data.examples instanceof ListDiff
      ? data.examples
      : ListDiff.fromJSON(data.examples ?? {});
    this._sources = data.sources instanceof ListDiff
      ? data.sources
      : ListDiff.fromJSON(data.sources ?? {});
    this._dates = data.dates instanceof ListDiff
      ? data.dates
      : ListDiff.fromJSON(data.dates ?? {});
    this._related = data.related instanceof ListDiff
      ? data.related
      : ListDiff.fromJSON(data.related ?? {});
    this._metadata = data.metadata instanceof MetadataDiff
      ? data.metadata
      : MetadataDiff.fromJSON(data.metadata ?? {});
  }

  get designations() { return this._designations; }
  get definitions() { return this._definitions; }
  get notes() { return this._notes; }
  get examples() { return this._examples; }
  get sources() { return this._sources; }
  get dates() { return this._dates; }
  get related() { return this._related; }
  get metadata() { return this._metadata; }

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

  /**
   * Yield every change in this localization, each with a dotted path.
   * Entries are grouped by section: designations, definitions, notes,
   * examples, sources, dates, related, metadata.
   */
  *walk() {
    yield* walkList('designations', this._designations);
    yield* walkList('definitions', this._definitions);
    yield* walkList('notes', this._notes);
    yield* walkList('examples', this._examples);
    yield* walkList('sources', this._sources);
    yield* walkList('dates', this._dates);
    yield* walkList('related', this._related);
    yield* this._metadata.walk();
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
    return obj;
  }

  static fromJSON(data) {
    return new LocalizedConceptDiff(data);
  }
}

export class ConceptDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.oldId = data.oldId ?? data.old_id ?? null;
    this.newId = data.newId ?? data.new_id ?? null;
    this._localizations = {};
    const raw = data.localizations ?? {};
    for (const [lang, lcDiff] of Object.entries(raw)) {
      this._localizations[lang] = lcDiff instanceof LocalizedConceptDiff
        ? lcDiff
        : LocalizedConceptDiff.fromJSON(lcDiff);
    }
  }

  get localizations() {
    return this._localizations;
  }

  localization(lang) {
    return this._localizations[lang] ?? null;
  }

  get hasChanges() {
    return Object.values(this._localizations).some(lc => lc.hasChanges);
  }

  get languages() {
    return Object.keys(this._localizations);
  }

  *walk() {
    for (const [lang, lc] of Object.entries(this._localizations)) {
      for (const { path, change } of lc.walk()) {
        yield { path: `localizations.${lang}.${path}`, change, language: lang };
      }
    }
  }

  toJSON() {
    const obj = {};
    if (this.oldId != null) obj.old_id = this.oldId;
    if (this.newId != null) obj.new_id = this.newId;
    obj.localizations = {};
    for (const [lang, lc] of Object.entries(this._localizations)) {
      obj.localizations[lang] = lc.toJSON();
    }
    return obj;
  }

  static fromJSON(data) {
    return new ConceptDiff(data);
  }
}

export function diffConcepts(oldConcept, newConcept, language = 'eng') {
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
  } else if (oldLangs.includes(language) || newLangs.includes(language)) {
    langs = [language];
  } else if (oldLangs.length === 0 && newLangs.length === 0) {
    langs = [];
  } else {
    langs = ['eng'];
  }

  const localizations = {};
  for (const lang of langs) {
    const oldLoc = oldConcept?.localization(lang) ?? null;
    const newLoc = newConcept?.localization(lang) ?? null;
    localizations[lang] = diffLocalizedConcepts(oldLoc, newLoc);
  }

  return new ConceptDiff({ oldId, newId, localizations });
}

export function diffLocalizedConcepts(oldLoc, newLoc) {
  if (!oldLoc && !newLoc) {
    return emptyLocalizedConceptDiff(null);
  }

  const lang = newLoc?.languageCode ?? oldLoc?.languageCode ?? null;

  if (!oldLoc) {
    return fullyAddedDiff(newLoc, lang);
  }
  if (!newLoc) {
    return fullyRemovedDiff(oldLoc, lang);
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
    metadata: diffMetadata(oldLoc, newLoc),
  });
}

function emptyLocalizedConceptDiff(lang) {
  return new LocalizedConceptDiff({ languageCode: lang });
}

function fullyAddedDiff(loc, lang) {
  return new LocalizedConceptDiff({
    languageCode: lang,
    designations: new ListDiff({ added: (loc.terms ?? []).map(v => new Added({ value: v })) }),
    definitions: new ListDiff({ added: (loc.definitions ?? []).map(v => new Added({ value: v })) }),
    notes: new ListDiff({ added: (loc.notes ?? []).map(v => new Added({ value: v })) }),
    examples: new ListDiff({ added: (loc.examples ?? []).map(v => new Added({ value: v })) }),
    sources: new ListDiff({ added: (loc.sources ?? []).map(v => new Added({ value: v })) }),
    dates: new ListDiff({ added: (loc.dates ?? []).map(v => new Added({ value: v })) }),
    related: new ListDiff({ added: (loc.related ?? []).map(v => new Added({ value: v })) }),
    metadata: metadataFromFullObject(loc, true),
  });
}

function fullyRemovedDiff(loc, lang) {
  return new LocalizedConceptDiff({
    languageCode: lang,
    designations: new ListDiff({ removed: (loc.terms ?? []).map(v => new Removed({ value: v })) }),
    definitions: new ListDiff({ removed: (loc.definitions ?? []).map(v => new Removed({ value: v })) }),
    notes: new ListDiff({ removed: (loc.notes ?? []).map(v => new Removed({ value: v })) }),
    examples: new ListDiff({ removed: (loc.examples ?? []).map(v => new Removed({ value: v })) }),
    sources: new ListDiff({ removed: (loc.sources ?? []).map(v => new Removed({ value: v })) }),
    dates: new ListDiff({ removed: (loc.dates ?? []).map(v => new Removed({ value: v })) }),
    related: new ListDiff({ removed: (loc.related ?? []).map(v => new Removed({ value: v })) }),
    metadata: metadataFromFullObject(loc, false),
  });
}

function metadataFromFullObject(loc, added) {
  const changes = {};
  for (const field of METADATA_FIELDS) {
    const val = loc[field];
    if (val != null) {
      changes[field] = new Changed({
        oldValue: added ? null : val,
        newValue: added ? val : null,
      });
    }
  }
  return new MetadataDiff({ changes });
}

function diffDesignations(oldTerms, newTerms) {
  return diffSet(oldTerms, newTerms, {
    identityKey: designationIdentity,
    textKey: d => d?.designation ?? '',
  });
}

function designationIdentity(d) {
  const type = d?.type ?? 'expression';
  const text = String(d?.designation ?? '').toLowerCase().trim();
  return `${type}|${text}`;
}

function diffTextList(oldItems, newItems) {
  return diffList(oldItems, newItems, {
    identityKey: d => d?.content ?? '',
    textKey: d => d?.content ?? '',
  });
}

function diffSources(oldSources, newSources) {
  return diffSet(oldSources, newSources, {
    identityKey: sourceIdentity,
  });
}

function sourceIdentity(s) {
  const ref = s?.origin?.ref;
  const source = ref?.source ?? '';
  const id = ref?.id ?? '';
  const type = s?.type ?? '';
  return `${type}|${source}|${id}`;
}

function diffDates(oldDates, newDates) {
  return diffSet(oldDates, newDates, {
    identityKey: d => d?.type ?? '',
    textKey: d => d?.date ?? '',
  });
}

function diffRelated(oldRelated, newRelated) {
  return diffSet(oldRelated, newRelated, {
    identityKey: r => `${r?.type ?? ''}|${r?.ref?.source ?? ''}|${r?.ref?.id ?? ''}`,
  });
}

function diffMetadata(oldLoc, newLoc) {
  const changes = {};
  for (const field of METADATA_FIELDS) {
    const oldVal = oldLoc[field];
    const newVal = newLoc[field];
    if (oldVal !== newVal) {
      changes[field] = new Changed({ oldValue: oldVal, newValue: newVal });
    }
  }
  return new MetadataDiff({ changes });
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
