import { GlossaristModel } from './base.js';
import { Section } from './section.js';

export const REGISTER_STATUSES = Object.freeze([
  'current',
  'superseded',
  'withdrawn',
  'draft',
]);

export class Register extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.schemaVersion = data.schema_version ?? data.schemaVersion ?? '3';
    this.id = data.id ?? null;
    this.ref = data.ref ?? null;
    this.refAliases = data.refAliases ?? data.ref_aliases ?? [];
    this.year = data.year ?? null;
    this.urn = data.urn ?? null;
    this.urnAliases = data.urnAliases ?? data.urn_aliases ?? [];
    this.status = data.status ?? null;
    this.supersedes = data.supersedes ?? null;
    this.owner = data.owner ?? null;
    this.sourceRepo = data.sourceRepo ?? data.source_repo ?? null;
    this.tags = data.tags ?? [];
    this.languages = data.languages ?? [];
    this.languageOrder = data.languageOrder ?? data.language_order ?? [];
    this.ordering = data.ordering ?? null;
    this.logo = data.logo ?? null;
    this.description = data.description ?? {};
    this.about = data.about ?? {};
    this.provenance = data.provenance ?? [];
    this.contributors = data.contributors ?? [];
    this.sections = (data.sections ?? []).map(s =>
      s instanceof Section ? s : new Section(s)
    );
    this._raw = this._extractRaw(data);
  }

  _extractRaw(data) {
    const known = new Set([
      'schema_version', 'schemaVersion',
      'id', 'ref', 'refAliases', 'ref_aliases',
      'year', 'urn', 'urnAliases', 'urn_aliases',
      'status', 'supersedes', 'owner',
      'sourceRepo', 'source_repo', 'tags',
      'languages', 'languageOrder', 'language_order',
      'ordering', 'logo', 'description', 'about',
      'provenance', 'contributors', 'sections',
    ]);
    const extra = {};
    for (const [k, v] of Object.entries(data)) {
      if (!known.has(k)) extra[k] = v;
    }
    return extra;
  }

  sectionById(id) {
    for (const section of this.sections) {
      if (section.id === id) return section;
      const found = section.descendantById(id);
      if (found) return found;
    }
    return null;
  }

  // Walks the section tree upward from `sectionId`, returning the
  // ancestor chain in immediate-parent-first order. The returned array
  // does NOT include sectionId itself. Returns [] when sectionId is
  // unknown or is a top-level section.
  //
  // Mirrors glossarist-ruby's section-cascading walk (commit 43dca6b)
  // and the ontology's owl:TransitiveProperty declaration on
  // gloss:hasParentSection.
  sectionAncestorIds(sectionId) {
    if (!sectionId) return [];
    for (const root of this.sections) {
      const chain = _ancestorChain(root, sectionId);
      if (chain) return chain;
    }
    return [];
  }

  // Returns the closure of `sectionId`: the section plus all of its
  // ancestors. Concept-section membership tests should intersect the
  // concept's section list with this closure so a concept in section
  // "3.1.1" matches a filter on "3.1" or "3".
  sectionClosure(sectionId) {
    return [sectionId, ...this.sectionAncestorIds(sectionId)];
  }

  // Returns all section IDs the concept belongs to: the concept's own
  // sections plus every ancestor of each. Concept-side section
  // membership comes from `concept.sections` if set, otherwise from
  // `concept.groups` (a flat list of section IDs as strings).
  //
  // Returns the union (deduped) so callers can do a single
  // intersection test.
  conceptSectionIds(concept) {
    const own = conceptSectionIdList(concept);
    if (own.length === 0) return [];
    const closure = new Set();
    for (const id of own) {
      for (const ancestor of this.sectionClosure(id)) closure.add(ancestor);
    }
    return [...closure];
  }

  sectionName(sectionId, lang) {
    const section = this.sectionById(sectionId);
    return section ? section.name(lang) : null;
  }

  toJSON() {
    const obj = { ...this._raw, schema_version: this.schemaVersion };
    if (this.id != null) obj.id = this.id;
    if (this.ref != null) obj.ref = this.ref;
    if (this.refAliases.length > 0) obj.refAliases = [...this.refAliases];
    if (this.year != null) obj.year = this.year;
    if (this.urn != null) obj.urn = this.urn;
    if (this.urnAliases.length > 0) obj.urnAliases = [...this.urnAliases];
    if (this.status != null) obj.status = this.status;
    if (this.supersedes != null) obj.supersedes = this.supersedes;
    if (this.owner != null) obj.owner = this.owner;
    if (this.sourceRepo != null) obj.sourceRepo = this.sourceRepo;
    if (this.tags.length > 0) obj.tags = [...this.tags];
    if (this.languages.length > 0) obj.languages = [...this.languages];
    if (this.languageOrder.length > 0) obj.languageOrder = [...this.languageOrder];
    if (this.ordering != null) obj.ordering = this.ordering;
    if (this.logo != null) obj.logo = { ...this.logo };
    if (Object.keys(this.description).length > 0) obj.description = { ...this.description };
    if (Object.keys(this.about).length > 0) obj.about = { ...this.about };
    if (this.provenance.length > 0) obj.provenance = this.provenance.map(p => ({ ...p }));
    if (this.contributors.length > 0) obj.contributors = this.contributors.map(c => ({ ...c }));
    if (this.sections.length > 0) obj.sections = this.sections.map(s => s.toJSON());
    return obj;
  }

  static fromJSON(data) {
    const instance = new Register(data);
    const snakeToCamel = k => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    return new Proxy(instance, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop in target._raw) return target._raw[prop];
        const camel = snakeToCamel(prop);
        if (camel in target) return target[camel];
        return undefined;
      },
    });
  }
}

// Recursive walk: returns the ancestor chain of `targetId` within the
// subtree rooted at `section`, or null if targetId is not in this
// subtree. The chain is immediate-parent-first; the section itself is
// not included. Built root-first, then reversed for the documented order.
function _ancestorChain(section, targetId, ancestors = []) {
  if (section.id === targetId) return [...ancestors].reverse();
  for (const child of section.children) {
    const found = _ancestorChain(child, targetId, [...ancestors, section.id]);
    if (found) return found;
  }
  return null;
}

// Returns the list of section IDs a concept claims membership in.
// Concepts may carry section IDs via either `sections` (preferred) or
// `groups` (legacy). Each entry may be a string or an object with an
// `id` field; both forms are flattened to a string list.
function conceptSectionIdList(concept) {
  if (!concept) return [];
  const fromSections = concept.sections
    ? _flattenSectionIds(concept.sections)
    : [];
  const fromGroups = concept.groups
    ? _flattenSectionIds(concept.groups)
    : [];
  return [...fromSections, ...fromGroups];
}

function _flattenSectionIds(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      out.push(entry);
    } else if (entry && typeof entry === 'object') {
      const id = entry.id ?? entry.sectionId ?? entry.ref?.id;
      if (id) out.push(String(id));
    }
  }
  return out;
}
