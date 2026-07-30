import { GlossaristModel } from './base.js';
import { LocalizedConcept } from './localized-concept.js';
import { RelatedConcept } from './related-concept.js';
import { PartitiveHyperedge } from './partitive-hyperedge.js';
import { AbstractHyperedge } from './abstract-hyperedge.js';
import { HyperedgeRegistry, groupHyperedgesByWireKey } from './hyperedge-registry.js';
import { migrateHyperedgeToRelation } from '../migration/hyperedge-migrator.js';
import { ConceptReference } from './concept-reference.js';
import { ConceptDate } from './concept-date.js';
import { ConceptSource } from './concept-source.js';
import { FigureReference } from './non-verbal-references.js';
import { TableReference } from './non-verbal-references.js';
import { FormulaReference } from './non-verbal-references.js';
import { diffConcepts } from '../diff/concept-diff.js';

export class Concept extends GlossaristModel {
  // Scalar fields the diff layer tracks at the concept level. Adding
  // a new scalar metadata field requires only appending its name here;
  // diff detection, patch application, and similarity scoring all pick
  // it up automatically. (Invariant N2 — TODO.hyperedges-v2/07.)
  static get DIFF_FIELDS() {
    return Object.freeze(['status', 'term', 'uri', 'schemaVersion']);
  }

  static wireNameFor(field) {
    return CONCEPT_WIRE_NAMES[field] ?? field;
  }

  constructor(data = {}) {
    super();
    this.id = String(data.id ?? data.termid ?? '');
    this.term = data.term ?? null;
    this.uri = data.uri ?? null;
    this._rawLocalizations = data.localizations ?? {};
    this._cache = {};

    this.relatedConcepts = _mapInstances(data.relatedConcepts ?? data.related ?? data.related_concepts ?? [], RelatedConcept);

    // Unified hyperedge array. Every hyperedge (PartitiveHyperedge,
    // GenericHyperedge, future TemporalHyperedge / AssociativeHyperedge /
    // SequentialHyperedge) lives here. The single public API is
    // `.relations`; external systems that need to filter by type use
    // `concept.relations.filter(r => r instanceof X)` or dispatch via
    // HyperedgeRegistry (preferred — see Phases 6 and 11).
    //
    // Throws on ambiguous input (caller passed both `relations` and any
    // typed wire key) and on duplicate relations (same identity twice).
    // Silent drop / silent dedupe are footguns the audit (C4, C6)
    // flagged; explicit throws make corruption loud.
    this.relations = _resolveHyperedges(data);

    this.domains = _normalizeDomains(data.domains, data.groups);
    this.groups = Array.isArray(data.groups)
      ? data.groups.map(g => typeof g === 'string' ? g : (g?.id ?? g?.sectionId ?? null)).filter(Boolean)
      : [];
    this.sections = Array.isArray(data.sections)
      ? data.sections.map(s => typeof s === 'string' ? s : (s?.id ?? s?.sectionId ?? null)).filter(Boolean)
      : [];
    this.tags = Array.isArray(data.tags) ? [...data.tags] : [];
    this.dates = _mapInstances(data.dates ?? [], ConceptDate);
    this.sources = _mapInstances(data.sources ?? [], ConceptSource);
    this._rawFigures = data.figures ?? [];
    this._rawTables = data.tables ?? [];
    this._rawFormulas = data.formulas ?? [];
    this._figures = null;
    this._tables = null;
    this._formulas = null;
    this.status = data.status ?? null;
    this.schemaVersion = data.schemaVersion ?? data.schema_version ?? '3';
    this.raw = data.raw ?? null;
  }

  get termid() { return this.id; }

  // No typed projections. Use concept.relations directly and filter
  // by instanceof, or dispatch via HyperedgeRegistry. The old
  // .partitiveRelations / .genericRelations / .partitiveHyperedges
  // getters were removed per TODO Phase 4 — they were footguns
  // (audit C3: .partitiveHyperedges returned v2 instances but callers
  // expected v1 shape; multiple validators silently no-op'd).
  //
  // Snippet migration guide:
  //   concept.partitiveRelations      → concept.relations.filter(r => r instanceof PartitiveHyperedge)
  //   concept.genericRelations        → concept.relations.filter(r => r instanceof GenericHyperedge)
  //   concept.partitiveHyperedges     → concept.relations.filter(r => r instanceof PartitiveHyperedge)

  get languages() {
    return Object.keys(this._rawLocalizations);
  }

  get languageCodes() {
    return this.languages;
  }

  localization(lang) {
    if (!(lang in this._rawLocalizations)) return undefined;
    if (!this._cache[lang]) {
      const raw = this._rawLocalizations[lang];
      this._cache[lang] = new LocalizedConcept({ ...raw, language_code: lang });
    }
    return this._cache[lang];
  }

  diff(other, language = 'eng') {
    return diffConcepts(this, other, language);
  }

  primaryDesignation(lang) {
    return this.localization(lang)?.primaryDesignation ?? null;
  }

  definition(lang) {
    return this.localization(lang)?.primaryDefinition ?? null;
  }

