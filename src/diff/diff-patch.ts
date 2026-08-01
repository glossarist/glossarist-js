import { Concept } from '../models/concept.js';
import { ConceptSource } from '../models/concept-source.js';
import { ConceptDate } from '../models/concept-date.js';
import { RelatedConcept } from '../models/related-concept.js';
import { Designation } from '../models/designation.js';
import { DetailedDefinition } from '../models/detailed-definition.js';
import { HyperedgeRegistry } from '../models/hyperedge-registry.js';
import { Added, Removed, Changed } from './change.js';
import { ListDiff } from './list-diff.js';
import { TextDiff, TextHunk } from './text-diff.js';
import { identityOf } from './identity.js';
import {
  ConceptDiff,
  ConceptLevelDiff,
  LocalizedConceptDiff,
  MetadataDiff,
} from './concept-diff.js';

// Wire-name (camelCase JS field → snake_case JSON key) for metadata
// fields patched onto Concept and LocalizedConcept.
//
// These mirror `Concept.wireNameFor` / `LocalizedConcept.wireNameFor`.
// The duplication is intentional: diff-patch.js cannot import those
// models lazily without making applyDiff async (a breaking API change),
// and the field set is small and stable. A spec
// (test/diff/field-sync.test.js) asserts the two stay in sync.

const CONCEPT_METADATA_JSON_KEYS = Object.freeze({
  status: 'status',
  term: 'term',
  uri: 'uri',
  schemaVersion: 'schema_version',
});

const LOC_METADATA_JSON_KEYS = Object.freeze({
  entryStatus: 'entry_status',
  classification: 'classification',
  reviewType: 'review_type',
  domain: 'domain',
  release: 'release',
  lineageSourceSimilarity: 'lineage_source_similarity',
  script: 'script',
  system: 'system',
  reviewDate: 'review_date',
  reviewDecisionDate: 'review_decision_date',
  reviewDecisionEvent: 'review_decision_event',
  reviewStatus: 'review_status',
  reviewDecision: 'review_decision',
  reviewDecisionNotes: 'review_decision_notes',
});

export function applyDiff(oldConcept: Concept, diff: ConceptDiff): Concept {
  const json = oldConcept.toJSON() as Record<string, unknown>;

  applyConceptLevelPatch(json, diff.concept);
  applyLanguagePatch(json, diff);

  for (const [lang, lcDiff] of Object.entries(diff.localizations)) {
    applyLocalizedPatch(json, lang, lcDiff);
  }

  return Concept.fromJSON(json);
}

export function reverseDiff(diff: ConceptDiff): ConceptDiff {
  const concept = new ConceptLevelDiff({
    sources: reverseListDiff(diff.concept.sources),
    dates: reverseListDiff(diff.concept.dates),
    relatedConcepts: reverseListDiff(diff.concept.relatedConcepts),
    relations: reverseListDiff(diff.concept.relations),
    groups: reverseListDiff(diff.concept.groups),
    sections: reverseListDiff(diff.concept.sections),
    tags: reverseListDiff(diff.concept.tags),
    metadata: reverseMetadataDiff(diff.concept.metadata),
  });

  const languages = reverseListDiff(diff.languages);

  const localizations: Record<string, LocalizedConceptDiff> = {};
  for (const [lang, lcDiff] of Object.entries(diff.localizations)) {
    localizations[lang] = new LocalizedConceptDiff({
      languageCode: lcDiff.languageCode,
      designations: reverseListDiff(lcDiff.designations),
      definitions: reverseListDiff(lcDiff.definitions),
      notes: reverseListDiff(lcDiff.notes),
      examples: reverseListDiff(lcDiff.examples),
      sources: reverseListDiff(lcDiff.sources),
      dates: reverseListDiff(lcDiff.dates),
      related: reverseListDiff(lcDiff.related),
      metadata: reverseMetadataDiff(lcDiff.metadata),
      totalItems: lcDiff.totalItems,
    });
  }

  return new ConceptDiff({
    oldId: diff.newId,
    newId: diff.oldId,
    concept,
    languages,
    localizations,
    totalItems: diff.totalItems,
  });
}

function applyConceptLevelPatch(json: Record<string, unknown>, conceptDiff: ConceptLevelDiff): void {
  json.sources = applyListPatch((json.sources as readonly unknown[]) ?? [], conceptDiff.sources, (v: unknown) => ConceptSource.identityOf(v as ConceptSource));
  json.dates = applyListPatch((json.dates as readonly unknown[]) ?? [], conceptDiff.dates, (v: unknown) => ConceptDate.identityOf(v as ConceptDate));
  json.related = applyListPatch((json.related as readonly unknown[]) ?? [], conceptDiff.relatedConcepts, (v: unknown) => RelatedConcept.identityOf(v as RelatedConcept));

  for (const cls of HyperedgeRegistry.allClasses()) {
    const partition = partitionListDiff(conceptDiff.relations, cls as unknown as new (...args: never[]) => unknown);
    if (!partition.hasChanges) continue;
    const wireKey = cls.wireKey;
    const v1ReadKeys = cls.v1WireKeys ?? [];
    const existing = v1ReadKeys
      .map(k => json[k])
      .find(arr => Array.isArray(arr)) ?? json[wireKey] ?? [];
    const classIdentityOf = (cls as unknown as { identityOf?: (v: unknown) => string }).identityOf;
    json[wireKey] = applyListPatch(existing as readonly unknown[], partition, classIdentityOf ?? identityOf);
    for (const k of v1ReadKeys) {
      if (json[k] != null && json[wireKey] != null) delete json[k];
    }
  }

  json.tags = applyListPatch((json.tags as readonly unknown[]) ?? [], conceptDiff.tags, identityOf);

  applyMetadataPatch(json, conceptDiff.metadata, CONCEPT_METADATA_JSON_KEYS);
}

