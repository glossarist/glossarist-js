// Quads → canonical Turtle / N-Triples / JSON-LD document.
//
// Turtle is produced via N3.Writer. JSON-LD via the `jsonld` package
// (fromRDF + compact against the canonical context). N-Triples is provided
// as a stable fallback that doesn't depend on prefix maps.
import { Writer as N3Writer } from 'n3';
import jsonld from 'jsonld';
import { PREFIXES } from './predicates.js';

// Collects all quads yielded by an emitter into an array. Useful for tests
// and for callers that want to inspect the quad stream directly.
export function collectQuads(quadsIterable) {
  const out = [];
  for (const q of quadsIterable) out.push(q);
  return out;
}

// Returns a Turtle serialization of `quads` using the canonical prefix map
// generated from the vendored concept-model JSON-LD context. Quads are
// sorted deterministically so the same input always produces byte-equivalent
// output across runs.
export function writeTurtle(quads, { prefixes = PREFIXES } = {}) {
  const sorted = sortQuads(quads);
  return new Promise((resolve, reject) => {
    const writer = new N3Writer({ prefixes, format: 'Turtle' });
    for (const q of sorted) writer.addQuad(q);
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Returns an N-Triples serialization of `quads` — no prefixes, no bnode
// shortening. Useful when consumers need a totally stable wire format.
export function writeNTriples(quads) {
  const sorted = sortQuads(quads);
  return new Promise((resolve, reject) => {
    const writer = new N3Writer({ format: 'N-Triples' });
    for (const q of sorted) writer.addQuad(q);
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Returns a compacted JSON-LD serialization of `quads`. The context defaults
// to the canonical glossarist JSON-LD context derived from the vendored
// PREFIXES. Quads are sorted first for deterministic output.
export async function writeJsonld(quads, { context = defaultJsonldContext() } = {}) {
  const sorted = sortQuads(quads);
  const nquads = await writeNTriples(sorted);
  const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
  const compacted = await jsonld.compact(expanded, context);
  return JSON.stringify(compacted, null, 2);
}

function defaultJsonldContext() {
  const ctx = {};
  for (const [prefix, uri] of Object.entries(PREFIXES)) {
    ctx[prefix] = uri;
  }
  return ctx;
}

// Sort by (subject.value, predicate.value, object.termType, object.value,
// graph.value). Bnodes sort by their generated ID which is deterministic
// because we use content-addressed IDs.
export function sortQuads(quads) {
  return [...quads].sort(compareQuad);
}

function compareQuad(a, b) {
  let cmp = cmpTerm(a.subject, b.subject);
  if (cmp !== 0) return cmp;
  cmp = cmpTerm(a.predicate, b.predicate);
  if (cmp !== 0) return cmp;
  return cmpTerm(a.object, b.object);
}

function cmpTerm(a, b) {
  if (a.termType !== b.termType) return a.termType.localeCompare(b.termType);
  return String(a.value).localeCompare(String(b.value));
}