  setLocalization(lang, lc) {
    if (lc instanceof LocalizedConcept) {
      this._cache[lang] = lc;
      const json = lc.toJSON();
      delete json.language_code;
      this._rawLocalizations[lang] = json;
    } else {
      this._rawLocalizations[lang] = lc;
      delete this._cache[lang];
    }
    return this;
  }

  hasLocalization(lang) {
    return lang in this._rawLocalizations;
  }

  /**
   * Find a source by its local id within this concept.
   *
   * The lookup walks concept-level, localization-level, and
   * designation-level sources in that order, returning the first
   * source whose `id` matches. Sources without an `id` are
   * skipped. The id is local to the concept; uniqueness is
   * enforced by the validator (see CiteRefIntegrityRule).
   *
   * @param {string} id
   * @returns {ConceptSource | null}
   */
  findSourceById(id) {
    if (typeof id !== 'string' || id.length === 0) return null;

    // 1. Concept-level sources.
    for (const source of this.sources) {
      if (source.id === id) return source;
    }

    // 2. Localization-level sources.
    for (const lang of this.languages) {
      const lc = this.localization(lang);
      if (!lc) continue;
      for (const source of lc.sources) {
        if (source.id === id) return source;
      }

      // 3. Designation-level sources.
      for (const designation of lc.terms) {
        for (const source of designation.sources) {
          if (source.id === id) return source;
        }
      }
    }

    return null;
  }

  get figures() {
    return this._lazy('_figures', '_rawFigures',
      r => FigureReference.fromJSON(r));
  }

  get tables() {
    return this._lazy('_tables', '_rawTables',
      r => TableReference.fromJSON(r));
  }

  get formulas() {
    return this._lazy('_formulas', '_rawFormulas',
      r => FormulaReference.fromJSON(r));
  }

  /**
   * Yield every content-text fragment in this concept across all
   * localizations, recursing through nested examples. Each yielded
   * `{ text, source }` carries a dotted path rooted at
   * `localizations.<lang>.<slot>[i]...content`.
   *
   * Designations are not included; they live on `LocalizedConcept.terms`
   * and have a different shape.
   */
  *walkTexts() {
    for (const lang of this.languages) {
      const lc = this.localization(lang);
      if (!lc) continue;
      yield* lc.walkTexts(`localizations.${lang}`);
    }
  }

  toJSON() {
    const obj = { id: this.id };
    if (this.term != null) obj.term = this.term;
    if (this.uri != null) obj.uri = this.uri;

    if (Object.keys(this._rawLocalizations).length > 0) {
      obj.localizations = {};
      for (const lang of this.languages) {
        const lc = this.localization(lang);
        if (lc) {
          const json = lc.toJSON();
          delete json.language_code;
          obj.localizations[lang] = json;
        }
      }
    } else {
      obj.localizations = {};
    }

    if (this.relatedConcepts.length > 0) {
      obj.related = this.relatedConcepts.map(rc => rc.toJSON());
    }
    // Emit per-type wire keys from the unified relations array,
    // partitioned via HyperedgeRegistry. Adding a new hyperedge type
    // means its wire key appears here automatically — no edits to
    // Concept.toJSON.
    const grouped = groupHyperedgesByWireKey(this.relations);
    for (const [wireKey, rels] of Object.entries(grouped)) {
      if (rels.length > 0) obj[wireKey] = rels.map(r => r.toJSON());
    }
    if (this.domains.length > 0) {
      obj.domains = this.domains.map(d => d.toJSON());
    }
    if (this.tags.length > 0) {
      obj.tags = [...this.tags];
    }
    if (this.dates.length > 0) {
      obj.dates = this.dates.map(d => d.toJSON());
    }
    if (this.sources.length > 0) {
      obj.sources = this.sources.map(s => s.toJSON());
    }
    this._serialize(obj, 'figures', '_figures', '_rawFigures');
    this._serialize(obj, 'tables', '_tables', '_rawTables');
    this._serialize(obj, 'formulas', '_formulas', '_rawFormulas');
    if (this.status != null) obj.status = this.status;
    obj.schema_version = this.schemaVersion;
    return obj;
  }

  static fromJSON(data) {
    return new Concept(data);
  }
}

function _mapInstances(arr, Cls) {
  return arr.map(item => item instanceof Cls ? item : new Cls(item));
}

