// Sync Turtle writer — produces Turtle from RDF/JS Quads without
// n3's callback API. Designed for UI use cases (Vue computed, React
// render) that need synchronous output.

import type { Quad, Term } from '@rdfjs/types';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

interface WriteTurtleOptions { prefixes?: Record<string, string> }
interface Triple { predicate: Term; object: Term }
interface SubjectGroup { subject: Term; triples: Triple[] }
interface PredObj { predStr: string; objStrs: string[] }

export function writeTurtleSync(quads: Iterable<Quad>, options: WriteTurtleOptions = {}): string {
  const prefixes = options.prefixes ?? {};
  const sorted = [...quads].sort(compareQuadSync);
  const grouped = groupBySubject(sorted);

  const lines: string[] = [];

  for (const [prefix, iri] of Object.entries(prefixes).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`@prefix ${prefix}: <${iri}> .`);
  }

  for (const { subject, triples } of grouped) {
    lines.push('');
    lines.push(...writeResource(subject, triples, prefixes));
  }

  return lines.join('\n') + '\n';
}

function writeResource(subject: Term, triples: Triple[], prefixes: Record<string, string>): string[] {
  const subjectStr = formatTermSync(subject, prefixes);
  const types = triples.filter(t => t.predicate.value === RDF_TYPE);
  const others = triples.filter(t => t.predicate.value !== RDF_TYPE);

  if (types.length === 0 && others.length === 0) {
    return [`${subjectStr} .`];
  }

  const lines: string[] = [];
  const allPredObjs: PredObj[] = [];

  if (types.length > 0) {
    const typeStrs = types.map(t => formatTermSync(t.object, prefixes));
    allPredObjs.push({ predStr: 'a', objStrs: typeStrs });
  }

  const byPredicate = new Map<string, string[]>();
  for (const t of others) {
    const predStr = formatTermSync(t.predicate, prefixes);
    if (!byPredicate.has(predStr)) byPredicate.set(predStr, []);
    byPredicate.get(predStr)!.push(formatTermSync(t.object, prefixes));
  }
  for (const [predStr, objStrs] of byPredicate) {
    allPredObjs.push({ predStr, objStrs });
  }

  lines.push(`${subjectStr} ${allPredObjs[0]!.predStr} ${allPredObjs[0]!.objStrs.join(', ')} ;`);
  for (let i = 1; i < allPredObjs.length; i++) {
    lines.push(`  ${allPredObjs[i]!.predStr} ${allPredObjs[i]!.objStrs.join(', ')} ;`);
  }
  lines[lines.length - 1] = lines[lines.length - 1]!.replace(/ ;$/, ' .');
  return lines;
}

function formatTermSync(term: Term, prefixes: Record<string, string>): string {
  switch (term.termType) {
    case 'NamedNode':
      return compactIriSync(term.value, prefixes);
    case 'BlankNode':
      return `_:${term.value}`;
    case 'Literal':
      return formatLiteralSync(term);
    case 'DefaultGraph':
      return '';
    default:
      return String((term as { value?: unknown }).value ?? term);
  }
}

function formatLiteralSync(lit: Quad['object'] & { termType: 'Literal' }): string {
  const escaped = escapeLiteralSync(lit.value);
  if (lit.language) return `"${escaped}"@${lit.language}`;
  const dt = lit.datatype?.value;
  if (dt && dt !== 'http://www.w3.org/2001/XMLSchema#string') {
    return `"${escaped}"^^<${dt}>`;
  }
  return `"${escaped}"`;
}

function escapeLiteralSync(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function compactIriSync(iri: string, prefixes: Record<string, string>): string {
  if (!prefixes || Object.keys(prefixes).length === 0) {
    return `<${iri}>`;
  }
  let bestPrefix: string | null = null;
  let bestLen = 0;
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (iri.startsWith(base) && base.length > bestLen) {
      const local = iri.slice(base.length);
      if (!local.startsWith('//')) {
        bestPrefix = prefix;
        bestLen = base.length;
      }
    }
  }
  if (!bestPrefix) return `<${iri}>`;
  const local = iri.slice(bestLen);
  const escaped = local.replace(/([/])/g, '\\$1');
  return `${bestPrefix}:${escaped}`;
}

function compareQuadSync(a: Quad, b: Quad): number {
  let cmp = cmpTermSync(a.subject, b.subject);
  if (cmp !== 0) return cmp;
  cmp = cmpTermSync(a.predicate, b.predicate);
  if (cmp !== 0) return cmp;
  return cmpTermSync(a.object, b.object);
}

function cmpTermSync(a: Term, b: Term): number {
  if (a.termType !== b.termType) return a.termType.localeCompare(b.termType);
  return String(a.value).localeCompare(String(b.value));
}

function groupBySubject(quads: Quad[]): SubjectGroup[] {
  const map = new Map<string, SubjectGroup>();
  for (const q of quads) {
    const key = termKey(q.subject);
    if (!map.has(key)) {
      map.set(key, { subject: q.subject, triples: [] });
    }
    map.get(key)!.triples.push({ predicate: q.predicate, object: q.object });
  }
  return [...map.values()];
}

function termKey(term: Term): string {
  return `${term.termType}:${term.value}`;
}
