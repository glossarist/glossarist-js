import { GlossaristModel } from './base.js';
import { LocalizedConcept } from './localized-concept.js';
import { RelatedConcept } from './related-concept.js';
import { LegacyPartitiveHyperedge } from './partitive-hyperedge-v1.js';
import { PartitiveHyperedge } from './partitive-hyperedge.js';
import { GenericHyperedge } from './generic-hyperedge.js';
import { AbstractHyperedge } from './abstract-hyperedge.js';
import { TYPE_TO_CLASS } from './relation-type-registry.js';
import { migrateHyperedgeToRelation } from '../migration/partitive-relation-migrator.js';
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

    // Unified n-ary relations array. Both PartitiveHyperedge and
    // GenericHyperedge live here. Adding a new n-ary type (Sequential,
    // Associative) = adding to _resolveNaryRelations, not editing
    // Concept, parser, serializer, diff, patch, or renderer.
    //
    // Backward-compat getters (.partitiveRelations, .partitiveHyperedges,
    // .genericRelations) filter this single array by type. Callers that
    // use the typed getters see the same behavior; new callers should
    // iterate .relations directly and dispatch via instanceof.
    this.relations = _resolveNaryRelations(data);

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

  // Typed getters that filter the unified relations array. Backward
  // compat for callers that read .partitiveRelations directly.
  get partitiveRelations() {
    return this.relations.filter(r => r instanceof PartitiveHyperedge);
  }
  get genericRelations() {
    return this.relations.filter(r => r instanceof GenericHyperedge);
  }
  // v1 alias
  get partitiveHyperedges() { return this.partitiveRelations; }

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
    // Emit typed wire keys from the unified relations array.
    // Each relation type gets its own wire key so existing consumers
    // see no wire-shape change.
    const partitiveRels = this.relations.filter(r => r instanceof PartitiveHyperedge);
    const genericRels = this.relations.filter(r => r instanceof GenericHyperedge);
    if (partitiveRels.length > 0) {
      obj.partitive_relations = partitiveRels.map(r => r.toJSON());
    }
    if (genericRels.length > 0) {
      obj.generic_relations = genericRels.map(r => r.toJSON());
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

// Resolve the unified n-ary relations array from any input shape.
// Order of precedence:
//   1. data.relations (preferred unified shape — already typed instances
//      or hashes carrying a `type` discriminator)
//   2. data.partitiveRelations / data.partitive_relations (v2 typed)
//      + data.genericRelations / data.generic_relations (v2 typed)
//   3. data.partitiveHyperedges / data.partitive_hyperedges (v1, migrated)
//
// Hash dispatch uses TYPE_TO_CLASS from relation-type-registry.js —
// the single source of truth shared with the per-file loader.
//
// Adding a new n-ary relation type (Sequential, Associative, …) means
// one entry in TYPE_TO_CLASS plus one new class — Concept, parser,
// serializer, diff, patch, and renderer do not change.
function _resolveNaryRelations(data) {
  if (Array.isArray(data.relations)) {
    return data.relations
      .map(r => _coerceRelation(r))
      .filter(r => r != null);
  }

  const out = [];

  const v2Partitive = data.partitiveRelations ?? data.partitive_relations;
  if (Array.isArray(v2Partitive)) {
    for (const r of v2Partitive) {
      const coerced = _coerceRelation(r, PartitiveHyperedge);
      if (coerced) out.push(coerced);
    }
  }

  const v2Generic = data.genericRelations ?? data.generic_relations;
  if (Array.isArray(v2Generic)) {
    for (const r of v2Generic) {
      const coerced = _coerceRelation(r, GenericHyperedge);
      if (coerced) out.push(coerced);
    }
  }

  const v1 = data.partitiveHyperedges ?? data.partitive_hyperedges;
  if (Array.isArray(v1)) {
    for (const h of v1) {
      const hash = h instanceof LegacyPartitiveHyperedge ? h.toJSON() : h;
      const migrated = migrateHyperedgeToRelation(hash);
      if (migrated) out.push(new PartitiveHyperedge(migrated));
    }
  }

  return out;
}

function _coerceRelation(value, fallbackClass) {
  if (value == null) return null;
  if (value instanceof AbstractHyperedge) return value;

  const hash = typeof value.toJSON === 'function' ? value.toJSON() : value;
  const Cls = _classForHash(hash) ?? fallbackClass;
  if (!Cls) return null;
  return new Cls(hash);
}

function _classForHash(hash) {
  if (!hash || typeof hash !== 'object') return null;
  const type = hash.type;
  if (typeof type !== 'string') return null;
  return TYPE_TO_CLASS[type] ?? null;
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
