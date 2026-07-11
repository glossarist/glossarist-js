import { Concept } from '../models/concept.js';
import { Added, Removed, Changed } from './change.js';
import { ListDiff } from './list-diff.js';
import { TextDiff, TextHunk } from './text-diff.js';
import {
  ConceptDiff,
  ConceptLevelDiff,
  LocalizedConceptDiff,
  MetadataDiff,
} from './concept-diff.js';

const CONCEPT_METADATA_JSON_KEYS = {
  status: 'status',
  term: 'term',
  uri: 'uri',
  schemaVersion: 'schema_version',
};

const LOC_METADATA_JSON_KEYS = {
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
};

export function applyDiff(oldConcept, diff) {
  const json = oldConcept.toJSON();

  applyConceptLevelPatch(json, diff.concept);
  applyLanguagePatch(json, diff);

  for (const [lang, lcDiff] of Object.entries(diff.localizations)) {
    applyLocalizedPatch(json, lang, lcDiff);
  }

  return Concept.fromJSON(json);
}

export function reverseDiff(diff) {
  const concept = new ConceptLevelDiff({
    sources: reverseListDiff(diff.concept.sources),
    dates: reverseListDiff(diff.concept.dates),
    relatedConcepts: reverseListDiff(diff.concept.relatedConcepts),
    groups: reverseListDiff(diff.concept.groups),
    sections: reverseListDiff(diff.concept.sections),
    tags: reverseListDiff(diff.concept.tags),
    metadata: reverseMetadataDiff(diff.concept.metadata),
  });

  const languages = reverseListDiff(diff.languages);

  const localizations = {};
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
      totalItems: lcDiff._totalItems,
    });
  }

  return new ConceptDiff({
    oldId: diff.newId,
    newId: diff.oldId,
    concept,
    languages,
    localizations,
    totalItems: diff._totalItems,
  });
}

function applyConceptLevelPatch(json, conceptDiff) {
  json.sources = applyListPatch(json.sources ?? [], conceptDiff.sources, sourceIdentity);
  json.dates = applyListPatch(json.dates ?? [], conceptDiff.dates, dateIdentity);
  json.related = applyListPatch(json.related ?? [], conceptDiff.relatedConcepts, relatedIdentity);

  json.tags = applyListPatch(json.tags ?? [], conceptDiff.tags, s => String(s));

  applyMetadataPatch(json, conceptDiff.metadata, CONCEPT_METADATA_JSON_KEYS);
}

function applyLanguagePatch(json, conceptDiff) {
  if (!json.localizations) json.localizations = {};
  for (const entry of conceptDiff.languages.added) {
    if (!(entry.value in json.localizations)) {
      json.localizations[entry.value] = {};
    }
  }
  for (const entry of conceptDiff.languages.removed) {
    delete json.localizations[entry.value];
  }
}

function applyLocalizedPatch(json, lang, lcDiff) {
  if (!json.localizations) json.localizations = {};
  if (!(lang in json.localizations)) {
    json.localizations[lang] = {};
  }
  const loc = json.localizations[lang];

  loc.terms = applyListPatch(loc.terms ?? [], lcDiff.designations, designationIdentity);
  loc.definition = applyListPatch(loc.definition ?? [], lcDiff.definitions, definitionIdentity);
  loc.notes = applyListPatch(loc.notes ?? [], lcDiff.notes, definitionIdentity);
  loc.examples = applyListPatch(loc.examples ?? [], lcDiff.examples, definitionIdentity);
  loc.sources = applyListPatch(loc.sources ?? [], lcDiff.sources, sourceIdentity);
  loc.dates = applyListPatch(loc.dates ?? [], lcDiff.dates, dateIdentity);
  loc.related = applyListPatch(loc.related ?? [], lcDiff.related, relatedIdentity);

  applyMetadataPatch(loc, lcDiff.metadata, LOC_METADATA_JSON_KEYS);
}

function applyListPatch(existingItems, listDiff, identityFn) {
  let result = [...existingItems];

  for (const entry of listDiff.added) {
    result.push(toJsonValue(entry.value));
  }

  for (const entry of listDiff.removed) {
    const targetKey = identityFn(entry.value);
    result = result.filter(item => identityFn(item) !== targetKey);
  }

  for (const entry of listDiff.changed) {
    const oldKey = identityFn(entry.oldValue);
    result = result.map(item =>
      identityFn(item) === oldKey ? toJsonValue(entry.newValue) : item,
    );
  }

  return result;
}

function applyMetadataPatch(target, metadataDiff, keyMap) {
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

function reverseListDiff(listDiff) {
  const added = listDiff.removed.map(r => new Added({ value: r.value, path: r.path }));
  const removed = listDiff.added.map(a => new Removed({ value: a.value, path: a.path }));
  const changed = listDiff.changed.map(c => new Changed({
    oldValue: c.newValue,
    newValue: c.oldValue,
    textDiff: c.textDiff ? reverseTextDiff(c.textDiff) : null,
    path: c.path,
  }));
  return new ListDiff({ added, removed, changed });
}

function reverseMetadataDiff(metadataDiff) {
  const changes = {};
  for (const [field, change] of Object.entries(metadataDiff.changes)) {
    changes[field] = new Changed({
      oldValue: change.newValue,
      newValue: change.oldValue,
    });
  }
  return new MetadataDiff({ changes });
}

function reverseTextDiff(textDiff) {
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

function toJsonValue(value) {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value.toJSON === 'function') return value.toJSON();
  return value;
}

function designationIdentity(d) {
  const data = typeof d?.toJSON === 'function' ? d.toJSON() : d ?? {};
  const type = data.type ?? 'expression';
  const text = String(data.designation ?? '').toLowerCase().trim();
  return `${type}|${text}`;
}

function definitionIdentity(d) {
  const data = typeof d?.toJSON === 'function' ? d.toJSON() : d ?? {};
  return JSON.stringify(data);
}

function sourceIdentity(s) {
  const data = typeof s?.toJSON === 'function' ? s.toJSON() : s ?? {};
  const ref = data.origin?.ref;
  return `${data.type ?? ''}|${ref?.source ?? ''}|${ref?.id ?? ''}`;
}

function dateIdentity(d) {
  const data = typeof d?.toJSON === 'function' ? d.toJSON() : d ?? {};
  return data.type ?? '';
}

function relatedIdentity(r) {
  const data = typeof r?.toJSON === 'function' ? r.toJSON() : r ?? {};
  const ref = data.ref;
  return `${data.type ?? ''}|${ref?.source ?? ''}|${ref?.id ?? ''}`;
}
