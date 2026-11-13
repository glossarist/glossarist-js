// document-writer JSON-LD paths.
//
// writeJsonldDirect replaces jsonld.js's fromRDF/compact for flat
// prefix-map contexts — jsonld.js is super-linear on large graphs
// (the 1633-concept isotc211 aggregate took 35 minutes there vs ~3.5s
// direct). These tests pin the direct emitter to the jsonld.js
// reference byte-for-byte across the compaction shapes our emitters
// produce, and verify non-flat contexts still route to the reference
// engine.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jsonldPackage from 'jsonld';
import {
  writeJsonld,
  writeJsonldDirect,
  writeJsonldReference,
} from '../../src/rdf/document-writer.js';
import { PREFIXES } from '../../src/rdf/prefixes.js';
import { namedNode, blankNode, literal, quad } from '../../src/rdf/terms.js';

const jsonld = jsonldPackage as unknown as {
  canonize: (doc: unknown, opts?: Record<string, unknown>) => Promise<string>;
};

const GLOSS = 'https://www.glossarist.org/ontologies/';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const XSD_DATE = 'http://www.w3.org/2001/XMLSchema#date';

function canonize(doc: string): Promise<string> {
  return jsonld.canonize(JSON.parse(doc), { format: 'application/n-quads' });
}

async function assertParity(quads: ReturnType<typeof quad>[]): Promise<void> {
  const direct = writeJsonldDirect(quads);
  const reference = await writeJsonldReference(quads);
  assert.equal(direct, reference, 'direct output must be byte-identical to jsonld.js');
}

describe('writeJsonldDirect vs jsonld.js reference', () => {
  it('byte-parity: plain and language-tagged literals', async () => {
    await assertParity([
      quad(namedNode(`${GLOSS}Concept`), namedNode(`${GLOSS}identifier`), literal('699')),
      quad(namedNode(`${GLOSS}Concept`), namedNode(`${SKOS}prefLabel`), literal('geographic information', 'eng')),
    ]);
  });

  it('byte-parity: typed literals (xsd:date)', async () => {
    await assertParity([
      quad(namedNode('https://example.org/x'), namedNode('http://purl.org/dc/terms/issued'), literal('2024-01-01', namedNode(XSD_DATE))),
    ]);
  });

  it('byte-parity: rdf:type single and multiple', async () => {
    await assertParity([
      quad(namedNode('https://example.org/x'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
      quad(namedNode('https://example.org/x'), namedNode(RDF_TYPE), namedNode(`${SKOS}Concept`)),
      quad(namedNode('https://example.org/x'), namedNode(`${GLOSS}identifier`), literal('x')),
    ]);
    await assertParity([
      quad(namedNode('https://example.org/x'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
    ]);
  });

  it('byte-parity: dcterms predicate sorting before rdf:type', async () => {
    // dcterms IRI sorts before rdf:type in quad order, but the reference
    // still emits @id then @type before any predicate.
    await assertParity([
      quad(namedNode('https://example.org/x'), namedNode('http://purl.org/dc/terms/issued'), literal('2024-01-01', namedNode(XSD_DATE))),
      quad(namedNode('https://example.org/x'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
    ]);
  });

  it('byte-parity: multi-value predicates and duplicate-value dedup', async () => {
    const s = namedNode('https://example.org/x');
    await assertParity([
      quad(s, namedNode(`${SKOS}altLabel`), literal('SONAR', 'eng')),
      quad(s, namedNode(`${SKOS}altLabel`), literal('sonar', 'eng')),
    ]);
    // Source data can repeat an identical value — jsonld.js drops it.
    await assertParity([
      quad(s, namedNode(`${SKOS}altLabel`), literal('SONAR', 'eng')),
      quad(s, namedNode(`${SKOS}altLabel`), literal('SONAR', 'eng')),
    ]);
  });

  it('byte-parity: blank-node subjects and objects', async () => {
    const b = blankNode('b0abc123def456');
    await assertParity([
      quad(b, namedNode(RDF_TYPE), namedNode(`${GLOSS}Expression`)),
      quad(b, namedNode('http://www.w3.org/2008/05/skos-xl#literalForm'), literal('atomic data unit', 'eng')),
      quad(namedNode('https://example.org/x'), namedNode(`${GLOSS}hasDesignation`), b),
    ]);
  });

  it('byte-parity: dangling IRI objects compact as {"@id"} node refs', async () => {
    await assertParity([
      quad(namedNode('https://example.org/x'), namedNode(`${GLOSS}normativeStatus`), namedNode(`${GLOSS}norm/preferred`)),
    ]);
  });

  it('byte-parity: single-node graph emits node at document root', async () => {
    await assertParity([
      quad(namedNode(`${GLOSS}Concept`), namedNode(`${GLOSS}identifier`), literal('699')),
    ]);
  });

  it('byte-parity: empty quads emit only @context', async () => {
    await assertParity([]);
  });
});

describe('writeJsonld routing', () => {
  const quads = [
    quad(namedNode('https://example.org/x'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
    quad(namedNode('https://example.org/x'), namedNode(`${GLOSS}identifier`), literal('x')),
    quad(blankNode('b0a'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Expression`)),
  ];

  it('flat prefix map routes to the direct emitter (sync-equivalent output)', async () => {
    const out = await writeJsonld(quads);
    assert.equal(out, writeJsonldDirect(quads));
    assert.equal(await writeJsonld(quads, { context: { ...PREFIXES } }), out);
  });

  it('non-flat context routes to the reference engine', async () => {
    const vocab = { '@vocab': GLOSS };
    const out = await writeJsonld(quads, { context: vocab });
    assert.equal(out, await writeJsonldReference(quads, { context: vocab }));
    assert.notEqual(out, writeJsonldDirect(quads));
  });
});

describe('writeJsonldDirect output shape', () => {
  it('emits @context and @graph for multi-node graphs', () => {
    const parsed = JSON.parse(writeJsonldDirect([
      quad(namedNode('https://example.org/a'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
      quad(namedNode('https://example.org/b'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
    ]));
    assert.deepEqual(Object.keys(parsed), ['@context', '@graph']);
    assert.equal(parsed['@graph'].length, 2);
  });

  it('keys node properties in reference order (@id, @type, predicates)', () => {
    const parsed = JSON.parse(writeJsonldDirect([
      quad(namedNode('https://example.org/a'), namedNode('http://purl.org/dc/terms/issued'), literal('2024-01-01', namedNode(XSD_DATE))),
      quad(namedNode('https://example.org/a'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
      quad(namedNode('https://example.org/b'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Concept`)),
    ]));
    assert.deepEqual(Object.keys(parsed['@graph'][0]), ['@id', '@type', 'dcterms:issued']);
  });

  it('is canonize-equal to the reference on blank-node documents', async () => {
    const quads = [
      quad(blankNode('b0a'), namedNode(RDF_TYPE), namedNode(`${GLOSS}Expression`)),
      quad(blankNode('b0a'), namedNode('http://www.w3.org/2008/05/skos-xl#literalForm'), literal('x', 'eng')),
      quad(namedNode('https://example.org/x'), namedNode(`${GLOSS}hasDesignation`), blankNode('b0a')),
    ];
    assert.equal(await canonize(writeJsonldDirect(quads)), await canonize(await writeJsonldReference(quads)));
  });
});
