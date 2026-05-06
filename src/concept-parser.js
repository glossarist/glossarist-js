import yaml from 'js-yaml';
import { Concept } from './models/concept.js';
import { InvalidInputError, YamlParseError } from './errors.js';

const STRUCTURAL_KEYS = new Set(['termid', 'term']);

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
      docs = yaml.loadAll(raw, null, { schema: yaml.DEFAULT_SCHEMA });
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
      raw: mc,
    });
  }
}

export const conceptParser = new ConceptParser();
