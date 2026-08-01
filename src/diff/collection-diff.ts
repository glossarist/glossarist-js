import { GlossaristModel } from '../models/base.js';
import { Added, Removed, Matched, deserializeChange } from './change.js';
import type { Added as AddedType, Removed as RemovedType, Matched as MatchedType } from './change.js';
import { ConceptDiff, DiffStats, diffConcepts } from './concept-diff.js';
import { averageSimilarity } from './similarity.js';
import type { Concept } from '../models/concept.js';

interface CollectionDiffData {
  oldCount?: number;
  old_count?: number;
  newCount?: number;
  new_count?: number;
  matched?: unknown[];
  added?: unknown[];
  removed?: unknown[];
  conceptDiffs?: Record<string, ConceptDiff | Record<string, unknown>>;
  concept_diffs?: Record<string, ConceptDiff | Record<string, unknown>>;
}

export class ConceptCollectionDiff extends GlossaristModel {
  oldCount: number;
  newCount: number;
  private _matched: MatchedType[];
  private _added: AddedType[];
  private _removed: RemovedType[];
  private _conceptDiffs: Record<string, ConceptDiff>;
  private _statsCache?: DiffStats;
  private _similarityCache?: number;

  constructor(data: CollectionDiffData = {}) {
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

  get matched(): MatchedType[] { return this._matched; }
  get added(): AddedType[] { return this._added; }
  get removed(): RemovedType[] { return this._removed; }
  get conceptDiffs(): Record<string, ConceptDiff> { return this._conceptDiffs; }

  get changedIds(): string[] {
    return Object.keys(this._conceptDiffs);
  }

  get hasChanges(): boolean {
    return this._added.length > 0
      || this._removed.length > 0
      || Object.values(this._conceptDiffs).some(d => d.hasChanges);
  }

  conceptDiff(id: string): ConceptDiff | null {
    return this._conceptDiffs[id] ?? null;
  }

  get stats(): DiffStats {
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

  get similarity(): number {
    if (this._similarityCache === undefined) {
      if (this._matched.length === 0) {
        this._similarityCache = 0;
      } else {
        const values = this._matched.map(entry => {
          const id = entry.value as string;
          const diff = this._conceptDiffs[id];
          return diff ? diff.similarity : 1.0;
        });
        this._similarityCache = averageSimilarity(values);
      }
    }
    return this._similarityCache;
  }

  *walk(): Generator<{ path: string; change: AddedType | RemovedType | unknown; conceptId?: string; language?: string }> {
    for (let i = 0; i < this._added.length; i++) {
      yield { path: `added[${i}]`, change: this._added[i]! };
    }
    for (let i = 0; i < this._removed.length; i++) {
      yield { path: `removed[${i}]`, change: this._removed[i]! };
    }
    for (const [id, diff] of Object.entries(this._conceptDiffs)) {
      for (const entry of diff.walk()) {
        yield { path: `concepts.${id}.${entry.path}`, change: entry.change, conceptId: id, language: entry.language };
      }
    }
  }

  override toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      old_count: this.oldCount,
      new_count: this.newCount,
      matched: this._matched.map(c => c.toJSON()),
      added: this._added.map(c => c.toJSON()),
      removed: this._removed.map(c => c.toJSON()),
      concept_diffs: {},
    };
    const conceptDiffs = obj.concept_diffs as Record<string, unknown>;
    for (const [id, diff] of Object.entries(this._conceptDiffs)) {
      conceptDiffs[id] = diff.toJSON();
    }
    return obj;
  }

  static override fromJSON(data: CollectionDiffData): ConceptCollectionDiff {
    return new ConceptCollectionDiff(data);
  }
}

interface DiffCollectionsOptions {
  language?: string;
  skipUnchanged?: boolean;
}

export function diffConceptCollections(
  oldCollection: Iterable<Concept> | Concept[] | null,
  newCollection: Iterable<Concept> | Concept[] | null,
  options: DiffCollectionsOptions = {},
): ConceptCollectionDiff {
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

  const conceptDiffs: Record<string, ConceptDiff> = {};
  for (const id of matchedIds) {
    const oldConcept = oldMap.get(id);
    const newConcept = newMap.get(id);

    if (options.skipUnchanged && conceptsEqual(oldConcept, newConcept)) {
      continue;
    }

    const diff = diffConcepts(oldConcept as any, newConcept as any, language);
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

function extractConcepts(collection: Iterable<Concept> | Concept[] | null): Concept[] {
  if (collection == null) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof (collection as any).toArray === 'function') return (collection as any).toArray();
  if (Symbol.iterator in Object(collection)) return [...collection];
  return [];
}

function conceptsEqual(a: Concept | undefined, b: Concept | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a.equals === 'function' && typeof b.equals === 'function') {
    return a.equals(b);
  }
  return JSON.stringify(a?.toJSON?.()) === JSON.stringify(b?.toJSON?.());
}

type ChangeClass = typeof Added | typeof Removed | typeof Matched;
type ChangeInstance = AddedType | RemovedType | MatchedType;

function wrapIdList<T extends ChangeInstance>(data: ReadonlyArray<unknown> | null | undefined, expectedClass: ChangeClass): T[] {
  if (!data) return [];
  return (data as ReadonlyArray<unknown>).map(c => {
    if (c instanceof Added || c instanceof Removed || c instanceof Matched) {
      if (!(c instanceof expectedClass)) {
        throw new Error(
          `ConceptCollectionDiff: entry type ${c.constructor.name} ` +
          `does not match slot ${expectedClass.name}`,
        );
      }
      return c as T;
    }
    const deserialized = deserializeChange(c as any);
    if (!(deserialized instanceof expectedClass)) {
      throw new Error(
        `ConceptCollectionDiff: deserialized entry type ` +
        `${deserialized.constructor.name} does not match slot ${expectedClass.name}`,
      );
    }
    return deserialized as T;
  });
}
