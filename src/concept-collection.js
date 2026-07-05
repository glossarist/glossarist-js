import { naturalSort } from './sort.js';

const _items = Symbol('items');

export class ConceptCollection {
  constructor(concepts = []) {
    this[_items] = Array.from(concepts);
  }

  get length() { return this[_items].length; }
  [Symbol.iterator]() { return this[_items][Symbol.iterator](); }

  at(index) { return this[_items].at(index); }
  indexOf(item) { return this[_items].indexOf(item); }
  find(fn) { return this[_items].find(fn); }
  findIndex(fn) { return this[_items].findIndex(fn); }
  forEach(fn) { this[_items].forEach(fn); }
  map(fn) { return this[_items].map(fn); }
  reduce(fn, init) { return this[_items].reduce(fn, init); }
  includes(item) { return this[_items].includes(item); }
  push(...items) { return this[_items].push(...items); }
  splice(...args) { return this[_items].splice(...args); }
  set(index, item) { this[_items][index] = item; }

  toArray() { return [...this[_items]]; }

  byId(id) {
    return this[_items].find(c => c.id === id || c.termid === id);
  }

  /**
   * Find a concept by id and version.
   *
   * The version is matched against a top-level `version` field on
   * the concept instance (e.g. `concept.version`). The deployment
   * is responsible for setting this field on bibliographic records;
   * the data model does not enforce its presence or type.
   *
   * If `version` is null, the method falls back to `byId(id)`. This
   * supports the "version-agnostic" lookup for datasets where
   * version is not tracked.
   *
   * @param {string} id
   * @param {string | null} version
   * @returns {Concept | null}
   */
  byIdAnd(id, version) {
    if (version == null) return this.byId(id);
    return this[_items].find(c =>
      (c.id === id || c.termid === id) && c.version === version
    ) ?? null;
  }

  byPrefix(prefix) {
    return new ConceptCollection(this[_items].filter(c => c.id.startsWith(prefix)));
  }

  byLanguage(lang) {
    return new ConceptCollection(this[_items].filter(c => c.hasLocalization(lang)));
  }

  byStatus(status) {
    return new ConceptCollection(this[_items].filter(c => {
      return c.languages.some(lang => c.localization(lang)?.entryStatus === status);
    }));
  }

  /**
   * Cascading section membership filter. Returns concepts whose
   * section closure includes `sectionId`.
   *
   * A concept in section "3.1.1" matches `bySection('3.1')` and
   * `bySection('3')` because the section closure walks ancestors
   * transitively (mirrors owl:TransitiveProperty on
   * gloss:hasParentSection in the concept-model ontology).
   *
   * Two calling conventions:
   *
   *   bySection('3.1', { register })          // register expands each concept's section closure
   *   bySection(['3.1', '3'])                  // pre-expanded target set (any of these must match)
   *
   * Concept-side membership is read from `concept.sections` if set,
   * otherwise from `concept.groups` (a flat list of section IDs).
   */
  bySection(sectionId, options = {}) {
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
      const ids = options.register.conceptSectionIds(c);
      return ids.includes(target);
    }));
  }

  index() {
    const map = new Map();
    for (const c of this[_items]) map.set(c.id, c);
    return map;
  }

  sorted() {
    const copy = [...this[_items]];
    copy.sort((a, b) => naturalSort(a.id, b.id));
    return new ConceptCollection(copy);
  }

  search(query) {
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

  allLanguages() {
    const set = new Set();
    for (const c of this[_items]) {
      for (const lang of c.languages) set.add(lang);
    }
    return [...set].sort();
  }

  filter(fn) { return new ConceptCollection(this[_items].filter(fn)); }
  slice(...args) { return new ConceptCollection(this[_items].slice(...args)); }
  concat(...args) { return new ConceptCollection(this[_items].concat(...args)); }
}

// Standalone helper for the array-closure case where no register is
// available. Mirrors the lookup done inside Register#conceptSectionIds
// but without ancestor expansion (the closure is already provided).
function _flatConceptSectionIds(concept) {
  if (!concept) return [];
  const out = [];
  for (const source of [concept.sections, concept.groups]) {
    if (!Array.isArray(source)) continue;
    for (const entry of source) {
      if (typeof entry === 'string') {
        out.push(entry);
      } else if (entry && typeof entry === 'object') {
        const id = entry.id ?? entry.sectionId ?? entry.ref?.id;
        if (id) out.push(String(id));
      }
    }
  }
  return out;
}
