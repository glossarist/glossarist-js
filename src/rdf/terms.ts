// Shared RDF/JS term constructors. Replaces the per-emitter
// `const { namedNode, literal, quad } = DataFactory;` pattern that was
// repeated across the RDF layer.
//
// We use n3's DataFactory because it produces terms that are
// interchangeable with @rdfjs/data-model output and because the rest
// of the RDF layer (N3Parser, N3Writer) already speaks n3.

import { DataFactory } from 'n3';
import type { Literal, NamedNode } from '@rdfjs/types';

export const namedNode = DataFactory.namedNode.bind(DataFactory);
export const blankNode = DataFactory.blankNode.bind(DataFactory);
export const defaultGraph = DataFactory.defaultGraph.bind(DataFactory);
export const quad = DataFactory.quad.bind(DataFactory);

export function literal(value: string, languageOrDatatype?: string | NamedNode | null): Literal {
  if (languageOrDatatype == null) return DataFactory.literal(value);
  return DataFactory.literal(value, languageOrDatatype as string | NamedNode);
}
