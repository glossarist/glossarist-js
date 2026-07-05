// Image variant emitter — emits foaf:Image per format/language variant
// of a dataset figure. Mirrors concept-browser's image-variant-emitter.ts.
//
// Each variant becomes a foaf:Image with:
// - dcterms:format (MIME type)
// - dcterms:language (when localized)
// - dcat:byteSize (when known)
// - dcat:downloadURL (canonical download)

import { namedNode, literal, quad } from './terms.js';

const FOAF_NS = 'http://xmlns.com/foaf/0.1/';
const DCTERMS_NS = 'http://purl.org/dc/terms/';
const DCAT_NS = 'http://www.w3.org/ns/dcat#';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

const FOAF = {
  Image: `${FOAF_NS}Image`,
};
const DCTERMS = {
  format: `${DCTERMS_NS}format`,
  language: `${DCTERMS_NS}language`,
};
const DCAT = {
  byteSize: `${DCAT_NS}byteSize`,
  downloadURL: `${DCAT_NS}downloadURL`,
};
const XSD_INTEGER = `${XSD_NS}integer`;

const DEFAULT_BASE_URI = 'https://glossarist.org';

/**
 * @typedef {'svg' | 'png' | 'webp' | 'jpg' | 'gif'} ImageFormat
 */
/**
 * @typedef {Object} ImageVariantInput
 * @property {string} registerId
 * @property {string} figureId
 * @property {string} [lang]
 * @property {ImageFormat} format
 * @property {number} [byteSize]
 * @property {string} downloadUrl
 */

const MIME_BY_FORMAT = Object.freeze({
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  gif: 'image/gif',
});

/**
 * Returns the canonical IRI for an image variant. Includes the lang
 * segment when the variant is localized, otherwise omits it.
 */
export function imageVariantIri(input, baseUri = DEFAULT_BASE_URI) {
  const langSuffix = input.lang ? `${input.lang}.` : '';
  return `${baseUri}/${input.registerId}/image/${input.figureId}/${langSuffix}${input.format}`;
}

/**
 * Emits foaf:Image quads for one image variant.
 */
export function* imageVariantToQuads(input, baseUri = DEFAULT_BASE_URI) {
  const img = namedNode(imageVariantIri(input, baseUri));
  yield quad(img, namedNode(RDF_TYPE), namedNode(FOAF.Image));
  yield quad(img, namedNode(DCTERMS.format), literal(MIME_BY_FORMAT[input.format] ?? 'application/octet-stream'));
  if (input.lang) {
    yield quad(img, namedNode(DCTERMS.language), literal(input.lang));
  }
  if (input.byteSize != null) {
    yield quad(img, namedNode(DCAT.byteSize), literal(String(input.byteSize), namedNode(XSD_INTEGER)));
  }
  yield quad(img, namedNode(DCAT.downloadURL), namedNode(input.downloadUrl));
}
