// Type declarations for the public RDF layer.
//
// Mirrors the runtime exports of src/rdf/index.js. Quads use the RDF/JS
// Quad interface from @rdfjs/dataset (compatible with n3's DataFactory
// output). Dataset is the RDF/JS Dataset.Core interface.

import type { Quad, Dataset, Term } from '@rdfjs/dataset';
import type { Concept } from '../models/index';
import type { LocalizedConcept } from '../models/index';
import type { Designation } from '../models/index';
import type { DetailedDefinition } from '../models/index';
import type { ConceptSource } from '../models/index';
import type { NonVerbRep, Figure, Table, Formula } from '../models/index';

export { PRED, PREFIXES } from './predicates';
export type PredicateMap = typeof PRED;
export type PrefixMap = typeof PREFIXES;

export type { Quad, Dataset, Term };

export const SKOSXL: {
  prefLabel: string;
  altLabel: string;
  hiddenLabel: string;
  literalForm: string;
};

export const WELL_KNOWN: {
  rdfType: string;
  rdfValue: string;
  skosConcept: string;
  skosxlLabel: string;
};

export declare function deterministicId(...parts: Array<string | number | null | undefined>): string;
export declare function deterministicBnode(subject: string, role: string, index: number): string;

export interface ConceptUriOptions {
  registerId: string;
  uriBase?: string;
}

export declare function conceptUri(concept: Concept | { id?: string; termid?: string }, options: ConceptUriOptions): string;
export declare function conceptToQuads(concept: Concept, options: ConceptUriOptions): Generator<Quad, void, unknown>;

export interface LocalizedConceptEmitOptions {
  parentUri: string;
  language: string;
}

export declare function localizedConceptUri(parentUri: string, language: string): string;
export declare function localizedConceptToQuads(localizedConcept: LocalizedConcept, options: LocalizedConceptEmitOptions): Generator<Quad, void, unknown>;

export interface DesignationEmitOptions {
  subjectUri: string;
  language: string;
  index: number;
}

export declare function designationToQuads(designation: Designation, options: DesignationEmitOptions): Generator<Quad, void, unknown>;
export declare function skosLabelPredicate(designation: Designation): string;
export declare function skosxlLabelPredicate(designation: Designation): string;

export interface DetailedDefinitionEmitOptions {
  subjectUri: string;
  language?: string;
  index: number;
  role: 'hasDefinition' | 'hasNote' | 'hasExample' | 'hasAnnotation' | 'hasScopedExample';
}

export declare function detailedDefinitionToQuads(definition: DetailedDefinition, options: DetailedDefinitionEmitOptions): Generator<Quad, void, unknown>;

export interface ConceptSourceEmitOptions {
  subjectUri: string;
  index: number;
}

export declare function conceptSourceToQuads(source: ConceptSource, options: ConceptSourceEmitOptions): Generator<Quad, void, unknown>;

// ── Non-verbal representation emitters ─────────────────────────────────

export interface NonVerbalRepEmitOptions {
  parentUri: string;
  index: number;
  language?: string | null;
}

export declare function nonVerbalRepToQuads(nvr: NonVerbRep, options: NonVerbalRepEmitOptions): Generator<Quad, void, unknown>;

export interface NonVerbalEntityEmitOptions {
  registerId: string;
  uriBase?: string;
}

export type NonVerbalEntity = Figure | Table | Formula;

export declare function nonVerbalEntityUri(entity: NonVerbalEntity, options: NonVerbalEntityEmitOptions): string;
export declare function nonVerbalEntityToQuads(entity: NonVerbalEntity, options: NonVerbalEntityEmitOptions): Generator<Quad, void, unknown>;

// Vocabulary emitter (SKOS ConceptSchemes for enumeration IRIs)
export interface VocabTerm {
  iri: string;
  label: string;
}
export interface VocabScheme {
  schemeIri: string;
  label: string;
  terms: readonly VocabTerm[];
}
export declare function resolveIri(iri: string): string;
export declare function vocabularySchemeToQuads(scheme: VocabScheme): Generator<Quad, void, unknown>;
export declare function vocabularyToQuads(schemes: readonly VocabScheme[]): Generator<Quad, void, unknown>;

export declare function collectQuads(quadsIterable: Iterable<Quad>): Quad[];

export interface WriteTurtleOptions {
  prefixes?: Record<string, string>;
}

export declare function writeTurtle(quads: Iterable<Quad>, options?: WriteTurtleOptions): Promise<string>;
export declare function writeNTriples(quads: Iterable<Quad>): Promise<string>;

export interface WriteJsonldOptions {
  context?: Record<string, string>;
}

export declare function writeJsonld(quads: Iterable<Quad>, options?: WriteJsonldOptions): Promise<string>;
export declare function sortQuads(quads: Iterable<Quad>): Quad[];

export interface ValidationReport {
  conforms: boolean;
  results: ReadonlyArray<{
    focusNode?: Term;
    shape?: Term;
    path?: Term;
    message: Term[];
  }>;
}

export declare function loadShapes(options?: { shapesPath?: string }): Promise<Dataset>;
export declare function validateShacl(dataDataset: Dataset, options?: { shapes?: Dataset; shapesPath?: string }): Promise<ValidationReport>;
export declare function clearShapesCache(): void;
export declare function quadsToDataset(quads: Iterable<Quad>): Dataset;
