import { naturalSort } from './sort.js';
import type { Concept } from './models/concept.js';
import type { Register } from './models/register.js';

const _items = Symbol('items');

type ConceptLike = Concept;
type SectionIdInput = string | string[];
interface BySectionOptions { register?: Register }

export class ConceptCollection {
  private [_items]: Concept[];

  constructor(concepts: Iterable<Concept> = []) {
    this[_items] = Array.from(concepts);
  }

  get length(): number { return this[_items].length; }
  [Symbol.iterator](): Iterator<Concept> { return this[_items][Symbol.iterator](); }

  at(index: number): Concept | undefined { return this[_items].at(index); }
  indexOf(item: Concept, fromIndex?: number): number { return this[_items].indexOf(item, fromIndex); }
  find(fn: (c: Concept, i: number, arr: Concept[]) => unknown): Concept | undefined { return this[_items].find(fn); }
  findIndex(fn: (c: Concept, i: number, arr: Concept[]) => unknown): number { return this[_items].findIndex(fn); }
  forEach(fn: (c: Concept, i: number) => void): void { this[_items].forEach(fn); }
  map<U>(fn: (c: Concept, i: number) => U): U[] { return this[_items].map(fn); }
  reduce<U>(fn: (acc: U, c: Concept, i: number) => U, init: U): U { return this[_items].reduce(fn, init); }
  includes(item: Concept): boolean { return this[_items].includes(item); }
  push(...items: Concept[]): number { return this[_items].push(...items); }
  splice(start: number, deleteCount?: number, ...items: Concept[]): Concept[] {
    return deleteCount === undefined
      ? this[_items].splice(start)
      : this[_items].splice(start, deleteCount, ...items);
  }
  set(index: number, item: Concept): void { this[_items][index] = item; }

  toArray(): Concept[] { return [...this[_items]]; }

  byId(id: string): Concept | undefined {
    return this[_items].find(c => c.id === id || c.termid === id);
  }

  byIdAnd(id: string, version: string | null): Concept | null {
    if (version == null) return this.byId(id) ?? null;
    return this[_items].find(c =>
      (c.id === id || c.termid === id) && (c as Concept & { version?: string }).version === version
    ) ?? null;
  }

  byPrefix(prefix: string): ConceptCollection {
    return new ConceptCollection(this[_items].filter(c => c.id.startsWith(prefix)));
  }

  byLanguage(lang: string): ConceptCollection {
    return new ConceptCollection(this[_items].filter(c => c.hasLocalization(lang)));
  }

  byStatus(status: string): ConceptCollection {
    return new ConceptCollection(this[_items].filter(c => {
      return c.languages.some(lang => c.localization(lang)?.entryStatus === status);
    }));
  }

  bySection(sectionId: SectionIdInput, options: BySectionOptions = {}): ConceptCollection {
    if (Array.isArray(sectionId)) {
      const targetSet = new Set(sectionId);
      return new ConceptCollection(this[_items].filter(c => {
        const ids = options.register
          ? options.register.conceptSectionIds(c)
          : _flatConceptSectionIds(c);
        return ids.some(id => targetSet.has(id));
      }));
    }
    if (!options.register) {
      throw new Error('bySection(sectionId) requires { register } to expand the concept section closures');
    }
    const target = sectionId;
    return new ConceptCollection(this[_items].filter(c => {
      const ids = options.register!.conceptSectionIds(c);
      return ids.includes(target);
    }));
  }

  index(): Map<string, Concept> {
    const map = new Map<string, Concept>();
    for (const c of this[_items]) map.set(c.id, c);
    return map;
  }

  sorted(): ConceptCollection {
    const copy = [...this[_items]];
    copy.sort((a, b) => naturalSort(a.id, b.id));
    return new ConceptCollection(copy);
  }

  search(query: string): ConceptCollection {
    const q = query.toLowerCase();
    return new ConceptCollection(this[_items].filter(c => {
      for (const lang of c.languages) {
        const lc = c.localization(lang);
        if (!lc) continue;
        for (const t of lc.terms) {
          if ((t.designation ?? '').toLowerCase().includes(q)) return true;
        }
      }
      for (const { text } of c.walkTexts()) {
        if (text.toLowerCase().includes(q)) return true;
      }
      return false;
    }));
  }

  allLanguages(): string[] {
    const set = new Set<string>();
    for (const c of this[_items]) {
      for (const lang of c.languages) set.add(lang);
    }
    return [...set].sort();
  }

  filter(fn: (c: Concept, i: number, arr: Concept[]) => unknown): ConceptCollection { return new ConceptCollection(this[_items].filter(fn)); }
  slice(start?: number, end?: number): ConceptCollection { return new ConceptCollection(this[_items].slice(start, end)); }
  concat(...args: Concept[][]): ConceptCollection { return new ConceptCollection(this[_items].concat(...args)); }
}

function _flatConceptSectionIds(concept: ConceptLike): string[] {
  if (!concept) return [];
  const out: string[] = [];
  const cAny = concept as Concept & { sections?: unknown; groups?: unknown };
  for (const source of [cAny.sections, cAny.groups]) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      if (typeof entry === 'string') {
        out.push(entry);
      } else if (entry && typeof entry === 'object') {
        const e = entry as { id?: string; sectionId?: string; ref?: { id?: string } };
        const id = e.id ?? e.sectionId ?? e.ref?.id;
        if (id) out.push(String(id));
      }
    }
  }
  return out;
}
