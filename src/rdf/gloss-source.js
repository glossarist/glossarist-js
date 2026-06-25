// ConceptSource → RDF quads. Mirrors glossarist-ruby's
// `Rdf::GlossConceptSource` + `Rdf::GlossCitation`. Sources are reified
// resources linked from their parent (concept or localized concept or
// definition) via `gloss:hasSource`.
import { DataFactory } from 'n3';
import { PRED } from '@glossarist/concept-model';
import { WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';

const { namedNode, literal, quad } = DataFactory;

export function* conceptSourceToQuads(source, { subjectUri, index }) {
  const srcSubject = deterministicBnode(subjectUri, 'source', index);

  yield quad(namedNode(subjectUri), namedNode(PRED.gloss.hasSource), namedNode(srcSubject));
  yield quad(namedNode(srcSubject), namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.ConceptSource));

  if (source.status) {
    yield quad(namedNode(srcSubject), namedNode(PRED.gloss.sourceStatus), namedNode(`${PRED.gloss.$ns}srcstatus/${source.status}`));
  }
  if (source.type) {
    yield quad(namedNode(srcSubject), namedNode(PRED.gloss.sourceType), namedNode(`${PRED.gloss.$ns}srctype/${source.type}`));
  }
  if (source.modification) {
    yield quad(namedNode(srcSubject), namedNode(PRED.gloss.modification), literal(source.modification));
  }

  if (source.origin) {
    yield* citationToQuads(source.origin, { subjectUri: srcSubject });
  }
}

function* citationToQuads(citation, { subjectUri }) {
  const citSubject = deterministicBnode(subjectUri, 'origin', 0);
  yield quad(namedNode(subjectUri), namedNode(PRED.gloss.sourceOrigin), namedNode(citSubject));
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
