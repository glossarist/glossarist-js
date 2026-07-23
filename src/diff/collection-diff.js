import { GlossaristModel } from '../models/base.js';
import { Added, Removed, Matched, deserializeChange } from './change.js';
import { ConceptDiff, DiffStats, diffConcepts } from './concept-diff.js';
import { averageSimilarity } from './similarity.js';

export class ConceptCollectionDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.oldCount = data.oldCount ?? data.old_count ?? 0;
    this.newCount = data.newCount ?? data.new_count ?? 0;

    this._matched = wrapIdList(data.matched, Matched);
    this._added = wrapIdList(data.added, Added);
    this._removed = wrapIdList(data.removed, Removed);

    this._conceptDiffs = {};
    const raw = data.conceptDiffs ?? data.concept_diffs ?? {};
    for (const [id, diff] of Object.entries(raw)) {
      this._conceptDiffs[id] = diff instanceof ConceptDiff
        ? diff
        : ConceptDiff.fromJSON(diff);
    }
    this._statsCache = undefined;
    this._similarityCache = undefined;
  }

  get matched() { return this._matched; }
  get added() { return this._added; }
  get removed() { return this._removed; }
  get conceptDiffs() { return this._conceptDiffs; }

  get changedIds() {
    return Object.keys(this._conceptDiffs);
  }

  get hasChanges() {
    return this._added.length > 0
      || this._removed.length > 0
      || Object.values(this._conceptDiffs).some(d => d.hasChanges);
  }

  conceptDiff(id) {
    return this._conceptDiffs[id] ?? null;
  }

  get stats() {
    if (this._statsCache === undefined) {
      let added = this._added.length;
      let removed = this._removed.length;
      let changed = 0;
      for (const diff of Object.values(this._conceptDiffs)) {
        const s = diff.stats;
        added += s.added;
        removed += s.removed;
        changed += s.changed;
      }
      this._statsCache = new DiffStats({ added, removed, changed });
    }
    return this._statsCache;
  }

  get similarity() {
    if (this._similarityCache === undefined) {
      if (this._matched.length === 0) {
        this._similarityCache = 0;
      } else {
        const values = this._matched.map(entry => {
          const id = entry.value;
          const diff = this._conceptDiffs[id];
          return diff ? diff.similarity : 1.0;
        });
        this._similarityCache = averageSimilarity(values);
      }
    }
    return this._similarityCache;
  }

  *walk() {
    for (let i = 0; i < this._added.length; i++) {
      yield { path: `added[${i}]`, change: this._added[i] };
    }
    for (let i = 0; i < this._removed.length; i++) {
      yield { path: `removed[${i}]`, change: this._removed[i] };
    }
    for (const [id, diff] of Object.entries(this._conceptDiffs)) {
      for (const entry of diff.walk()) {
        yield { path: `concepts.${id}.${entry.path}`, change: entry.change, conceptId: id, language: entry.language };
      }
    }
  }

  toJSON() {
    const obj = {
      old_count: this.oldCount,
      new_count: this.newCount,
      matched: this._matched.map(c => c.toJSON()),
      added: this._added.map(c => c.toJSON()),
      removed: this._removed.map(c => c.toJSON()),
      concept_diffs: {},
    };
    for (const [id, diff] of Object.entries(this._conceptDiffs)) {
      obj.concept_diffs[id] = diff.toJSON();
    }
    return obj;
  }

  static fromJSON(data) {
    return new ConceptCollectionDiff(data);
  }
}

export function diffConceptCollections(oldCollection, newCollection, options = {}) {
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

    if (options.skipUnchanged && conceptsEqual(oldConcept, newConcept)) {
      continue;
    }

    const diff = diffConcepts(oldConcept, newConcept, language);
    if (diff.hasChanges || !options.skipUnchanged) {
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
