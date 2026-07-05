// Type declarations for the public transforms layer.
//
// Mirrors the runtime exports of src/transforms/index.js.

import type { Concept } from '../models/index';
import type { Quad } from '@rdfjs/dataset';

export interface ConceptToGlossTransformOptions {
  registerId?: string;
  uriBase?: string;
  jsonldContext?: Record<string, string>;
}

export declare class ConceptToGlossTransform {
  constructor(options?: ConceptToGlossTransformOptions);
  readonly registerId: string | undefined;
  readonly uriBase: string;
  readonly jsonldContext: Record<string, string> | undefined;

  toTurtle(concept: Concept): Promise<string>;
  toTurtleAll(concepts: Iterable<Concept>): Promise<string>;
  toJsonld(concept: Concept): Promise<string>;
  toJsonldAll(concepts: Iterable<Concept>): Promise<string>;
  toNTriples(concept: Concept): Promise<string>;
  toNTriplesAll(concepts: Iterable<Concept>): Promise<string>;
}
