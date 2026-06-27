// Concept → RDF quads. Mirrors glossarist-ruby's `Rdf::GlossConcept`.
//
// URI shape: `<uriBase>/<registerId>/concept/<conceptId>`.
// Localized concepts: `<uriBase>/<registerId>/concept/<conceptId>/<lang>`.
import { DataFactory } from 'n3';
import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { localizedConceptToQuads } from './gloss-localized-concept.js';
import { conceptSourceToQuads } from './gloss-source.js';

const { namedNode, literal, quad } = DataFactory;

export function conceptUri(concept, { registerId, uriBase }) {
  const id = String(concept.id ?? concept.termid ?? '');
  const base = String(uriBase ?? '').replace(/\/+$/, '');
  return `${base}/${registerId}/concept/${id}`;
}

export function* conceptToQuads(concept, options) {
  const subjectUri = conceptUri(concept, options);
  const s = namedNode(subjectUri);

  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.Concept));
  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(WELL_KNOWN.skosConcept));

  yield quad(s, namedNode(PRED.gloss.identifier), literal(String(concept.id ?? concept.termid ?? '')));

  if (concept.status) {
    yield quad(s, namedNode(PRED.gloss.hasStatus), namedNode(`${PRED.gloss.$ns}status/${concept.status}`));
  }

  for (const lang of concept.languages) {
    const lc = concept.localization(lang);
    if (!lc) continue;
    const lcUri = `${subjectUri}/${lang}`;
    yield quad(s, namedNode(PRED.gloss.hasLocalization), namedNode(lcUri));
    yield* localizedConceptToQuads(lc, { parentUri: subjectUri, language: lang });
  }

  let srcIndex = 0;
  for (const source of concept.sources ?? []) {
    yield* conceptSourceToQuads(source, { subjectUri, index: srcIndex });
    srcIndex += 1;
  }
}
