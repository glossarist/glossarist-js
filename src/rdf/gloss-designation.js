// Designation → RDF quads. Mirrors glossarist-ruby's
// `Rdf::GlossDesignation` + the per-subtype classes (GlossExpression,
// GlossAbbreviation, etc.). For now we model the common case (Expression)
// and the principal subtypes — additional subtypes can be added in
// follow-ups without breaking the public `designationToQuads` entry point.
import { DataFactory } from 'n3';
import { PRED } from './predicates.js';
import { SKOSXL, WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';

const { namedNode, literal, quad } = DataFactory;

const TYPE_BY_NORMATIVE_STATUS = {
  preferred: 'prefLabel',
  deprecated: 'hiddenLabel',
  admitted: 'altLabel',
  deprecated_: 'altLabel',
};

// Returns the SKOS-XL predicate (as a string URI) appropriate for this
// designation's normative status. Mirrors `skosxl_label_for` in Ruby.
export function skosxlLabelPredicate(designation) {
  const status = String(designation.normativeStatus ?? '').split('/').pop();
  const label = TYPE_BY_NORMATIVE_STATUS[status] ?? 'altLabel';
  return SKOSXL[label];
}

// Returns the matching plain-SKOS predicate URI (skos:prefLabel etc.).
// Used when emitting direct SKOS alongside reified SKOS-XL.
export function skosLabelPredicate(designation) {
  const status = String(designation.normativeStatus ?? '').split('/').pop();
  const label = TYPE_BY_NORMATIVE_STATUS[status] ?? 'altLabel';
  return PRED.skos[label];
}

// RDF class URI for the designation subtype.
function designationClassUri(type) {
  const CLASS_BY_TYPE = {
    expression: 'Expression',
    abbreviation: 'Abbreviation',
    symbol: 'Symbol',
    'letter-symbol': 'LetterSymbol',
    'graphical-symbol': 'GraphicalSymbol',
  };
  const cls = CLASS_BY_TYPE[type] ?? 'Expression';
  return PRED.gloss[cls];
}

// Emits quads for one designation. Yields them lazily so callers can
// compose many designations into a single stream without intermediate
// arrays.
//
// `subjectUri` is the URI of the LocalizedConcept that owns this designation.
// `index` is the position of the designation within its parent's terms list
// — used to make the bnode ID deterministic.
export function* designationToQuads(designation, { subjectUri, language, index }) {
  const desigSubject = deterministicBnode(subjectUri, 'desig', index);

  const labelPredicate = namedNode(skosxlLabelPredicate(designation));
  yield quad(namedNode(subjectUri), labelPredicate, namedNode(desigSubject));

  yield quad(namedNode(desigSubject), namedNode(WELL_KNOWN.rdfType), namedNode(designationClassUri(designation.type)));
  yield quad(namedNode(desigSubject), namedNode(WELL_KNOWN.rdfType), namedNode(WELL_KNOWN.skosxlLabel));
  yield quad(namedNode(desigSubject), namedNode(SKOSXL.literalForm), literal(designation.designation ?? '', language));

  if (designation.normativeStatus) {
    const statusUri = `${PRED.gloss.$ns}norm/${designation.normativeStatus}`;
    yield quad(namedNode(desigSubject), namedNode(PRED.gloss.normativeStatus), namedNode(statusUri));
  }
}
