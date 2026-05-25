import yaml from 'js-yaml';

const DUMP_OPTS = { lineWidth: -1, noRefs: true, sortKeys: false, skipInvalid: true };

export class ConceptSerializer {
  toCanonicalYaml(concept) {
    const doc = { termid: concept.id };
    if (concept.term) doc.term = concept.term;

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
