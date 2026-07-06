// CURIE helpers — resolve/compact IRIs against the canonical PREFIXES.
//
// Single source of truth for CURIE ↔ IRI conversion. Previously
// `resolveIri` was private to vocabulary-emitter and reimplemented
// (incorrectly) in other emitters. Callers now import from here.

import { PREFIXES } from './prefixes.js';

const ABSOLUTE_SCHEMES = new Set(['http', 'https', 'urn', 'file', 'mailto', 'ftp']);

export function isAbsoluteIri(s) {
  if (typeof s !== 'string' || s.length === 0) return false;
  if (s.startsWith('urn:')) return true;
  const colon = s.indexOf(':');
  if (colon < 1) return false;
  return ABSOLUTE_SCHEMES.has(s.slice(0, colon));
}

export function resolveIri(iri, prefixes = PREFIXES) {
  if (isAbsoluteIri(iri)) return iri;
  const colon = iri.indexOf(':');
  if (colon < 1) return iri;
  const prefix = iri.slice(0, colon);
  const local = iri.slice(colon + 1);
  const base = prefixes[prefix];
  return base ? `${base}${local}` : iri;
}

export function compactIri(iri, prefixes = PREFIXES) {
  let best = null;
  let bestLen = 0;
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (iri.startsWith(base) && base.length > bestLen) {
      best = `${prefix}:${iri.slice(base.length)}`;
      bestLen = base.length;
    }
  }
  return best ?? iri;
}

// Convenience constants — used by every emitter. Centralized here so
// the IRI string appears in exactly one place.
export const RDF_TYPE = `${PREFIXES.rdf}type`;
export const RDF_VALUE = `${PREFIXES.rdf}value`;
export const RDFS_LABEL = `${PREFIXES.rdfs}label`;
