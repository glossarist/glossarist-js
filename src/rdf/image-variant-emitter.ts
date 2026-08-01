// Image variant emitter — emits foaf:Image per format/language variant
// of a dataset figure. Mirrors concept-browser's image-variant-emitter.ts.
//
// Each variant becomes a foaf:Image with:
// - dcterms:format (MIME type)
// - dcterms:language (when localized)
// - dcat:byteSize (when known)
// - dcat:downloadURL (canonical download)

import { namedNode, literal, quad } from './terms.js';
import { PREFIXES } from './prefixes.js';
import { RDF_TYPE } from './curie.js';

const FOAF_NS    = PREFIXES.foaf ?? 'http://xmlns.com/foaf/0.1/';
const DCTERMS_NS = PREFIXES.dcterms;
const DCAT_NS    = PREFIXES.dcat ?? 'http://www.w3.org/ns/dcat#';
const XSD_NS     = PREFIXES.xsd;

const FOAF: any = {
  Image: `${FOAF_NS}Image`,
};
const DCTERMS: any = {
  format: `${DCTERMS_NS}format`,
  language: `${DCTERMS_NS}language`,
};
const DCAT: any = {
  byteSize: `${DCAT_NS}byteSize`,
  downloadURL: `${DCAT_NS}downloadURL`,
};
const XSD_INTEGER = `${XSD_NS}integer`;

// No hardcoded default base URI. Callers MUST pass baseUri explicitly.

export type ImageFormat = 'svg' | 'png' | 'webp' | 'jpg' | 'gif';

export interface ImageVariantInput {
  registerId: string;
  figureId: string;
  lang?: string;
  format: ImageFormat;
  byteSize?: number;
  downloadUrl: string;
}

const MIME_BY_FORMAT: Readonly<Record<ImageFormat, string>> = Object.freeze({
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  gif: 'image/gif',
}) as Readonly<Record<ImageFormat, string>>;

export function imageVariantIri(input: ImageVariantInput, baseUri: string): string {
  if (!baseUri) throw new Error('imageVariantIri requires baseUri — the deployment canonical URI root.');
  const langSuffix = input.lang ? `${input.lang}.` : '';
  return `${baseUri}/${input.registerId}/image/${input.figureId}/${langSuffix}${input.format}`;
}

export function* imageVariantToQuads(input: ImageVariantInput, baseUri: string) {
  if (!baseUri) throw new Error('imageVariantToQuads requires baseUri — the deployment canonical URI root.');
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
