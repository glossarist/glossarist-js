import { GlossaristModel } from '../models/base.js';
import { Added, Removed, Matched, deserializeChange } from './change.js';
import { ConceptDiff, DiffStats, diffConcepts } from './concept-diff.js';
import { averageSimilarity } from './similarity.js';

export class ConceptCollectionDiff extends GlossaristModel {
  constructor(data: Record<string, unknown> = {}) {
    super();
    // @ts-expect-error TODO(Phase 2e): type this fully
    this.oldCount = data.oldCount ?? data.old_count ?? 0;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this.newCount = data.newCount ?? data.new_count ?? 0;

    // @ts-expect-error TODO(Phase 2e): type this fully
    this._matched = wrapIdList(data.matched, Matched);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._added = wrapIdList(data.added, Added);
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._removed = wrapIdList(data.removed, Removed);

    // @ts-expect-error TODO(Phase 2e): type this fully
    this._conceptDiffs = {};
    const raw = data.conceptDiffs ?? data.concept_diffs ?? {};
    for (const [id, diff] of Object.entries(raw)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._conceptDiffs[id] = diff instanceof ConceptDiff
        ? diff
        : ConceptDiff.fromJSON(diff);
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._statsCache = undefined;
    // @ts-expect-error TODO(Phase 2e): type this fully
    this._similarityCache = undefined;
  }

  // @ts-expect-error TODO(Phase 2e): type this fully
  get matched() { return this._matched; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get added() { return this._added; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get removed() { return this._removed; }
  // @ts-expect-error TODO(Phase 2e): type this fully
  get conceptDiffs() { return this._conceptDiffs; }

  get changedIds() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return Object.keys(this._conceptDiffs);
  }

  get hasChanges() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._added.length > 0
      // @ts-expect-error TODO(Phase 2e): type this fully
      || this._removed.length > 0
      // @ts-expect-error TODO(Phase 2e): type this fully
      || Object.values(this._conceptDiffs).some(d => d.hasChanges);
  }

  conceptDiff(id) {
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._conceptDiffs[id] ?? null;
  }

  get stats() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._statsCache === undefined) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      let added = this._added.length;
      // @ts-expect-error TODO(Phase 2e): type this fully
      let removed = this._removed.length;
      let changed = 0;
      // @ts-expect-error TODO(Phase 2e): type this fully
      for (const diff of Object.values(this._conceptDiffs)) {
        // @ts-expect-error TODO(Phase 2e): type this fully
        const s = diff.stats;
        added += s.added;
        removed += s.removed;
        changed += s.changed;
      }
      // @ts-expect-error TODO(Phase 2e): type this fully
      this._statsCache = new DiffStats({ added, removed, changed });
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._statsCache;
  }

  get similarity() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (this._similarityCache === undefined) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      if (this._matched.length === 0) {
        // @ts-expect-error TODO(Phase 2e): type this fully
        this._similarityCache = 0;
      } else {
        // @ts-expect-error TODO(Phase 2e): type this fully
        const values = this._matched.map(entry => {
          const id = entry.value;
          // @ts-expect-error TODO(Phase 2e): type this fully
          const diff = this._conceptDiffs[id];
          return diff ? diff.similarity : 1.0;
        });
        // @ts-expect-error TODO(Phase 2e): type this fully
        this._similarityCache = averageSimilarity(values);
      }
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    return this._similarityCache;
  }

  *walk() {
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (let i = 0; i < this._added.length; i++) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      yield { path: `added[${i}]`, change: this._added[i] };
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (let i = 0; i < this._removed.length; i++) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      yield { path: `removed[${i}]`, change: this._removed[i] };
    }
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (const [id, diff] of Object.entries(this._conceptDiffs)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      for (const entry of diff.walk()) {
        yield { path: `concepts.${id}.${entry.path}`, change: entry.change, conceptId: id, language: entry.language };
      }
    }
  }

  toJSON() {
    const obj = {
      // @ts-expect-error TODO(Phase 2e): type this fully
      old_count: this.oldCount,
      // @ts-expect-error TODO(Phase 2e): type this fully
      new_count: this.newCount,
      // @ts-expect-error TODO(Phase 2e): type this fully
      matched: this._matched.map(c => c.toJSON()),
      // @ts-expect-error TODO(Phase 2e): type this fully
      added: this._added.map(c => c.toJSON()),
      // @ts-expect-error TODO(Phase 2e): type this fully
      removed: this._removed.map(c => c.toJSON()),
      concept_diffs: {},
    };
    // @ts-expect-error TODO(Phase 2e): type this fully
    for (const [id, diff] of Object.entries(this._conceptDiffs)) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      obj.concept_diffs[id] = diff.toJSON();
    }
    return obj;
  }

  static fromJSON(data) {
    return new ConceptCollectionDiff(data);
  }
}

