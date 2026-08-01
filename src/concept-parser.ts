import * as yaml from 'js-yaml';
import { Concept } from './models/concept.js';
import type { LocalizedConceptJson } from './models/localized-concept.js';
import { RelatedConcept } from './models/related-concept.js';
import { HyperedgeRegistry } from './models/hyperedge-registry.js';
import { migrateHyperedgeToRelation } from './migration/hyperedge-migrator.js';
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

type YamlObject = Record<string, unknown>;

function asObject(v: unknown): YamlObject {
  return v as YamlObject;
}

function nested(v: unknown, key: string): unknown {
  if (v && typeof v === 'object' && key in v) return (v as Record<string, unknown>)[key];
  return undefined;
}

function deepIdentifier(docs: unknown[]): unknown {
  const first = docs[0];
  return nested(nested(first, 'data'), 'identifier');
}

// YAML documents are inherently unstructured at parse time — the Concept
// constructor applies the real type constraints. We use a permissive type
// here because the alternative (asserting each field shape individually)
// would duplicate the validation the model layer already does.
type YamlDoc = Record<string, any>;

function _camelCase(s: unknown): string {
  if (typeof s !== 'string' || !s.includes('_')) return s as string;
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export class ConceptParser {
  parse(raw: unknown, context?: string) {
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

    let docs: unknown[];
    try {
      docs = yaml.loadAll(raw, { schema: yaml.CORE_SCHEMA ?? yaml.JSON_SCHEMA });
    } catch (err) {
      throw new YamlParseError(label, err as Error);
    }

    return this._detectFormat(docs, label) === 'managed'
      ? this._parseManaged(docs)
      : this._parseCanonical(docs[0] as Record<string, unknown>);
  }

  _detectFormat(docs: unknown[], label: string): 'managed' | 'canonical' {
    const first = docs[0] as Record<string, unknown> | undefined;
    if (docs.length >= 1 && deepIdentifier(docs) !== undefined) return 'managed';
    if (first == null) throw new YamlParseError(label, new Error('YAML document is empty'));
    return 'canonical';
  }

  _parseCanonical(doc: YamlDoc) {
    const localizations: Record<string, LocalizedConceptJson> = {};
    for (const key of Object.keys(doc)) {
      const val = doc[key];
      if (!STRUCTURAL_KEYS.has(key) && typeof val === 'object' && val !== null) {
        localizations[key] = val as LocalizedConceptJson;
      }
    }
    return new Concept({
      id: String(doc.termid),
      term: doc.term || null,
      localizations,
      figures: doc.figures,
      tables: doc.tables,
      formulas: doc.formulas,
      relations: _resolveHyperedgeData(doc) ?? undefined,
      raw: doc,
    });
  }

  _parseManaged(docs: unknown[]) {
    const mc: YamlDoc = docs[0] as YamlDoc;
    const localizations: Record<string, LocalizedConceptJson> = {};

    for (const doc of docs.slice(1)) {
      const d = doc as YamlDoc;
      if (!d?.data?.language_code) continue;
      const lang: string = d.data.language_code;
      const lcData = { ...d.data };
      delete lcData.language_code;
      localizations[lang] = lcData;
    }

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
      relations: _resolveHyperedgeData(mc) ?? undefined,
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

function assertConceptLevelOnly(mc: YamlDoc, keys: string[]) {
  const conceptId: string = mc?.data?.identifier ?? '<unknown>';
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
function _resolveHyperedgeData(container: Record<string, any> | null): ReadonlyArray<unknown> | null {
  if (!container) return null;

  if (Array.isArray(container.relations)) {
    return container.relations;
  }

  const out: unknown[] = [];

  for (const cls of HyperedgeRegistry.allClasses()) {
    const arr = container[cls.wireKey] ?? container[_camelCase(cls.wireKey) as string];
    if (Array.isArray(arr)) {
      for (const r of arr) {
        const tagged = _addTypeIfMissing(r, cls.typeTag);
        if (tagged != null) out.push(tagged);
      }
    }

    for (const v1Key of cls.v1WireKeys ?? []) {
      const v1Arr = container[v1Key] ?? container[_camelCase(v1Key) as string];
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

function _addTypeIfMissing(value: unknown, type: string) {
  if (value == null) return null;
  if (typeof (value as any).toJSON === 'function') {
    const hash = (value as { toJSON: () => Record<string, unknown> }).toJSON();
    return hash.type ? hash : { ...hash, type };
  }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return v.type ? value : { ...value, type };
  }
  return value;
}

function _normalizeRelated(arr: unknown) {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(r => {
    if (r instanceof RelatedConcept) return r;
    if ((r as any)?.ref != null && typeof (r as any).ref !== 'object') {
      throw new InvalidInputError(
        `RelatedConcept.ref must be an object { source, id }, got: ${typeof (r as any).ref}`,
        'object',
      );
    }
    return new RelatedConcept(r);
  });
}

export const conceptParser = new ConceptParser();

