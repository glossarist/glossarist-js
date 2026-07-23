// Concept → RDF quads. Mirrors glossarist-ruby's `Rdf::GlossConcept`.
//
// URI shape: `<uriBase>/<registerId>/concept/<conceptId>`.
// Localized concepts: `<uriBase>/<registerId>/concept/<conceptId>/<lang>`.
// Figure/Table/Formula references: `<uriBase>/<registerId>/<kind>/<entityId>`.
import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { localizedConceptToQuads } from './gloss-localized-concept.js';
import { conceptSourceToQuads } from './gloss-source.js';
import { partitiveRelationToQuads, partitiveRelationSubjectUri } from './gloss-partitive-relation.js';
import { hyperedgeToQuads, hyperedgeSubjectUri } from './gloss-hyperedge.js';
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

  // v2 canonical: concept.partitiveRelations. v1 alias
  // (concept.partitiveHyperedges) points at the same array — both
  // work here.
  const relations = concept.partitiveRelations ?? concept.partitiveHyperedges ?? [];
  let relIdx = 0;
  for (const relation of relations) {
    // Skip v1 PartitiveHyperedge instances — they have their own
    // emitter (gloss-hyperedge.js) and would double-emit. The parser
    // always produces v2 PartitiveRelation instances; only direct
    // callers using the v1 model would see this branch.
    const isV2 = !relation.enumeration && !relation.markers && !relation.parts
      || (relation.completeness != null || relation.partitives != null);
    if (!isV2) {
      const heSubject = hyperedgeSubjectUri(subjectUri, relation, relIdx);
      yield quad(s, namedNode(PRED.gloss.hasPartitiveHyperedge), namedNode(heSubject));
      yield* hyperedgeToQuads(relation, { parentUri: subjectUri, index: relIdx });
    } else {
      const relSubject = partitiveRelationSubjectUri(subjectUri, relation, relIdx);
      yield quad(s, namedNode(PRED.gloss.hasPartitiveRelation), namedNode(relSubject));
      yield* partitiveRelationToQuads(relation, { parentUri: subjectUri, index: relIdx });
    }
    relIdx += 1;
  }
}
