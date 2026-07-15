// ConceptSource → RDF quads. Mirrors glossarist-ruby's
// `Rdf::GlossConceptSource` + `Rdf::GlossCitation`. Sources are reified
// resources linked from their parent (concept or localized concept or
// definition) via `gloss:hasSource`.
import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';
import { normalizeEnum } from './normalize-enum.js';
import { namedNode, literal, quad } from './terms.js';

export function* conceptSourceToQuads(source, { subjectUri, index }) {
  const srcSubject = deterministicBnode(subjectUri, 'source', index);

  yield quad(namedNode(subjectUri), namedNode(PRED.gloss.hasSource), namedNode(srcSubject));
  yield quad(namedNode(srcSubject), namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.ConceptSource));

  const statusToken = normalizeEnum(source.status);
  if (statusToken) {
    yield quad(namedNode(srcSubject), namedNode(PRED.gloss.sourceStatus), namedNode(`${PRED.gloss.$ns}srcstatus/${statusToken}`));
  }
  const typeToken = normalizeEnum(source.type);
  if (typeToken) {
    yield quad(namedNode(srcSubject), namedNode(PRED.gloss.sourceType), namedNode(`${PRED.gloss.$ns}srctype/${typeToken}`));
  }
  if (source.modification) {
    yield quad(namedNode(srcSubject), namedNode(PRED.gloss.modification), literal(source.modification));
  }

  if (source.origin) {
    yield* citationToQuads(source.origin, { subjectUri: srcSubject, predicate: PRED.gloss.sourceOrigin, bnodeKey: 'origin' });
  }

  const sourcedFrom = source.sourced_from ?? [];
  for (let i = 0; i < sourcedFrom.length; i++) {
    yield* citationToQuads(sourcedFrom[i], { subjectUri: srcSubject, predicate: PRED.gloss.sourcedFrom, bnodeKey: 'sourced_from', index: i });
  }
}

function* citationToQuads(citation, { subjectUri, predicate, bnodeKey, index = 0 }) {
  const citSubject = deterministicBnode(subjectUri, bnodeKey, index);
  yield quad(namedNode(subjectUri), namedNode(predicate), namedNode(citSubject));
  yield quad(namedNode(citSubject), namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.Citation));

  if (citation.original) {
    yield quad(namedNode(citSubject), namedNode(PRED.gloss.citationOriginal), literal(citation.original));
  }
  if (citation.link) {
    yield quad(namedNode(citSubject), namedNode(PRED.gloss.citationLink), literal(citation.link));
  }

  if (citation.ref) {
    if (citation.ref.source) yield quad(namedNode(citSubject), namedNode(PRED.gloss.citationRefSource), literal(citation.ref.source));
    if (citation.ref.id) yield quad(namedNode(citSubject), namedNode(PRED.gloss.citationRefId), literal(citation.ref.id));
    if (citation.ref.version) yield quad(namedNode(citSubject), namedNode(PRED.gloss.citationRefVersion), literal(citation.ref.version));
  }
}
