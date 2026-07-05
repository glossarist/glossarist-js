import * as yaml from 'js-yaml';
import { Concept } from './models/concept.js';
import { RelatedConcept } from './models/related-concept.js';
import { InvalidInputError, YamlParseError } from './errors.js';

const STRUCTURAL_KEYS = new Set(['termid', 'term', 'figures', 'tables', 'formulas']);

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

    return new Concept({
      id: String(mc.data.identifier),
      term: null,
      localizations,
      related: _normalizeRelated(mc.related ?? mc.data?.related),
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
