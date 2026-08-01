import * as yaml from 'js-yaml';
import { PartitiveHyperedge } from './models/partitive-hyperedge.js';
import { GenericHyperedge } from './models/generic-hyperedge.js';
import type { Concept } from './models/concept.js';

const DUMP_OPTS = { lineWidth: -1, noRefs: true, sortKeys: false, skipInvalid: true };

function _emitTypedRelations(concept: Concept) {
  const partitiveRels = concept.relations.filter(r => r instanceof PartitiveHyperedge);
  const genericRels = concept.relations.filter(r => r instanceof GenericHyperedge);
  return {
    partitive: partitiveRels.map(r => r.toJSON()),
    generic: genericRels.map(r => r.toJSON()),
  };
}

export class ConceptSerializer {
  toCanonicalYaml(concept: Concept) {
    const doc: Record<string, unknown> = { termid: concept.id };
    if (concept.term) doc.term = concept.term;

    const { partitive, generic } = _emitTypedRelations(concept);
    if (partitive.length > 0) doc.partitive_relations = partitive;
    if (generic.length > 0) doc.generic_relations = generic;

    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (lc) {
        const lcObj = lc.toJSON() as Record<string, unknown>;
        delete lcObj.language_code;
        doc[lang] = lcObj;
      }
    }

    return yaml.dump(doc, DUMP_OPTS);
  }

  toManagedYaml(concept: Concept, uuidFn?: () => string) {
    const genId = uuidFn ?? (() => crypto.randomUUID());
    const localizedConcepts: Record<string, string> = {};
    const langDocs: Array<{ data: unknown; id: string }> = [];

    for (const lang of concept.languages) {
      const lc = concept.localization(lang);
      if (!lc) continue;
      const lcId = genId();
      localizedConcepts[lang] = lcId;

      const lcObj = lc.toJSON();
      langDocs.push({ data: lcObj, id: lcId });
    }

    const mainDoc: Record<string, unknown> = {
      data: { identifier: concept.id, localized_concepts: localizedConcepts },
      id: genId(),
    };

    if (concept.domains.length > 0) {
      (mainDoc.data as Record<string, unknown>).domains = concept.domains.map(d => d.toJSON());
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

  toYaml(concept: Concept, uuidFn?: () => string) {
    return concept.term
      ? this.toCanonicalYaml(concept)
      : this.toManagedYaml(concept, uuidFn);
  }

  toRegisterYaml(data: unknown) {
    return yaml.dump(data, DUMP_OPTS);
  }
}

export const conceptSerializer = new ConceptSerializer();


