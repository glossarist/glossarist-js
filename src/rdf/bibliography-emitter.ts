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
import { PREFIXES } from './prefixes.js';
import { RDF_TYPE } from './curie.js';

// Namespace IRIs from canonical PREFIXES. foaf is absent from the
// JSON-LD context (therefore not in PREFIXES) — declare locally.
const DCTERMS_NS = PREFIXES.dcterms;
const FOAF_NS    = PREFIXES.foaf ?? 'http://xmlns.com/foaf/0.1/';
const GLOSS_NS   = PREFIXES.gloss;

const DCTERMS = {
  BibliographicResource: `${DCTERMS_NS}BibliographicResource`,
  identifier: `${DCTERMS_NS}identifier`,
  bibliographicCitation: `${DCTERMS_NS}bibliographicCitation`,
  title: `${DCTERMS_NS}title`,
  type: `${DCTERMS_NS}type`,
  isPartOf: `${DCTERMS_NS}isPartOf`,
} as const;
const FOAF = {
  page: `${FOAF_NS}page`,
} as const;

// No hardcoded default base URI. Callers MUST pass baseUri explicitly
// so instance IRIs reflect the consumer's domain, not the library's.

export interface BibliographyEntry {
  id: string;
  reference: string;
  title?: string;
  link?: string;
  type?: string;
}
export interface BibliographyInput {
  registerId: string;
  entries?: readonly BibliographyEntry[];
  baseUri?: string;
}

export function bibliographyEntryIri(registerId: string, entryId: string, baseUri?: string): string {
  if (!baseUri) throw new Error('bibliographyEntryIri requires baseUri — the deployment canonical URI root. glossarist-js does NOT default to glossarist.org because instance data identity must reflect the consumer domain.');
  return `${baseUri}/${registerId}/bib/${entryId}`;
}

export function* bibliographyToQuads(input: BibliographyInput) {
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

interface V3BibliographyEntry {
  id?: string;
  reference?: string;
  title?: string;
  link?: string;
  type?: string;
}

export function normalizeBibliographyData(raw: unknown): BibliographyEntry[] {
  if (!raw || typeof raw !== 'object') return [];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.bibliography)) {
    return (r.bibliography as V3BibliographyEntry[]).map((e) => entryFromV3(e, null));
  }
  const entries: BibliographyEntry[] = [];
  for (const [id, value] of Object.entries(r)) {
    if (!value || typeof value !== 'object') continue;
    entries.push(entryFromV3(value as V3BibliographyEntry, id));
  }
  return entries;
}

function entryFromV3(e: V3BibliographyEntry, fallbackId: string | null): BibliographyEntry {
  return {
    id: e.id ?? fallbackId ?? '',
    reference: e.reference ?? '',
    title: e.title,
    link: e.link,
    type: e.type,
  };
}
