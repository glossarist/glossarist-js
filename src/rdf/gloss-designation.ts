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

const BOOLEAN_FLAGS = [
  ['acronym', PRED.gloss.isAcronym],
  ['initialism', PRED.gloss.isInitialism],
  ['truncation', PRED.gloss.isTruncation],
  ['international', PRED.gloss.isInternational],
  ['absent', PRED.gloss.isAbsent],
] as const;

interface DesignationLike {
  skosxlLabelPredicate(ns: string): string;
  skosLabelPredicate(ns: string): string;
  rdfClass(): string;
  designation?: string | null;
  normativeStatus?: string | null;
  [key: string]: unknown;
}
export type { DesignationLike };

export function skosxlLabelPredicate(designation: DesignationLike): string {
  return designation.skosxlLabelPredicate(PREFIXES.skosxl);
}

export function skosLabelPredicate(designation: DesignationLike): string {
  return designation.skosLabelPredicate(PREFIXES.skos);
}

export function* designationToQuads(designation: DesignationLike, { subjectUri, language, index }: { subjectUri: string; language?: string | null; index: number }) {
  const desigSubject = deterministicBnode(subjectUri, 'desig', index);

  const labelPredicate = namedNode(skosxlLabelPredicate(designation));
  yield quad(namedNode(subjectUri), labelPredicate, namedNode(desigSubject));

  yield quad(namedNode(desigSubject), namedNode(WELL_KNOWN.rdfType), namedNode(`${PRED.gloss.$ns}${designation.rdfClass()}`));
  yield quad(namedNode(desigSubject), namedNode(WELL_KNOWN.rdfType), namedNode(WELL_KNOWN.skosxlLabel));
  yield quad(namedNode(desigSubject), namedNode(SKOSXL.literalForm), literal(designation.designation ?? '', language ?? undefined));

  if (designation.normativeStatus) {
    const statusToken = normalizeEnum(designation.normativeStatus);
    if (statusToken) {
      const statusUri = `${PRED.gloss.$ns}norm/${statusToken}`;
      yield quad(namedNode(desigSubject), namedNode(PRED.gloss.normativeStatus), namedNode(statusUri));
    }
  }

  const booleanType = namedNode(XSD_BOOLEAN);
  for (const [field, predicate] of BOOLEAN_FLAGS) {
    if (designation[field]) {
      yield quad(namedNode(desigSubject), namedNode(predicate), literal('true', booleanType));
    }
  }
}
