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
import { genericHyperedgeToQuads, genericHyperedgeSubjectUri, GENERIC_HYPEREDGE_LINK_PREDICATE } from './gloss-generic-hyperedge.js';
import { PartitiveHyperedge } from '../models/partitive-hyperedge.js';
import { GenericHyperedge } from '../models/generic-hyperedge.js';
import { namedNode, literal, quad } from './terms.js';

// Per-type RDF emitter dispatch. Keyed by class. Adding a new hyperedge
// type with its own emitter means: (1) write the emitter module,
// (2) add one entry here. Per TODO Phase 6e this should be a
// self-registering registry; for the two current types, the dispatch
// table is simpler and keeps the dependency graph acyclic.
const HYPEREDGE_EMITTERS = new Map([
  [PartitiveHyperedge, {
    linkPredicate: PRED.gloss.hasPartitiveRelation,
    subjectUri: partitiveRelationSubjectUri,
    toQuads: partitiveRelationToQuads,
  }],
  [GenericHyperedge, {
    linkPredicate: GENERIC_HYPEREDGE_LINK_PREDICATE,
    subjectUri: genericHyperedgeSubjectUri,
    toQuads: genericHyperedgeToQuads,
  }],
]);

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

  // Iterate the unified relations array. Dispatch via per-type
  // emitter table.
  let relIdx = 0;
  for (const relation of concept.relations ?? []) {
    const emitter = HYPEREDGE_EMITTERS.get(relation.constructor);
    if (!emitter) {
      // Unknown hyperedge type — skip rather than crash. The OCP
      // contract (Phase 11) tests that new types register an emitter;
      // skipping here gives external consumers a soft-failure path
      // when they pass around abstract hyperedges the JS layer doesn't
      // recognize yet.
      relIdx += 1;
      continue;
    }
    const relSubject = emitter.subjectUri(subjectUri, relation, relIdx);
    yield quad(s, namedNode(emitter.linkPredicate), namedNode(relSubject));
    yield* emitter.toQuads(relation, { parentUri: subjectUri, index: relIdx });
    relIdx += 1;
  }
}
