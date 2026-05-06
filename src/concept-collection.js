import { naturalSort } from './gcr-reader.js';

const _items = Symbol('items');

export class ConceptCollection {
  constructor(concepts = []) {
    this[_items] = Array.from(concepts);
    return new Proxy(this, _handler);
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

  byId(id) {
    return this[_items].find(c => c.id === id || c.termid === id);
  }

  byPrefix(prefix) {
    return new ConceptCollection(this[_items].filter(c => c.id.startsWith(prefix)));
  }

  byLanguage(lang) {
    return new ConceptCollection(this[_items].filter(c => c.hasLocalization(lang)));
  }

  byStatus(status) {
    return new ConceptCollection(this[_items].filter(c => {
      const langs = c.languages;
      return langs.length > 0 && c.localization(langs[0])?.entryStatus === status;
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
        for (const d of lc.definitions) {
          if ((d.content ?? '').toLowerCase().includes(q)) return true;
        }
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

const _handler = {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return target[_items][Number(prop)];
    }
    if (prop === 'length') return target[_items].length;
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
  set(target, prop, value) {
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      target[_items][Number(prop)] = value;
      return true;
    }
    return Reflect.set(target, prop, value);
  },
  has(target, prop) {
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return Number(prop) in target[_items];
    }
    return Reflect.has(target, prop);
  },
};
