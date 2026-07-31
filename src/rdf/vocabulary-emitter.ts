// Vocabulary graph emitter — emits SKOS ConceptSchemes for the
// enumeration IRIs that glossarist emits in instance data
// (gloss:status/*, gloss:entstatus/*, gloss:norm/*, gloss:srcstatus/*,
// gloss:srctype/*, gloss:datetype/*, gloss:rel/*, etc.).
//
// Each enumeration value becomes a skos:Concept in its corresponding
// skos:ConceptScheme. The scheme uses skos:hasTopConcept to link to
// its members; members use skos:inScheme to link back.
//
// Accepts the schemes data as a plain object — no fs deps, browser-safe.
// Callers can load the JSON file themselves (Node) or construct the
// data inline. CURIEs in the input are resolved to absolute IRIs via
// PREFIXES.

import { namedNode, literal, quad } from './terms.js';
import { PREFIXES } from './predicates.js';
import { resolveIri, RDF_TYPE, RDFS_LABEL } from './curie.js';

const SKOS_NS = PREFIXES.skos;

/**
 * @typedef {Object} VocabTerm
 * @property {string} iri — absolute IRI or CURIE (resolved via PREFIXES)
 * @property {string} label — human-readable label (typically English)
 */
/**
 * @typedef {Object} VocabScheme
 * @property {string} schemeIri — absolute IRI or CURIE
 * @property {string} label
 * @property {readonly VocabTerm[]} terms
 */

/**
 * Emits SKOS ConceptScheme + Concept quads for one scheme.
 *
 * @param {VocabScheme} scheme
 * @returns {Generator<Quad, void, unknown>}
 */
export function* vocabularySchemeToQuads(scheme) {
  const schemeIri = resolveIri(scheme.schemeIri);
  const schemeSubject = namedNode(schemeIri);

  yield quad(schemeSubject, namedNode(RDF_TYPE), namedNode(`${SKOS_NS}ConceptScheme`));
  yield quad(schemeSubject, namedNode(RDFS_LABEL), literal(scheme.label, 'en'));

  for (const term of scheme.terms ?? []) {
    const termIri = resolveIri(term.iri);
    const termSubject = namedNode(termIri);

    yield quad(termSubject, namedNode(RDF_TYPE), namedNode(`${SKOS_NS}Concept`));
    yield quad(termSubject, namedNode(RDFS_LABEL), literal(term.label, 'en'));
    yield quad(termSubject, namedNode(`${SKOS_NS}inScheme`), schemeSubject);
    yield quad(schemeSubject, namedNode(`${SKOS_NS}hasTopConcept`), termSubject);
  }
}

/**
 * Emits SKOS ConceptScheme + Concept quads for many schemes.
 *
 * @param {readonly VocabScheme[]} schemes
 * @returns {Generator<Quad, void, unknown>}
 */
export function* vocabularyToQuads(schemes) {
  for (const scheme of schemes ?? []) {
    yield* vocabularySchemeToQuads(scheme);
  }
}
