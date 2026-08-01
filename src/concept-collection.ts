import { naturalSort } from './sort.js';
import type { Concept } from './models/concept.js';
import type { Register } from './models/register.js';

type SectionIdInput = string | string[];
interface BySectionOptions { register?: Register }

export class ConceptCollection {
  #items: Concept[];

  constructor(concepts: Iterable<Concept> = []) {
    this.#items = Array.from(concepts);
  }

  get length(): number { return this.#items.length; }
  [Symbol.iterator](): Iterator<Concept> { return this.#items[Symbol.iterator](); }

  at(index: number): Concept | undefined { return this.#items.at(index); }
  indexOf(item: Concept, fromIndex?: number): number { return this.#items.indexOf(item, fromIndex); }
  find(fn: (c: Concept, i: number, arr: Concept[]) => unknown): Concept | undefined { return this.#items.find(fn); }
  findIndex(fn: (c: Concept, i: number, arr: Concept[]) => unknown): number { return this.#items.findIndex(fn); }
  forEach(fn: (c: Concept, i: number) => void): void { this.#items.forEach(fn); }
  map<U>(fn: (c: Concept, i: number) => U): U[] { return this.#items.map(fn); }
  reduce<U>(fn: (acc: U, c: Concept, i: number) => U, init: U): U { return this.#items.reduce(fn, init); }
  includes(item: Concept): boolean { return this.#items.includes(item); }
  push(...items: Concept[]): number { return this.#items.push(...items); }
  splice(start: number, deleteCount?: number, ...items: Concept[]): Concept[] {
    return deleteCount === undefined
      ? this.#items.splice(start)
      : this.#items.splice(start, deleteCount, ...items);
  }
  set(index: number, item: Concept): void { this.#items[index] = item; }

  toArray(): Concept[] { return [...this.#items]; }

  byId(id: string): Concept | undefined {
    return this.#items.find(c => c.id === id || c.termid === id);
  }

  byIdAnd(id: string, version: string | null): Concept | null {
    if (version == null) return this.byId(id) ?? null;
    return this.#items.find(c =>
      (c.id === id || c.termid === id) && (c as Concept & { version?: string }).version === version
    ) ?? null;
  }

  byPrefix(prefix: string): ConceptCollection {
    return new ConceptCollection(this.#items.filter(c => c.id.startsWith(prefix)));
  }

  byLanguage(lang: string): ConceptCollection {
    return new ConceptCollection(this.#items.filter(c => c.hasLocalization(lang)));
  }

  byStatus(status: string): ConceptCollection {
    return new ConceptCollection(this.#items.filter(c => {
      return c.languages.some(lang => c.localization(lang)?.entryStatus === status);
    }));
  }

  bySection(sectionId: SectionIdInput, options: BySectionOptions = {}): ConceptCollection {
    if (Array.isArray(sectionId)) {
      const targetSet = new Set(sectionId);
      return new ConceptCollection(this.#items.filter(c => {
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
    return new ConceptCollection(this.#items.filter(c => {
      const ids = options.register!.conceptSectionIds(c);
      return ids.includes(target);
    }));
  }

  index(): Map<string, Concept> {
    const map = new Map<string, Concept>();
    for (const c of this.#items) map.set(c.id, c);
    return map;
  }

  sorted(): ConceptCollection {
    const copy = [...this.#items];
    copy.sort((a, b) => naturalSort(a.id, b.id));
    return new ConceptCollection(copy);
  }

  search(query: string): ConceptCollection {
    const q = query.toLowerCase();
    return new ConceptCollection(this.#items.filter(c => {
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
    for (const c of this.#items) {
      for (const lang of c.languages) set.add(lang);
    }
    return [...set].sort();
  }

  filter(fn: (c: Concept, i: number, arr: Concept[]) => unknown): ConceptCollection { return new ConceptCollection(this.#items.filter(fn)); }
  slice(start?: number, end?: number): ConceptCollection { return new ConceptCollection(this.#items.slice(start, end)); }
  concat(...args: Concept[][]): ConceptCollection { return new ConceptCollection(this.#items.concat(...args)); }
}

function _flatConceptSectionIds(concept: Concept): string[] {
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
