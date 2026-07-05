// Concept → RDF quads. Mirrors glossarist-ruby's `Rdf::GlossConcept`.
//
// URI shape: `<uriBase>/<registerId>/concept/<conceptId>`.
// Localized concepts: `<uriBase>/<registerId>/concept/<conceptId>/<lang>`.
// Figure/Table/Formula references: `<uriBase>/<registerId>/<kind>/<entityId>`.
import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { localizedConceptToQuads } from './gloss-localized-concept.js';
import { conceptSourceToQuads } from './gloss-source.js';
import { namedNode, literal, quad } from './terms.js';

// Kind tag → URI segment. Each NonVerbalReference subtype has a
// predictable URL path so the same entity is reachable from any
// concept that references it.
const NVR_KIND_SEGMENT = {
  FigureReference: 'figure',
  TableReference: 'table',
  FormulaReference: 'formula',
};

// Builds the URI for a NonVerbalReference target entity. Returns null
// when the reference has no entityId (e.g., inline display-only refs).
function nonVerbalReferenceUri(ref, options) {
  const kind = NVR_KIND_SEGMENT[ref.constructor.name];
  if (!kind || !ref.entityId) return null;
  const base = String(options.uriBase ?? '').replace(/\/+$/, '');
  return `${base}/${options.registerId}/${kind}/${ref.entityId}`;
}

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

  // NonVerbal references — emit the link quad only. The actual
  // Figure/Table/Formula entity quads are emitted by `nonVerbalEntityToQuads`
  // when the dataset's NVR collection is iterated.
  for (const ref of [...(concept.figures ?? []), ...(concept.tables ?? []), ...(concept.formulas ?? [])]) {
    const targetUri = nonVerbalReferenceUri(ref, options);
    if (targetUri) {
      yield quad(s, namedNode(PRED.gloss.hasNonVerbalRep), namedNode(targetUri));
    }
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
