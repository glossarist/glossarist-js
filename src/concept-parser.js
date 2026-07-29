import * as yaml from 'js-yaml';
import { Concept } from './models/concept.js';
import { RelatedConcept } from './models/related-concept.js';
import { migrateHyperedgeToRelation } from './migration/partitive-relation-migrator.js';
import { InvalidInputError, YamlParseError } from './errors.js';

// Structural keys are reserved at the concept level and excluded
// from language localization discovery. The unified `relations`
// key, the v2 typed keys (`partitive_relations`, `generic_relations`),
// and the v1 backward-compat key (`partitive_hyperedges`) are all
// reserved.
const STRUCTURAL_KEYS = new Set([
  'termid', 'term', 'figures', 'tables', 'formulas',
  'relations',
  'partitive_hyperedges', 'partitiveHyperedges',
  'partitive_relations', 'partitiveRelations',
  'generic_relations', 'genericRelations',
]);

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
      relations: _resolveNaryData(doc),
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

    assertConceptLevelOnly(mc, [
      'related',
      'relations',
      'partitive_relations',
      'partitive_hyperedges',
      'generic_relations',
    ]);

    return new Concept({
      id: String(mc.data.identifier),
      term: null,
      localizations,
      related: _normalizeRelated(mc.related),
      relations: _resolveNaryData(mc),
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
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
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

// Resolve n-ary relation data from any input shape into a single
// unified array. Accepts:
//
//   unified wire:  { relations: [...] }                     (hashes with `type`)
//   v2 partitive:  { partitive_relations: [...] }           (hashes)
//   v2 generic:    { generic_relations: [...] }             (hashes)
//   v1 partitive:  { partitive_hyperedges: [...] }           ← migrated
//
// Returns null when no relation data is present, so Concept's
// `_resolveNaryRelations` falls back to the empty-array default.
function _resolveNaryData(container) {
  if (!container) return null;

  if (Array.isArray(container.relations)) {
    return container.relations;
  }

  const out = [];

  const v2Partitive = container.partitive_relations ?? container.partitiveRelations;
  if (Array.isArray(v2Partitive)) {
    for (const r of v2Partitive) {
      const tagged = _addTypeIfMissing(r, 'partitive_relation');
      if (tagged != null) out.push(tagged);
    }
  }

  const v2Generic = container.generic_relations ?? container.genericRelations;
  if (Array.isArray(v2Generic)) {
    for (const r of v2Generic) {
      const tagged = _addTypeIfMissing(r, 'generic_relation');
      if (tagged != null) out.push(tagged);
    }
  }

  const v1 = container.partitive_hyperedges ?? container.partitiveHyperedges;
  if (Array.isArray(v1)) {
    for (const h of v1) {
      const hash = h?.toJSON && typeof h.toJSON === 'function' ? h.toJSON() : h;
      const migrated = migrateHyperedgeToRelation(hash);
      if (migrated) out.push({ ...migrated, type: 'partitive_relation' });
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
