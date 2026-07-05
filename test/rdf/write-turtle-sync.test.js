// Tests for the sync Turtle writer.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeTurtleSync } from '../../src/rdf/write-turtle-sync.js';
import { namedNode, blankNode, literal, quad } from '../../src/rdf/terms.js';

const PREFIXES = {
  gloss: 'https://www.glossarist.org/ontologies/',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
};

describe('writeTurtleSync', () => {
  it('produces prefix declarations', () => {
    const ttl = writeTurtleSync([], { prefixes: PREFIXES });
    assert.match(ttl, /@prefix gloss: <https:\/\/www\.glossarist\.org\/ontologies\/> \./);
    assert.match(ttl, /@prefix skos: <http:\/\/www\.w3\.org\/2004\/02\/skos\/core#> \./);
  });

  it('serializes a simple triple with CURIE compaction', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('https://www.glossarist.org/ontologies/Concept'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.match(ttl, /<https:\/\/example\.org\/c1> a gloss:Concept \./);
  });

  it('uses a shorthand for rdf:type', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('https://www.glossarist.org/ontologies/Concept'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.ok(ttl.includes(' a gloss:Concept'));
    assert.ok(!ttl.includes('rdf:type'));
  });

  it('serializes plain literals with quotes', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('https://www.glossarist.org/ontologies/identifier'),
        literal('1.1'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.match(ttl, /"1\.1"/);
  });

  it('serializes language-tagged literals', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
        literal('hello', 'eng'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.match(ttl, /"hello"@eng/);
  });

  it('serializes datatyped literals', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('https://www.glossarist.org/ontologies/hasDate'),
        literal('2024-01-01', namedNode('http://www.w3.org/2001/XMLSchema#date')),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.match(ttl, /"2024-01-01"\^\^<http:\/\/www\.w3\.org\/2001\/XMLSchema#date>/);
  });

  it('escapes special characters in literals', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('https://www.glossarist.org/ontologies/identifier'),
        literal('has "quotes" and \\backslash'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.match(ttl, /has \\"quotes\\" and \\\\backslash/);
  });

  it('serializes blank node subjects and objects', () => {
    const bnode = blankNode('b12345');
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('https://www.glossarist.org/ontologies/hasDefinition'),
        bnode,
      ),
      quad(
        bnode,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('https://www.glossarist.org/ontologies/DetailedDefinition'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.match(ttl, /_:b12345/);
    assert.match(ttl, /hasDefinition _:b12345/);
  });

  it('compacts IRIs using the longest matching prefix', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('https://www.glossarist.org/ontologies/Concept'),
      ),
    ];
    const ttl = writeTurtleSync(quads, {
      prefixes: {
        gloss: 'https://www.glossarist.org/ontologies/',
        glossSub: 'https://www.glossarist.org/ontologies/Sub',
      },
    });
    // Should match gloss: not glossSub: (longest match that fits)
    assert.match(ttl, /gloss:Concept/);
  });

  it('uses angle brackets for uncompactable IRIs', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('https://example.org/unknown-predicate'),
        literal('x'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    assert.match(ttl, /<https:\/\/example\.org\/unknown-predicate>/);
  });

  it('groups triples by subject', () => {
    const quads = [
      quad(
        namedNode('https://example.org/c1'),
        namedNode('https://www.glossarist.org/ontologies/identifier'),
        literal('1'),
      ),
      quad(
        namedNode('https://example.org/c1'),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('https://www.glossarist.org/ontologies/Concept'),
      ),
    ];
    const ttl = writeTurtleSync(quads, { prefixes: PREFIXES });
    // Both triples should be under one subject block
    const subjectBlocks = ttl.split('\n\n').filter(b => b.includes('example.org/c1'));
    assert.equal(subjectBlocks.length, 1);
  });

  it('handles empty quad list (only prefixes)', () => {
    const ttl = writeTurtleSync([], { prefixes: PREFIXES });
    assert.ok(ttl.includes('@prefix'));
    assert.ok(!ttl.includes('example.org'));
  });

  it('is synchronous (returns string, not Promise)', () => {
    const result = writeTurtleSync([], { prefixes: PREFIXES });
    assert.equal(typeof result, 'string');
  });
});