export function diffConceptCollections(oldCollection, newCollection, options = {}) {
  // @ts-expect-error TODO(Phase 2e): type this fully
  const language = options.language ?? 'eng';

  const oldConcepts = extractConcepts(oldCollection);
  const newConcepts = extractConcepts(newCollection);

  const oldMap = new Map(oldConcepts.map(c => [c.id, c]));
  const newMap = new Map(newConcepts.map(c => [c.id, c]));

  const oldIds = new Set(oldMap.keys());
  const newIds = new Set(newMap.keys());

  const matchedIds = [...newIds].filter(id => oldIds.has(id)).sort();
  const addedIds = [...newIds].filter(id => !oldIds.has(id)).sort();
  const removedIds = [...oldIds].filter(id => !newIds.has(id)).sort();

  const conceptDiffs = {};
  for (const id of matchedIds) {
    const oldConcept = oldMap.get(id);
    const newConcept = newMap.get(id);

    // @ts-expect-error TODO(Phase 2e): type this fully
    if (options.skipUnchanged && conceptsEqual(oldConcept, newConcept)) {
      continue;
    }

    const diff = diffConcepts(oldConcept, newConcept, language);
    // @ts-expect-error TODO(Phase 2e): type this fully
    if (diff.hasChanges || !options.skipUnchanged) {
      // @ts-expect-error TODO(Phase 2e): type this fully
      conceptDiffs[id] = diff;
    }
  }

  return new ConceptCollectionDiff({
    oldCount: oldConcepts.length,
    newCount: newConcepts.length,
    matched: matchedIds.map(id => new Matched({ value: id })),
    added: addedIds.map(id => new Added({ value: id })),
    removed: removedIds.map(id => new Removed({ value: id })),
    conceptDiffs,
  });
}

function extractConcepts(collection) {
  if (collection == null) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.toArray === 'function') return collection.toArray();
  if (Symbol.iterator in Object(collection)) return [...collection];
  return [];
}

function conceptsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a.equals === 'function' && typeof b.equals === 'function') {
    return a.equals(b);
  }
  return JSON.stringify(a?.toJSON?.()) === JSON.stringify(b?.toJSON?.());
}

// `wrapIdList` deserializes each entry via deserializeChange, which
// dispatches on `type`. The `expectedClass` parameter is a defensive
// check: if the entry's deserialized type doesn't match the slot it's
// being loaded into, throw. Prevents the round-1 bug where removed
// entries silently became Added after a JSON round-trip.
function wrapIdList(data, expectedClass) {
  if (!data) return [];
  return data.map(c => {
    if (c instanceof Added || c instanceof Removed || c instanceof Matched) {
      if (!(c instanceof expectedClass)) {
        throw new Error(
          `ConceptCollectionDiff: entry type ${c.constructor.name} ` +
          `does not match slot ${expectedClass.name}`,
        );
      }
      return c;
    }
    const deserialized = deserializeChange(c);
    if (!(deserialized instanceof expectedClass)) {
      throw new Error(
        `ConceptCollectionDiff: deserialized entry type ` +
        `${deserialized.constructor.name} does not match slot ${expectedClass.name}`,
      );
    }
    return deserialized;
  });
}
