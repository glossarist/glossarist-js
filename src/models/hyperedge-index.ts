// HyperedgeIndex — directional index over a hyperedge set.
//
// A hyperedge is 1→N (one comprehensive, many members). The forward
// query ("which hyperedges have X as comprehensive?") and the reverse
// query ("which hyperedges have Y as a member?") are both useful. The
// reverse query is the load-bearing one: OIML V 2-200:2010 concept
// 5.13 is a member of one of 5.1's hyperedges AND the comprehensive
// of its own 2 hyperedges — without an index, every "find hyperedges
// mentioning X" turns into an O(N) walk over every hyperedge.
//
// The index is built on demand from a flat hyperedge list (typically
// Concept.relations or the union of all concepts' relations in a
// collection). It does not store state on Concept — Concept stays a
// simple value object.
//
// Identity key matches HyperedgeRegistry / ConceptRef conventions:
//   `${source}:${id}`   (empty source or id is rejected)

import type { AbstractHyperedge } from './abstract-hyperedge.js';

interface HyperedgeLike {
  comprehensive?: { source?: string | null; id?: string | null } | null;
  members?: ReadonlyArray<{ ref?: { source?: string | null; id?: string | null } | null }>;
}

export class HyperedgeIndex {
  private readonly _byComprehensive: Map<string, HyperedgeLike[]>;
  private readonly _byMember: Map<string, HyperedgeLike[]>;

  constructor(hyperedges: ReadonlyArray<HyperedgeLike> = []) {
    this._byComprehensive = new Map();
    this._byMember = new Map();

    for (const h of hyperedges) {
      const cKey = _qualifiedId(h?.comprehensive);
      if (cKey) _addToMapList(this._byComprehensive, cKey, h);
      const members = Array.isArray(h?.members) ? h.members : [];
      for (const m of members) {
        const mKey = _qualifiedId(m?.ref ?? m);
        if (mKey) _addToMapList(this._byMember, mKey, h);
      }
    }
  }

  // Hyperedges where the given concept is the comprehensive (the "1" side).
  forComprehensive(qualifiedId: string): HyperedgeLike[] {
    return this._byComprehensive.get(qualifiedId) ?? [];
  }

  // Hyperedges where the given concept appears as a member (the "many" side).
  forMember(qualifiedId: string): HyperedgeLike[] {
    return this._byMember.get(qualifiedId) ?? [];
  }

  // All concepts that appear as a comprehensive in any indexed hyperedge.
  comprehensives(): string[] {
    return [...this._byComprehensive.keys()];
  }

  // All concepts that appear as a member in any indexed hyperedge.
  members(): string[] {
    return [...this._byMember.keys()];
  }

  get size(): number {
    return this._byComprehensive.size;
  }
}

/**
 * Build a HyperedgeIndex across multiple Concepts' relations arrays
 * (a dataset-wide view). Each Concept contributes its own .relations.
 * Helper for the most common pattern: index once at collection load,
 * query many times.
 */
export function buildDatasetIndex(
  concepts: ReadonlyArray<{ relations?: ReadonlyArray<AbstractHyperedge | HyperedgeLike> }> = [],
): HyperedgeIndex {
  const all: HyperedgeLike[] = [];
  for (const concept of concepts) {
    for (const h of concept.relations ?? []) {
      all.push(h as HyperedgeLike);
    }
  }
  return new HyperedgeIndex(all);
}

function _qualifiedId(
  ref: { source?: string | null; id?: string | null } | null | undefined,
): string | null {
  if (!ref) return null;
  const source = ref.source ?? '';
  const id = ref.id ?? '';
  if (!source && !id) return null;
  return `${source}:${id}`;
}

function _addToMapList<T>(map: Map<string, T[]>, key: string, value: T): void {
  if (!map.has(key)) map.set(key, []);
  map.get(key)?.push(value);
}
