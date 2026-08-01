// DetailedDefinition → RDF quads. Mirrors glossarist-ruby's
// `Rdf::GlossDetailedDefinition`. Used for definitions, notes, examples,
// and annotations — they all share the same shape (content + optional
// sources + nested examples).
//
// The emitter takes a `linkPredicate` (e.g. PRED.gloss.hasDefinition,
// PRED.gloss.hasNote, PRED.gloss.hasExample) so callers can reuse it for
// any role.
import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';
import { namedNode, literal, quad } from './terms.js';

export type DefinitionRole = 'hasDefinition' | 'hasNote' | 'hasExample' | 'hasScopedExample' | 'hasAnnotation';

interface DetailedDefinitionLike {
  content?: string | null;
  examples?: ReadonlyArray<DetailedDefinitionLike>;
}
export type { DetailedDefinitionLike };

export function* detailedDefinitionToQuads(definition: DetailedDefinitionLike, {
  subjectUri, language, index, role,
}: { subjectUri: string; language?: string | null; index: number; role: string }): Generator<ReturnType<typeof quad>> {
  const linkPredicate = linkPredicateFor(role as DefinitionRole);
  const defSubject = deterministicBnode(subjectUri, role, index);

  yield quad(namedNode(subjectUri), namedNode(linkPredicate), namedNode(defSubject));
  yield quad(namedNode(defSubject), namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.DetailedDefinition));

  if (definition.content) {
    yield quad(
      namedNode(defSubject),
      namedNode(WELL_KNOWN.rdfValue),
      literal(definition.content, language ?? undefined),
    );
  }

  const directPredicate = directSkosPredicateFor(role as DefinitionRole);
  if (directPredicate && definition.content) {
    yield quad(namedNode(subjectUri), namedNode(directPredicate), literal(definition.content, language ?? undefined));
  }

  let exampleIndex = 0;
  for (const example of definition.examples ?? []) {
    yield* detailedDefinitionToQuads(example, {
      subjectUri: defSubject, language, index: exampleIndex, role: 'hasScopedExample' as DefinitionRole,
    });
    exampleIndex += 1;
  }
}

function linkPredicateFor(role: DefinitionRole): string {
  switch (role) {
    case 'hasDefinition': return PRED.gloss.hasDefinition;
    case 'hasNote': return PRED.gloss.hasNote;
    case 'hasExample': return PRED.gloss.hasExample;
    case 'hasScopedExample': return PRED.gloss.hasScopedExample;
    case 'hasAnnotation': return PRED.gloss.hasAnnotation;
    default: throw new Error(`Unknown detailed-definition role: ${String(role)}`);
  }
}

function directSkosPredicateFor(role: DefinitionRole): string | null {
  switch (role) {
    case 'hasDefinition': return PRED.skos.definition;
    case 'hasNote': return PRED.skos.scopeNote;
    case 'hasExample': return PRED.skos.example;
    case 'hasScopedExample': return PRED.skos.example;
    case 'hasAnnotation': return null;
    default: throw new Error(`Unknown detailed-definition role: ${String(role)}`);
  }
}
