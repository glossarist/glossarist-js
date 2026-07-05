// Sync Turtle writer — produces Turtle from RDF/JS Quads without
// n3's callback API. Designed for UI use cases (Vue computed, React
// render) that need synchronous output.
//
// Format matches n3's Turtle output closely but may differ in:
// - Indent width (2 spaces vs n3's 4)
// - Blank node label format (_:bXXXX)
// - Subject ordering (sorted by value for determinism)
//
// For byte-equivalent n3 output, use the async writeTurtle() instead.

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

/**
 * Serializes RDF/JS Quads to a Turtle string synchronously.
 *
 * @param {Iterable<Quad>} quads
 * @param {{ prefixes?: Record<string, string> }} [options]
 * @returns {string}
 */
export function writeTurtleSync(quads, options = {}) {
  const prefixes = options.prefixes ?? {};
  const sorted = [...quads].sort(compareQuadSync);
  const grouped = groupBySubject(sorted);

  const lines = [];

  // Prefix declarations — sorted by prefix name for deterministic output.
  for (const [prefix, iri] of Object.entries(prefixes).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`@prefix ${prefix}: <${iri}> .`);
  }

  for (const { subject, triples } of grouped) {
    lines.push('');
    lines.push(...writeResource(subject, triples, prefixes));
  }

  return lines.join('\n') + '\n';
}

function writeResource(subject, triples, prefixes) {
  const subjectStr = formatTermSync(subject, prefixes);
  const types = triples.filter(t => t.predicate.value === RDF_TYPE);
  const others = triples.filter(t => t.predicate.value !== RDF_TYPE);

  if (types.length === 0 && others.length === 0) {
    return [`${subjectStr} .`];
  }

  const lines = [];
  const allPredObjs = [];

  if (types.length > 0) {
    const typeStrs = types.map(t => formatTermSync(t.object, prefixes));
    allPredObjs.push({ predStr: 'a', objStrs: typeStrs });
  }

  // Group by predicate for multi-value compaction (predicate only appears once
  // with comma-separated objects).
  const byPredicate = new Map();
  for (const t of others) {
    const predStr = formatTermSync(t.predicate, prefixes);
    if (!byPredicate.has(predStr)) byPredicate.set(predStr, []);
    byPredicate.get(predStr).push(formatTermSync(t.object, prefixes));
  }
  for (const [predStr, objStrs] of byPredicate) {
    allPredObjs.push({ predStr, objStrs });
  }

  lines.push(`${subjectStr} ${allPredObjs[0].predStr} ${allPredObjs[0].objStrs.join(', ')} ;`);
  for (let i = 1; i < allPredObjs.length; i++) {
    lines.push(`  ${allPredObjs[i].predStr} ${allPredObjs[i].objStrs.join(', ')} ;`);
  }
  // Replace trailing ; with .
  lines[lines.length - 1] = lines[lines.length - 1].replace(/ ;$/, ' .');
  return lines;
}

function formatTermSync(term, prefixes) {
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
      return String(term.value ?? term);
  }
}

function formatLiteralSync(lit) {
  const escaped = escapeLiteralSync(lit.value);
  if (lit.language) return `"${escaped}"@${lit.language}`;
  const dt = lit.datatype?.value;
  if (dt && dt !== 'http://www.w3.org/2001/XMLSchema#string') {
    return `"${escaped}"^^<${dt}>`;
  }
  return `"${escaped}"`;
}

function escapeLiteralSync(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function compactIriSync(iri, prefixes) {
  // If no prefixes, always use <>
  if (!prefixes || Object.keys(prefixes).length === 0) {
    return `<${iri}>`;
  }
  // Try longest prefix match
  let bestPrefix = null;
  let bestLen = 0;
  for (const [prefix, base] of Object.entries(prefixes)) {
    if (iri.startsWith(base) && base.length > bestLen) {
      // Reject if local part contains characters that can't appear in a
      // Turtle pname-local (e.g. leading digit is fine per Turtle 1.1,
      // but // is not).
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

function compareQuadSync(a, b) {
  let cmp = cmpTermSync(a.subject, b.subject);
  if (cmp !== 0) return cmp;
  cmp = cmpTermSync(a.predicate, b.predicate);
  if (cmp !== 0) return cmp;
  return cmpTermSync(a.object, b.object);
}

function cmpTermSync(a, b) {
  if (a.termType !== b.termType) return a.termType.localeCompare(b.termType);
  return String(a.value).localeCompare(String(b.value));
}

function groupBySubject(quads) {
  const map = new Map();
  for (const q of quads) {
    const key = termKey(q.subject);
    if (!map.has(key)) {
      map.set(key, { subject: q.subject, triples: [] });
    }
    map.get(key).triples.push({ predicate: q.predicate, object: q.object });
  }
  return [...map.values()];
}

function termKey(term) {
  return `${term.termType}:${term.value}`;
}