// Resolve the unified hyperedge array from any input shape.
//
// Three input categories are accepted; mixing them throws (audit C4 —
// silent drop was a footgun):
//
//   1. data.relations               — preferred unified shape. Entries
//                                     are typed instances or hashes
//                                     carrying a `type` discriminator
//                                     (looked up via HyperedgeRegistry).
//   2. Per-type v2 wire keys        — one of HyperedgeRegistry.allWireKeys()
//                                     (partitive_relations, generic_relations).
//   3. Per-type v1 legacy keys      — declared on each class via
//                                     `static v1WireKeys` (e.g.
//                                     partitive_hyperedges → migrated).
//
// Adding a new hyperedge type means: declare the leaf class with its
// metadata block, register it. Concept, parser, serializer, diff,
// patch, renderer, RDF emitter do not change. (Phase 11 OCP contract.)
function _resolveHyperedges(data) {
  _assertNoAmbiguousInput(data);

  if (Array.isArray(data.relations)) {
    return _dedupeOrThrow(data.relations.map(r => _coerceHyperedge(r)).filter(r => r != null));
  }

  const out = [];

  for (const cls of HyperedgeRegistry.allClasses()) {
    const arr = data[cls.wireKey] ?? data[_camelCase(cls.wireKey)];
    if (!Array.isArray(arr)) continue;
    for (const r of arr) {
      const coerced = _coerceHyperedge(r, cls);
      if (coerced) out.push(coerced);
    }
  }

  for (const cls of HyperedgeRegistry.allClasses()) {
    for (const v1Key of cls.v1WireKeys ?? []) {
      const camelV1 = _camelCase(v1Key);
      const arr = data[v1Key] ?? data[camelV1];
      if (!Array.isArray(arr)) continue;
      for (const h of arr) {
        const migrated = _migrateV1Hash(cls, v1Key, h);
        if (migrated) out.push(new cls(migrated));
      }
    }
  }

  return _dedupeOrThrow(out);
}

// Audit C4: silent drop on mixed input is a footgun. Throw instead.
// Allows `relations` alone, or any combination of typed keys alone —
// but not both at once.
function _assertNoAmbiguousInput(data) {
  if (!Array.isArray(data.relations)) return;
  const typedKeys = [];
  for (const cls of HyperedgeRegistry.allClasses()) {
    if (Array.isArray(data[cls.wireKey])) typedKeys.push(cls.wireKey);
    const camelWire = _camelCase(cls.wireKey);
    if (camelWire !== cls.wireKey && Array.isArray(data[camelWire])) {
      typedKeys.push(camelWire);
    }
    for (const v1 of cls.v1WireKeys ?? []) {
      if (Array.isArray(data[v1])) typedKeys.push(v1);
      const camelV1 = _camelCase(v1);
      if (camelV1 !== v1 && Array.isArray(data[camelV1])) typedKeys.push(camelV1);
    }
  }
  if (typedKeys.length > 0) {
    throw new Error(
      `Concept input is ambiguous: pass either 'relations' (unified) ` +
      `or typed wire keys (${typedKeys.join(', ')}), not both. ` +
      ` Mixing them silently drops the typed keys, which has caused ` +
      ` data loss in production (see audit C4).`,
    );
  }
}

// Audit C6: do NOT silently dedupe. Duplicate relations indicate a bug
// in the caller; surface it. The identity function delegates to each
// class's static identityOf (polymorphic — handles mixed types).
function _dedupeOrThrow(relations) {
  const seen = new Map();
  for (const r of relations) {
    const id = _hyperedgeIdentity(r);
    if (seen.has(id)) {
      throw new Error(
        `Concept input has duplicate hyperedge (identity=${id}). ` +
        `Passing the same relation twice is a bug — the parser and ` +
        `serializer would silently emit it twice on disk. ` +
        `Audit C6 requires we surface this loudly instead.`,
      );
    }
    seen.set(id, r);
  }
  return relations;
}

function _hyperedgeIdentity(r) {
  if (r == null) return '';
  const Cls = r.constructor;
  if (typeof Cls?.identityOf === 'function') {
    return `${Cls.name}::${Cls.identityOf(r)}`;
  }
  return String(r);
}

function _coerceHyperedge(value, fallbackClass) {
  if (value == null) return null;
  if (value instanceof AbstractHyperedge) return value;

  const hash = typeof value.toJSON === 'function' ? value.toJSON() : value;
  const cls = _classForHash(hash) ?? fallbackClass;
  if (!cls) return null;
  return new cls(hash);
}

function _classForHash(hash) {
  if (!hash || typeof hash !== 'object') return null;
  const type = hash.type;
  if (typeof type !== 'string') return null;
  return HyperedgeRegistry.forTypeTag(type);
}

// v1 → v2 migration for hashes from legacy wire keys. Currently only
// PartitiveHyperedge has v1 wire keys (partitive_hyperedges). Future
// types extend this dispatch — but it lives here in the migration
// helper, not in the model classes, since v1 is a legacy concern.
function _migrateV1Hash(cls, v1Key, hash) {
  if (cls === PartitiveHyperedge && v1Key === 'partitive_hyperedges') {
    const normalized = hash;
    return migrateHyperedgeToRelation(normalized);
  }
  return null;
}

// snake_case → camelCase
function _camelCase(s) {
  if (typeof s !== 'string' || !s.includes('_')) return s;
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

const CONCEPT_WIRE_NAMES = Object.freeze({
  schemaVersion: 'schema_version',
});

function _normalizeDomains(domains, groups) {
  if (domains) {
    return domains.map(d => d instanceof ConceptReference ? d : new ConceptReference(d));
  }
  if (groups) {
    return groups.map(g => typeof g === 'string'
      ? ConceptReference.domain(g)
      : new ConceptReference(g));
  }
  return [];
}
