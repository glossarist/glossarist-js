// Sync Turtle projection: conceptToQuads + writeTurtleSync.
//
// Reuses the rdf/ quad layer so per-concept Turtle carries exactly the
// same gloss: predicates as the aggregate vocabulary output — the
// predicates are generated from concept-model's context.jsonld and
// drift-tested. No second SKOS-only serialization shape.

import type { Quad } from '@rdfjs/types';
import { conceptToQuads } from '../rdf/gloss-concept.js';
import { writeTurtleSync } from '../rdf/write-turtle-sync.js';
import { PREFIXES } from '../rdf/prefixes.js';
import type { Concept } from '../models/concept.js';
import { InvalidInputError } from '../errors.js';
export interface ConceptTurtleOptions {
  /** Required — deployment canonical URI root (never defaulted). */
  uriBase: string;
  /** Required — register id used in concept IRIs. */
  registerId: string;
}

function requireOption(value: unknown, name: string, fnName: string): void {
  if (value == null || value === '') {
    throw new InvalidInputError(
      `${fnName} requires options.${name} — the deployment canonical URI root is never defaulted`,
      `non-empty ${name}`,
    );
  }
}

/**
 * Sync per-concept Turtle. Browser-safe (no node: imports).
 */
export function conceptToTurtle(
  concept: Concept,
  options: ConceptTurtleOptions,
): string {
  requireOption(options.uriBase, 'uriBase', 'conceptToTurtle');
  requireOption(options.registerId, 'registerId', 'conceptToTurtle');

  // conceptToQuads is an untyped generator by design (n3/@rdfjs term
  // variance is bridged once here, mirroring document-writer's addQuad).
  const quads: Quad[] = [];
  for (const q of conceptToQuads(concept, {
    registerId: options.registerId,
    uriBase: options.uriBase,
  }) as Iterable<Quad>) {
    quads.push(q);
  }
  return writeTurtleSync(quads, { prefixes: { ...PREFIXES } });
}
