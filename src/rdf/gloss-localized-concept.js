// LocalizedConcept → RDF quads. Mirrors glossarist-ruby's
// `Rdf::GlossLocalizedConcept` + the `EmitsExtraTriples` hook.
//
// Emits BOTH reified SKOS-XL labels AND direct SKOS literals, so consumers
// that don't implement SKOS-XL still see labels/definitions/notes/examples
// as plain literals. This is the same shape glossarist-ruby emits after
// WS-B Phase 1.
import { PRED, PREFIXES } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { designationToQuads, skosLabelPredicate } from './gloss-designation.js';
import { detailedDefinitionToQuads } from './gloss-detailed-definition.js';
import { conceptSourceToQuads } from './gloss-source.js';
import { nonVerbalRepToQuads } from './gloss-non-verbal-rep.js';
import { namedNode, literal, quad } from './terms.js';
const DCTERMS_LANGUAGE = `${PREFIXES.dcterms}language`;

export function localizedConceptUri(parentUri, language) {
  return `${parentUri}/${language}`;
}

export function* localizedConceptToQuads(localizedConcept, { parentUri, language }) {
  const subjectUri = localizedConceptUri(parentUri, language);
  const s = namedNode(subjectUri);

  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.LocalizedConcept));
  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(WELL_KNOWN.skosConcept));
  yield quad(s, namedNode(PRED.gloss.isLocalizationOf), namedNode(parentUri));
  yield quad(s, namedNode(DCTERMS_LANGUAGE), literal(language));

  if (localizedConcept.entryStatus) {
    yield quad(s, namedNode(PRED.gloss.hasEntryStatus), namedNode(`${PRED.gloss.$ns}entstatus/${localizedConcept.entryStatus}`));
  }
  if (localizedConcept.domain) {
    yield quad(s, namedNode(PRED.gloss.domain), literal(localizedConcept.domain));
  }
  if (localizedConcept.release) {
    yield quad(s, namedNode(PRED.gloss.release), literal(localizedConcept.release));
  }
  if (localizedConcept.script) {
    yield quad(s, namedNode(PRED.gloss.script), literal(localizedConcept.script));
  }
  if (localizedConcept.system) {
    yield quad(s, namedNode(PRED.gloss.conversionSystem), literal(localizedConcept.system));
  }

  let desigIndex = 0;
  for (const designation of localizedConcept.terms ?? []) {
    yield* designationToQuads(designation, { subjectUri, language, index: desigIndex });
    // Direct SKOS literal alongside the reified SKOS-XL form.
    yield quad(s, namedNode(skosLabelPredicate(designation)), literal(designation.designation, language));
    desigIndex += 1;
  }

  yield* definitionsToQuads(localizedConcept.definitions, { subjectUri, language, role: 'hasDefinition' });
  yield* definitionsToQuads(localizedConcept.notes, { subjectUri, language, role: 'hasNote' });
  yield* definitionsToQuads(localizedConcept.examples, { subjectUri, language, role: 'hasExample' });
  yield* definitionsToQuads(localizedConcept.annotations, { subjectUri, language, role: 'hasAnnotation' });

  let nvrIndex = 0;
  for (const nvr of localizedConcept.nonVerbalRep ?? []) {
    yield* nonVerbalRepToQuads(nvr, { parentUri: subjectUri, index: nvrIndex, language });
    nvrIndex += 1;
  }

  let srcIndex = 0;
  for (const source of localizedConcept.sources ?? []) {
    yield* conceptSourceToQuads(source, { subjectUri, index: srcIndex });
    srcIndex += 1;
  }
}

function* definitionsToQuads(definitions, { subjectUri, language, role }) {
  if (!definitions) return;
  let i = 0;
  for (const def of definitions) {
    yield* detailedDefinitionToQuads(def, { subjectUri, language, index: i, role });
    i += 1;
  }
}
