import * as yaml from 'js-yaml';
import { Concept } from './models/concept.js';
import { RelatedConcept } from './models/related-concept.js';
import { HyperedgeRegistry } from './models/hyperedge-registry.js';
import { migrateHyperedgeToRelation } from './migration/partitive-relation-migrator.js';
import { InvalidInputError, YamlParseError } from './errors.js';

// Structural keys are reserved at the concept level and excluded
// from language localization discovery. The set is derived from
// HyperedgeRegistry — every registered hyperedge class contributes
// its wireKey and any v1WireKeys to the reserved set. Adding a new
// hyperedge type means the parser reserves its wire key automatically;
// no edits here.
const STRUCTURAL_KEYS = new Set([
  'termid', 'term', 'figures', 'tables', 'formulas',
  'related', 'relatedConcepts',
  'relations',
  ..._registryStructuralKeys(),
]);

function _registryStructuralKeys() {
  const out = [];
  for (const cls of HyperedgeRegistry.allClasses()) {
    out.push(cls.wireKey);
    out.push(_camelCase(cls.wireKey));
    for (const k of cls.v1WireKeys ?? []) {
      out.push(k);
      out.push(_camelCase(k));
    }
  }
  return out;
}

function _camelCase(s) {
  if (typeof s !== 'string' || !s.includes('_')) return s;
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export class ConceptParser {
  parse(raw, context) {
    const label = context ?? 'concept';

    if (raw == null) {
      throw new InvalidInputError(
        `parseConceptYaml requires a non-empty YAML string (${label})`,
        'non-null string',
      );
    }
    if (typeof raw !== 'string' || raw.trim() === '') {
      throw new InvalidInputError(
        `parseConceptYaml requires a non-empty YAML string (${label})`,
        'non-empty string',
      );
    }

    let docs;
    try {
      // js-yaml 5.x dropped the explicit DEFAULT_SCHEMA export; the
      // default schema is applied automatically when no `schema`
      // option is passed. Passing CORE_SCHEMA reproduces the historical
      // behavior (yaml.org core schema).
      docs = yaml.loadAll(raw, { schema: yaml.CORE_SCHEMA ?? yaml.JSON_SCHEMA });
    } catch (err) {
      throw new YamlParseError(label, err);
    }

    return this._detectFormat(docs, label) === 'managed'
      ? this._parseManaged(docs)
      : this._parseCanonical(docs[0]);
  }

  _detectFormat(docs, label) {
    if (docs.length >= 1 && docs[0]?.data?.identifier !== undefined) return 'managed';
    if (docs[0] == null) throw new YamlParseError(label, new Error('YAML document is empty'));
    return 'canonical';
  }

  _parseCanonical(doc) {
    const localizations = {};
    for (const key of Object.keys(doc)) {
      if (!STRUCTURAL_KEYS.has(key) && typeof doc[key] === 'object' && doc[key] !== null) {
        localizations[key] = doc[key];
      }
    }
    return new Concept({
      id: String(doc.termid),
      term: doc.term || null,
      localizations,
      figures: doc.figures,
      tables: doc.tables,
      formulas: doc.formulas,
      relations: _resolveHyperedgeData(doc),
      raw: doc,
    });
  }

  _parseManaged(docs) {
    const mc = docs[0];
    const localizations = {};

    for (const doc of docs.slice(1)) {
      if (!doc?.data?.language_code) continue;
      const lang = doc.data.language_code;
      const lcData = { ...doc.data };
      delete lcData.language_code;
      localizations[lang] = lcData;
    }

    // The hyperedge wire keys are reserved at concept level (top-level
    // of the managed concept YAML), not under data:. Derive the list
    // from the registry so adding a type doesn't require an edit here.
    const conceptLevelOnlyKeys = [
      'related',
      'relations',
      ...HyperedgeRegistry.allWireAndLegacyKeys(),
    ];

    assertConceptLevelOnly(mc, conceptLevelOnlyKeys);

    return new Concept({
      id: String(mc.data.identifier),
      term: null,
      localizations,
      related: _normalizeRelated(mc.related),
      relations: _resolveHyperedgeData(mc),
      domains: mc.data.domains,
      groups: mc.data.groups,
      dates: mc.dates ?? mc.data?.dates,
      sources: mc.sources ?? mc.data?.sources,
      figures: mc.data?.figures,
      tables: mc.data?.tables,
      formulas: mc.data?.formulas,
      status: mc.status,
      schemaVersion: mc.schema_version,
      raw: mc,
    });
  }
}

function assertConceptLevelOnly(mc, keys) {
  const conceptId = mc?.data?.identifier ?? '<unknown>';
  for (const key of keys) {
    const camelKey = _camelCase(key);
    if (mc?.data?.[key] != null && mc[key] == null && mc[camelKey] == null) {
      throw new InvalidInputError(
        `'${key}' must live at concept level (top-level of the managed ` +
        `concept document), not under data:. Found data.${key} in concept ` +
        `${conceptId}. Move the key out of the data: block.`,
        'concept-level ' + key,
      );
    }
  }
}

// Resolve hyperedge data from any input shape into a single unified
// array. Iterates HyperedgeRegistry — for each registered class:
//   - read its wireKey from the container (e.g. partitive_relations)
//   - read any v1WireKeys (e.g. partitive_hyperedges) and migrate
//   - tag each entry with the class's typeTag
//
// Returns null when no relation data is present, so Concept's
// `_resolveHyperedges` falls back to the empty-array default.
//
// Adding a new hyperedge type means: declare it on a class, register.
// The parser picks it up automatically — no edits here.
function _resolveHyperedgeData(container) {
  if (!container) return null;

  if (Array.isArray(container.relations)) {
    return container.relations;
  }

  const out = [];

  for (const cls of HyperedgeRegistry.allClasses()) {
    // v2 wire key (e.g. partitive_relations)
    const arr = container[cls.wireKey] ?? container[_camelCase(cls.wireKey)];
    if (Array.isArray(arr)) {
      for (const r of arr) {
        const tagged = _addTypeIfMissing(r, cls.typeTag);
        if (tagged != null) out.push(tagged);
      }
    }

    // v1 legacy wire keys (e.g. partitive_hyperedges) — migrated.
    // The migration helper produces a v2 hash; we tag it with the
    // typeTag so Concept's registry dispatch finds the right class.
    for (const v1Key of cls.v1WireKeys ?? []) {
      const v1Arr = container[v1Key] ?? container[_camelCase(v1Key)];
      if (!Array.isArray(v1Arr)) continue;
      for (const h of v1Arr) {
        const hash = h?.toJSON && typeof h.toJSON === 'function' ? h.toJSON() : h;
        const migrated = migrateHyperedgeToRelation(hash);
        if (migrated) out.push({ ...migrated, type: cls.typeTag });
      }
    }
  }

  return out.length > 0 ? out : null;
}

function _addTypeIfMissing(value, type) {
  if (value == null) return null;
  if (typeof value.toJSON === 'function') {
    const hash = value.toJSON();
    return hash.type ? hash : { ...hash, type };
  }
  if (typeof value === 'object') {
    return value.type ? value : { ...value, type };
  }
  return value;
}

function _normalizeRelated(arr) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(r => {
    if (r instanceof RelatedConcept) return r;
    if (r.ref != null && typeof r.ref !== 'object') {
      throw new InvalidInputError(
        `RelatedConcept.ref must be an object { source, id }, got: ${typeof r.ref}`,
        'object',
      );
    }
    return new RelatedConcept(r);
  });
}

export const conceptParser = new ConceptParser();
