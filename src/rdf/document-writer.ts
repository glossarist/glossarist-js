// Quads → canonical Turtle / N-Triples / JSON-LD document.
//
// Turtle is produced via N3.Writer. JSON-LD via the `jsonld` package
// (fromRDF + compact against the canonical context). N-Triples is provided
// as a stable fallback that doesn't depend on prefix maps.
import { Writer as N3Writer } from 'n3';
// @ts-expect-error jsonld has no type declarations
import jsonld from 'jsonld';
import { PREFIXES } from './prefixes.js';
import type { Quad } from '@rdfjs/types';

export function collectQuads(quadsIterable: Iterable<Quad>): Quad[] {
  const out: Quad[] = [];
  for (const q of quadsIterable) out.push(q);
  return out;
}

export function writeTurtle(quads: Iterable<Quad>, { prefixes = PREFIXES }: { prefixes?: Record<string, string> } = {}): Promise<string> {
  const sorted = sortQuads(quads);
  return new Promise((resolve, reject) => {
    const writer = new N3Writer({ prefixes, format: 'Turtle' });
    for (const q of sorted) writer.addQuad(q as any);
    writer.end((err: Error | null, result: string) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export function writeNTriples(quads: Iterable<Quad>): Promise<string> {
  const sorted = sortQuads(quads);
  return new Promise((resolve, reject) => {
    const writer = new N3Writer({ format: 'N-Triples' });
    for (const q of sorted) writer.addQuad(q as any);
    writer.end((err: Error | null, result: string) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export async function writeJsonld(quads: Iterable<Quad>, { context = defaultJsonldContext() }: { context?: Record<string, string> } = {}): Promise<string> {
  const sorted = sortQuads(quads);
  const nquads = await writeNTriples(sorted);
  const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
  const compacted = await jsonld.compact(expanded, context);
  return JSON.stringify(compacted, null, 2);
}

function defaultJsonldContext(): Record<string, string> {
  const ctx: Record<string, string> = {};
  for (const [prefix, uri] of Object.entries(PREFIXES)) {
    ctx[prefix] = uri;
  }
  return ctx;
}

export function sortQuads(quads: Iterable<Quad>): Quad[] {
  return [...quads].sort(compareQuad);
}

function compareQuad(a: Quad, b: Quad): number {
  let cmp = cmpTerm(a.subject, b.subject);
  if (cmp !== 0) return cmp;
  cmp = cmpTerm(a.predicate, b.predicate);
  if (cmp !== 0) return cmp;
  cmp = cmpTerm(a.object, b.object);
  if (cmp !== 0) return cmp;
  return cmpTerm(a.graph, b.graph);
}

function cmpTerm(a: Quad['subject'] | Quad['object'] | Quad['graph'], b: Quad['subject'] | Quad['object'] | Quad['graph']): number {
  if (a.termType !== b.termType) return a.termType.localeCompare(b.termType);
  return String(a.value).localeCompare(String(b.value));
}
