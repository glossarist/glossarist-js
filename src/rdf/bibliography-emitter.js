// Bibliography emitter — emits dcterms:BibliographicResource per
// bibliography entry. Mirrors concept-browser's bibliography-emitter.ts.
//
// Each entry becomes a typed resource with:
// - dcterms:identifier (the entry id)
// - dcterms:bibliographicCitation (the reference string)
// - dcterms:title (optional)
// - foaf:page (optional link)
// - dcterms:type (optional, value URIs from gloss:bibtype/*)
// - dcterms:isPartOf (parent dataset)

import { namedNode, literal, quad } from './terms.js';

const DCTERMS_NS = 'http://purl.org/dc/terms/';
const FOAF_NS = 'http://xmlns.com/foaf/0.1/';
const GLOSS_NS = 'https://www.glossarist.org/ontologies/';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

const DCTERMS = {
  BibliographicResource: `${DCTERMS_NS}BibliographicResource`,
  identifier: `${DCTERMS_NS}identifier`,
  bibliographicCitation: `${DCTERMS_NS}bibliographicCitation`,
  title: `${DCTERMS_NS}title`,
  type: `${DCTERMS_NS}type`,
  isPartOf: `${DCTERMS_NS}isPartOf`,
};
const FOAF = {
  page: `${FOAF_NS}page`,
};

// No hardcoded default base URI. Callers MUST pass baseUri explicitly
// so instance IRIs reflect the consumer's domain, not the library's.

/**
 * @typedef {Object} BibliographyEntry
 * @property {string} id
 * @property {string} reference
 * @property {string} [title]
 * @property {string} [link]
 * @property {string} [type]
 */
/**
 * @typedef {Object} BibliographyInput
 * @property {string} registerId
 * @property {readonly BibliographyEntry[]} entries
 * @property {string} [baseUri]
 */

/**
 * Returns the canonical IRI for a bibliography entry.
 *
 * @param {string} registerId
 * @param {string} entryId
 * @param {string} [baseUri]
 */
export function bibliographyEntryIri(registerId, entryId, baseUri) {
  if (!baseUri) throw new Error('bibliographyEntryIri requires baseUri — the deployment canonical URI root. glossarist-js does NOT default to glossarist.org because instance data identity must reflect the consumer domain.');
  return `${baseUri}/${registerId}/bib/${entryId}`;
}

/**
 * Emits dcterms:BibliographicResource quads for each entry. Entries
 * without an id or reference are skipped (matches concept-browser).
 *
 * @param {BibliographyInput} input
 * @returns {Generator<Quad, void, unknown>}
 */
export function* bibliographyToQuads(input) {
  const baseUri = input.baseUri;
  if (!baseUri) throw new Error('bibliographyToQuads requires input.baseUri — the deployment canonical URI root.');
  const parentIri = `${baseUri}/${input.registerId}/`;

  for (const entry of input.entries ?? []) {
    if (!entry.id || !entry.reference) continue;
    const entryIri = bibliographyEntryIri(input.registerId, entry.id, baseUri);
    const e = namedNode(entryIri);

    yield quad(e, namedNode(RDF_TYPE), namedNode(DCTERMS.BibliographicResource));
    yield quad(e, namedNode(DCTERMS.identifier), literal(entry.id));
    yield quad(e, namedNode(DCTERMS.bibliographicCitation), literal(entry.reference));
    if (entry.title) {
      yield quad(e, namedNode(DCTERMS.title), literal(entry.title));
    }
    if (entry.link) {
      yield quad(e, namedNode(FOAF.page), namedNode(entry.link));
    }
    if (entry.type) {
      yield quad(e, namedNode(DCTERMS.type), namedNode(`${GLOSS_NS}bibtype/${entry.type}`));
    }
    yield quad(e, namedNode(DCTERMS.isPartOf), namedNode(parentIri));
  }
}

/**
 * Normalizes raw bibliography data from a v3 YAML bibliography file.
 * Accepts both shapes:
 *   - { bibliography: [...] }
 *   - { <id>: { ... }, <id>: { ... } }
 *
 * Returns a flat list of BibliographyEntry objects with explicit ids.
 */
export function normalizeBibliographyData(raw) {
  if (!raw || typeof raw !== 'object') return [];
  if (Array.isArray(raw.bibliography)) {
    return raw.bibliography.map(e => entryFromV3(e));
  }
  const entries = [];
  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    entries.push(entryFromV3(value, id));
  }
  return entries;
}

function entryFromV3(e, fallbackId) {
  return {
    id: e.id ?? fallbackId ?? '',
    reference: e.reference ?? '',
    title: e.title,
    link: e.link,
    type: e.type,
  };
}
