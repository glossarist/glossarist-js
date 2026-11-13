// Quads → canonical Turtle / N-Triples / JSON-LD document.
//
// Turtle is produced via N3.Writer. JSON-LD via a direct quads→compact
// emitter for flat prefix-map contexts (the canonical glossarist
// context — jsonld.js's fromRDF/compact is super-linear on large
// graphs: the 1633-concept aggregate took 35 minutes there vs ~1s
// direct). Non-flat contexts (@vocab, term maps, …) fall back to
// jsonld.js. N-Triples is provided as a stable fallback that doesn't
// depend on prefix maps.
import { Writer as N3Writer } from 'n3';
import jsonld from 'jsonld';
import { PREFIXES } from './prefixes.js';
import { compactIri, RDF_TYPE } from './curie.js';
import type { Quad } from '@rdfjs/types';

const XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string';

export function collectQuads(quadsIterable: Iterable<Quad>): Quad[] {
  const out: Quad[] = [];
  for (const q of quadsIterable) out.push(q);
  return out;
}

export function writeTurtle(quads: Iterable<Quad>, { prefixes = PREFIXES }: { prefixes?: Record<string, string> } = {}): Promise<string> {
  const sorted = sortQuads(quads);
  return new Promise((resolve, reject) => {
    const writer = new N3Writer({ prefixes, format: 'Turtle' });
    for (const q of sorted) writer.addQuad(q as Parameters<typeof writer.addQuad>[0]);
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
    for (const q of sorted) writer.addQuad(q as Parameters<typeof writer.addQuad>[0]);
    writer.end((err: Error | null, result: string) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

export async function writeJsonld(quads: Iterable<Quad>, { context = defaultJsonldContext() }: { context?: Record<string, unknown> } = {}): Promise<string> {
  if (isFlatPrefixMap(context)) return writeJsonldDirect(quads, context);
  return writeJsonldReference(quads, { context });
}

type JsonldValue = string | Record<string, unknown> | JsonldValue[];
type JsonldNode = Record<string, JsonldValue>;

/**
 * Fast JSON-LD compaction for flat prefix-map contexts.
 *
 * Mirrors jsonld.js reference output exactly (asserted byte-for-byte in
 * document-writer tests): nodes in sorted-quad subject order, `@id`
 * then `@type` (string when single) then predicates in encounter
 * order, IRI objects as `{"@id"}`, literals keyed `@language`/`@type`
 * before `@value`, `@graph` wrapper only for multi-node graphs.
 */
export function writeJsonldDirect(quads: Iterable<Quad>, prefixes: Record<string, string> = defaultJsonldContext()): string {
  const nodes = new Map<string, JsonldNode>();
  const nodeOrder: string[] = [];
  const typesByNode = new Map<string, string[]>();

  for (const q of sortQuads(quads)) {
    const subjectId = termToNodeId(q.subject, prefixes);
    let node = nodes.get(subjectId);
    if (!node) {
      node = {};
      nodes.set(subjectId, node);
      nodeOrder.push(subjectId);
    }
    if (q.predicate.value === RDF_TYPE) {
      const types = typesByNode.get(subjectId);
      const type = compactIri(q.object.value, prefixes);
      if (types) {
        if (!types.includes(type)) types.push(type);
      } else {
        typesByNode.set(subjectId, [type]);
      }
      continue;
    }
    const predicate = compactIri(q.predicate.value, prefixes);
    const value = compactTerm(q.object, prefixes);
    const existing = node[predicate];
    if (existing === undefined) {
      node[predicate] = value;
    } else if (Array.isArray(existing)) {
      // JSON-LD values are sets — jsonld.js drops duplicate identical
      // values, so mirror that (source data can repeat e.g. altLabel).
      if (!existing.some((e) => stableKey(e) === stableKey(value))) existing.push(value);
    } else if (stableKey(existing) !== stableKey(value)) {
      node[predicate] = [existing, value];
    }
  }

  const graph = nodeOrder.map((id) => {
    const node: JsonldNode = { '@id': id };
    const types = typesByNode.get(id);
    if (types) {
      const single = types.length === 1 ? types[0] : undefined;
      node['@type'] = single ?? types;
    }
    return { ...node, ...nodes.get(id) };
  });

  const doc: Record<string, JsonldValue> =
    graph.length === 1
      ? { '@context': prefixes, ...graph[0] }
      : graph.length === 0
        ? { '@context': prefixes }
        : { '@context': prefixes, '@graph': graph };
  return JSON.stringify(doc, null, 2);
}

/**
 * jsonld.js compaction — the reference engine. Slow on large graphs;
 * used for non-flat contexts and as the correctness oracle in tests.
 */
export async function writeJsonldReference(quads: Iterable<Quad>, { context = defaultJsonldContext() }: { context?: Record<string, unknown> } = {}): Promise<string> {
  const sorted = sortQuads(quads);
  const nquads = await writeNTriples(sorted);
  const expanded = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
  const compacted = await jsonld.compact(expanded, context as Parameters<typeof jsonld.compact>[1]);
  return JSON.stringify(compacted, null, 2);
}

function isFlatPrefixMap(context: Record<string, unknown> | undefined): context is Record<string, string> {
  if (context == null || typeof context !== 'object' || Array.isArray(context)) return false;
  const entries = Object.entries(context);
  return entries.every(([k, v]) => !k.startsWith('@') && typeof v === 'string');
}

function termToNodeId(term: Quad['subject'], prefixes: Record<string, string>): string {
  if (term.termType === 'BlankNode') return `_:${term.value}`;
  return compactIri(term.value, prefixes);
}

function stableKey(value: JsonldValue): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function compactTerm(term: Quad['object'], prefixes: Record<string, string>): JsonldValue {
  if (term.termType === 'BlankNode') return { '@id': `_:${term.value}` };
  if (term.termType === 'Literal') {
    if (term.language) return { '@language': term.language, '@value': term.value };
    const datatype = term.datatype?.value;
    if (datatype && datatype !== XSD_STRING) {
      return { '@type': compactIri(datatype, prefixes), '@value': term.value };
    }
    return term.value;
  }
  return { '@id': compactIri(term.value, prefixes) };
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
