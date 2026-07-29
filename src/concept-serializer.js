import * as yaml from 'js-yaml';
import { PartitiveRelation } from './models/partitive-relation.js';
import { GenericRelation } from './models/generic-relation.js';

const DUMP_OPTS = { lineWidth: -1, noRefs: true, sortKeys: false, skipInvalid: true };

// Partition the unified relations array by concrete type and emit
// each type under its own wire key. Concept.relations holds mixed
// types; the wire format stays split for backward compat with
// existing consumers and the JSON Schema in concept-model.
function _emitTypedRelations(concept) {
  const partitiveRels = concept.relations.filter(r => r instanceof PartitiveRelation);
  const genericRels = concept.relations.filter(r => r instanceof GenericRelation);
  return {
    partitive: partitiveRels.map(r => r.toJSON()),
    generic: genericRels.map(r => r.toJSON()),
  };
}

export class ConceptSerializer {
  toCanonicalYaml(concept) {
    const doc = { termid: concept.id };
    if (concept.term) doc.term = concept.term;

    const { partitive, generic } = _emitTypedRelations(concept);
    if (partitive.length > 0) doc.partitive_relations = partitive;
    if (generic.length > 0) doc.generic_relations = generic;

    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (lc) {
        const lcObj = lc.toJSON();
        delete lcObj.language_code;
        doc[lang] = lcObj;
      }
    }

    return yaml.dump(doc, DUMP_OPTS);
  }

  toManagedYaml(concept, uuidFn) {
    const genId = uuidFn ?? (() => crypto.randomUUID());
    const localizedConcepts = {};
    const langDocs = [];

    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (!lc) continue;
      const lcId = genId();
      localizedConcepts[lang] = lcId;

      const lcObj = lc.toJSON();
      langDocs.push({ data: lcObj, id: lcId });
    }

    const mainDoc = {
      data: { identifier: concept.id, localized_concepts: localizedConcepts },
      id: genId(),
    };

    if (concept.domains.length > 0) {
      mainDoc.data.domains = concept.domains.map(d => d.toJSON());
    }

    if (concept.relatedConcepts.length > 0) {
      mainDoc.related = concept.relatedConcepts.map(rc => rc.toJSON());
    }
    const { partitive, generic } = _emitTypedRelations(concept);
    if (partitive.length > 0) mainDoc.partitive_relations = partitive;
    if (generic.length > 0) mainDoc.generic_relations = generic;
    if (concept.sources.length > 0) {
      mainDoc.sources = concept.sources.map(s => s.toJSON());
    }
    if (concept.dates.length > 0) {
      mainDoc.dates = concept.dates.map(d => d.toJSON());
    }
    if (concept.status) mainDoc.status = concept.status;
    if (concept.schemaVersion) mainDoc.schema_version = concept.schemaVersion;

    const parts = [
      '---\n' + yaml.dump(mainDoc, DUMP_OPTS),
      ...langDocs.map(d => '---\n' + yaml.dump(d, DUMP_OPTS)),
    ];
    return parts.join('');
  }

  toYaml(concept, uuidFn) {
    return concept.term
      ? this.toCanonicalYaml(concept)
      : this.toManagedYaml(concept, uuidFn);
  }

  toRegisterYaml(data) {
    return yaml.dump(data, DUMP_OPTS);
  }
}

export const conceptSerializer = new ConceptSerializer();
