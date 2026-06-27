// DetailedDefinition → RDF quads. Mirrors glossarist-ruby's
// `Rdf::GlossDetailedDefinition`. Used for definitions, notes, examples,
// and annotations — they all share the same shape (content + optional
// sources + nested examples).
//
// The emitter takes a `linkPredicate` (e.g. PRED.gloss.hasDefinition,
// PRED.gloss.hasNote, PRED.gloss.hasExample) so callers can reuse it for
// any role.
import { DataFactory } from 'n3';
import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';

const { namedNode, literal, quad } = DataFactory;

export function* detailedDefinitionToQuads(definition, {
  subjectUri, language, index, role,
}) {
  const linkPredicate = linkPredicateFor(role);
  const defSubject = deterministicBnode(subjectUri, role, index);

  yield quad(namedNode(subjectUri), namedNode(linkPredicate), namedNode(defSubject));
  yield quad(namedNode(defSubject), namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.DetailedDefinition));

  if (definition.content) {
    yield quad(
      namedNode(defSubject),
      namedNode(WELL_KNOWN.rdfValue),
      literal(definition.content, language),
    );
  }

  // Plain SKOS direct literal — so non-SKOS-XL consumers see definitions.
  // The reified form above carries the same text with sources/examples;
  // this direct literal makes SPARQL `?c skos:definition ?d` work.
  const directPredicate = directSkosPredicateFor(role);
  if (directPredicate && definition.content) {
    yield quad(namedNode(subjectUri), namedNode(directPredicate), literal(definition.content, language));
  }

  let exampleIndex = 0;
  for (const example of definition.examples ?? []) {
    yield* detailedDefinitionToQuads(example, {
      subjectUri: defSubject, language, index: exampleIndex, role: 'hasExample',
    });
    exampleIndex += 1;
  }
}

function linkPredicateFor(role) {
  switch (role) {
    case 'hasDefinition': return PRED.gloss.hasDefinition;
    case 'hasNote': return PRED.gloss.hasNote;
    case 'hasExample': return PRED.gloss.hasExample;
    case 'hasAnnotation': return PRED.gloss.hasAnnotation;
    default: throw new Error(`Unknown detailed-definition role: ${role}`);
  }
}

function directSkosPredicateFor(role) {
  switch (role) {
    case 'hasDefinition': return PRED.skos.definition;
    case 'hasNote': return PRED.skos.scopeNote;
    case 'hasExample': return PRED.skos.example;
    // No direct SKOS counterpart for annotations.
    case 'hasAnnotation': return null;
    default: return null;
  }
}
