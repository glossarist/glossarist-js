// Designation → RDF quads. Mirrors glossarist-ruby's
// `Rdf::GlossDesignation` + the per-subtype classes (GlossExpression,
// GlossAbbreviation, etc.). The ontology class for each subtype is
// provided by the model itself via Designation#rdfClass (OCP: new
// subtypes register without editing this emitter).
import { PRED, PREFIXES } from './predicates.js';
import { SKOSXL, WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';
import { normalizeEnum } from './normalize-enum.js';
import { namedNode, literal, quad } from './terms.js';

const XSD_BOOLEAN = 'http://www.w3.org/2001/XMLSchema#boolean';

// Boolean flag fields on designation subtypes. Each entry maps a model
// field name to its ontology predicate. Only emitted when the value is
// truthy, so legacy data without the fields round-trips unchanged.
const BOOLEAN_FLAGS = [
  ['acronym', PRED.gloss.isAcronym],
  ['initialism', PRED.gloss.isInitialism],
  ['truncation', PRED.gloss.isTruncation],
  ['international', PRED.gloss.isInternational],
  ['absent', PRED.gloss.isAbsent],
];

// Returns the SKOS-XL predicate (as a string URI) appropriate for this
// designation's normative status. Mirrors `skosxl_label_for` in Ruby.
// The dispatch lives on the Designation model so a new status requires
// a single edit there, not here.
export function skosxlLabelPredicate(designation) {
  return designation.skosxlLabelPredicate(PREFIXES.skosxl);
}

// Returns the matching plain-SKOS predicate URI (skos:prefLabel etc.).
// Used when emitting direct SKOS alongside reified SKOS-XL.
export function skosLabelPredicate(designation) {
  return designation.skosLabelPredicate(PREFIXES.skos);
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

  yield quad(namedNode(desigSubject), namedNode(WELL_KNOWN.rdfType), namedNode(`${PRED.gloss.$ns}${designation.rdfClass()}`));
  yield quad(namedNode(desigSubject), namedNode(WELL_KNOWN.rdfType), namedNode(WELL_KNOWN.skosxlLabel));
  yield quad(namedNode(desigSubject), namedNode(SKOSXL.literalForm), literal(designation.designation ?? '', language));

  if (designation.normativeStatus) {
    const statusToken = normalizeEnum(designation.normativeStatus);
    if (statusToken) {
      const statusUri = `${PRED.gloss.$ns}norm/${statusToken}`;
      yield quad(namedNode(desigSubject), namedNode(PRED.gloss.normativeStatus), namedNode(statusUri));
    }
  }

  // Subtype-specific boolean flags. Skipping when falsy preserves
  // backward compatibility with simpler designations.
  const booleanType = namedNode(XSD_BOOLEAN);
  for (const [field, predicate] of BOOLEAN_FLAGS) {
    if (designation[field]) {
      yield quad(namedNode(desigSubject), namedNode(predicate), literal('true', booleanType));
    }
  }
}