function applyLanguagePatch(json: Record<string, unknown>, conceptDiff: ConceptDiff): void {
  const localizations = (json.localizations ?? {}) as Record<string, unknown>;
  json.localizations = localizations;
  for (const entry of conceptDiff.languages.added) {
    const val = String(entry.value);
    if (!(val in localizations)) {
      localizations[val] = {};
    }
  }
  for (const entry of conceptDiff.languages.removed) {
    delete localizations[String(entry.value)];
  }
}

function applyLocalizedPatch(json: Record<string, unknown>, lang: string, lcDiff: LocalizedConceptDiff): void {
  const localizations = (json.localizations ?? {}) as Record<string, Record<string, unknown>>;
  json.localizations = localizations;
  if (!(lang in localizations)) {
    localizations[lang] = {};
  }
  const loc = localizations[lang]!;

  loc.terms = applyListPatch((loc.terms as readonly unknown[]) ?? [], lcDiff.designations, (v: unknown) => Designation.identityOf(v as Designation));
  loc.definition = applyListPatch((loc.definition as readonly unknown[]) ?? [], lcDiff.definitions, (v: unknown) => DetailedDefinition.identityOf(v as DetailedDefinition));
  loc.notes = applyListPatch((loc.notes as readonly unknown[]) ?? [], lcDiff.notes, (v: unknown) => DetailedDefinition.identityOf(v as DetailedDefinition));
  loc.examples = applyListPatch((loc.examples as readonly unknown[]) ?? [], lcDiff.examples, (v: unknown) => DetailedDefinition.identityOf(v as DetailedDefinition));
  loc.sources = applyListPatch((loc.sources as readonly unknown[]) ?? [], lcDiff.sources, (v: unknown) => ConceptSource.identityOf(v as ConceptSource));
  loc.dates = applyListPatch((loc.dates as readonly unknown[]) ?? [], lcDiff.dates, (v: unknown) => ConceptDate.identityOf(v as ConceptDate));
  loc.related = applyListPatch((loc.related as readonly unknown[]) ?? [], lcDiff.related, (v: unknown) => RelatedConcept.identityOf(v as RelatedConcept));

  applyMetadataPatch(loc, lcDiff.metadata, LOC_METADATA_JSON_KEYS);
}

function applyListPatch(existingItems: readonly unknown[], listDiff: ListDiff, identityFn?: (v: unknown) => string): unknown[] {
  const fn = identityFn ?? identityOf;
  let result = [...existingItems];

  for (const entry of listDiff.added) {
    result.push(toJsonValue(entry.value));
  }

  for (const entry of listDiff.removed) {
    const targetKey = fn(entry.value);
    result = result.filter(item => fn(item) !== targetKey);
  }

  for (const entry of listDiff.changed) {
    const oldKey = fn(entry.oldValue);
    result = result.map(item =>
      fn(item) === oldKey ? toJsonValue(entry.newValue) : item,
    );
  }

  return result;
}

function applyMetadataPatch(target: Record<string, unknown>, metadataDiff: MetadataDiff, keyMap: Record<string, string>): void {
  for (const [field, change] of Object.entries(metadataDiff.changes)) {
    const jsonKey = keyMap[field];
    if (!jsonKey) continue;
    if (change.newValue == null) {
      delete target[jsonKey];
    } else {
      target[jsonKey] = change.newValue;
    }
  }
}

function reverseListDiff(listDiff: ListDiff): ListDiff {
  const added = listDiff.removed.map(r => new Added({ value: r.value, path: r.path }));
  const removed = listDiff.added.map(a => new Removed({ value: a.value, path: a.path }));
  const changed = listDiff.changed.map(c => new Changed({
    oldValue: c.newValue,
    newValue: c.oldValue,
    textDiff: c.textDiff ? reverseTextDiff(c.textDiff) : undefined,
    path: c.path,
  }));
  return new ListDiff({ added, removed, changed });
}

function reverseMetadataDiff(metadataDiff: MetadataDiff): MetadataDiff {
  const changes: Record<string, Changed> = {};
  for (const [field, change] of Object.entries(metadataDiff.changes)) {
    changes[field] = new Changed({
      oldValue: change.newValue,
      newValue: change.oldValue,
    });
  }
  return new MetadataDiff({ changes });
}

function reverseTextDiff(textDiff: TextDiff): TextDiff {
  const hunks = textDiff.hunks.map(h => {
    if (h.type === 'added') return new TextHunk({ type: 'removed', text: h.text });
    if (h.type === 'removed') return new TextHunk({ type: 'added', text: h.text });
    return new TextHunk({ type: 'equal', text: h.text });
  });
  return new TextDiff({
    oldText: textDiff.newText,
    newText: textDiff.oldText,
    hunks,
  });
}

function toJsonValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  const v = value as { toJSON?: () => unknown };
  if (typeof v.toJSON === 'function') return v.toJSON();
  return value;
}

export function partitionListDiff(listDiff: ListDiff | null | undefined, Cls: new (...args: never[]) => unknown): ListDiff {
  if (!listDiff) return new ListDiff({ added: [], removed: [], changed: [] });
  return new ListDiff({
    added: listDiff.added.filter(e => e.value instanceof Cls),
    removed: listDiff.removed.filter(e => e.value instanceof Cls),
    changed: listDiff.changed.filter(e =>
      (e.oldValue == null || e.oldValue instanceof Cls) &&
      (e.newValue == null || e.newValue instanceof Cls)),
  });
}
