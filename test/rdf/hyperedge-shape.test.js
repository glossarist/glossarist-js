// Cross-repo shape contract for the v1 PartitiveHyperedge RDF emitter.
//
// NOTE: v1 is deprecated; concept-model v3.2.0 ships v2 PartitiveRelation.
// This file tests the v1 emitter (hyperedgeToQuads) DIRECTLY, bypassing
// Concept's auto-migration to v2. The v2 contract is in
// `partitive-relation-shape.test.js`.
//
// Per the global rule "NEVER DELETE source files," this file is kept as
// a regression guard for any consumer still using the v1 PartitiveHyperedge
// model + v1 gloss-hyperedge emitter directly.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import { hyperedgeToQuads, hyperedgeSubjectUri } from '../../src/rdf/index.js';

const PARENT_URI = 'https://example.org/vocab/concept/112-02-09';
const BASE = 'https://example.org';
const REGISTER = 'vocab';

function makeHyperedge(overrides = {}) {
  return new PartitiveHyperedge({
    comprehensive: overrides.comprehensive ?? { source: 'VIM', id: '112-02-09' },
    parts: overrides.parts ?? [
      { source: 'VIM', id: '112-02-10' },
      { source: 'VIM', id: '112-03-26' },
    ],
    ...overrides,
  });
}

function quadsFor(hyperedge) {
  return [...hyperedgeToQuads(hyperedge, { parentUri: PARENT_URI, index: 0 })];
}

describe('v1 PartitiveHyperedge RDF shape — emitter-direct contract', () => {
  it('subject URI follows hyperedge/<carrier>/<comprehensive> scheme', () => {
    const he = makeHyperedge();
    assert.equal(
      hyperedgeSubjectUri(PARENT_URI, he, 0),
      `${BASE}/${REGISTER}/hyperedge/112-02-09/112-02-09`,
    );
  });

  it('emits rdf:type gloss:PartitiveHyperedge', () => {
    const quads = quadsFor(makeHyperedge());
    assert.ok(quads.some(q =>
      q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      q.object.value === 'https://www.glossarist.org/ontologies/PartitiveHyperedge' &&
      q.object.termType === 'NamedNode',
    ));
  });

  it('emits gloss:comprehensive as a named node pointing at the concept URI', () => {
    const quads = quadsFor(makeHyperedge());
    assert.ok(quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/comprehensive' &&
      q.object.termType === 'NamedNode' &&
      q.object.value === `${BASE}/${REGISTER}/concept/112-02-09`,
    ));
  });

  it('emits gloss:hasPart as a named node per part', () => {
    const quads = quadsFor(makeHyperedge());
    const partQuads = quads.filter(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hasPart',
    );
    assert.equal(partQuads.length, 2);
    const targets = partQuads.map(q => q.object.value).sort();
    assert.deepEqual(targets, [
      `${BASE}/${REGISTER}/concept/112-02-10`,
      `${BASE}/${REGISTER}/concept/112-03-26`,
    ]);
  });

  it('emits gloss:enumeration as a string literal', () => {
    const quads = quadsFor(makeHyperedge({ enumeration: 'open' }));
    const enumQuad = quads.find(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/enumeration',
    );
    assert.ok(enumQuad);
    assert.equal(enumQuad.object.termType, 'Literal');
    assert.equal(enumQuad.object.value, 'open');
  });

  it('emits one gloss:hasPluralityMarker literal per marker', () => {
    const quads = quadsFor(makeHyperedge({ markers: ['double', 'dashed'] }));
    const markerQuads = quads.filter(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hasPluralityMarker',
    );
    assert.equal(markerQuads.length, 2);
    assert.deepEqual(
      markerQuads.map(q => q.object.value).sort(),
      ['dashed', 'double'],
    );
  });

  it('emits gloss:hyperedgeContent as a literal when content is present', () => {
    const quads = quadsFor(makeHyperedge({ content: 'value plus uncertainty' }));
    const contentQuad = quads.find(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hyperedgeContent',
    );
    assert.ok(contentQuad);
    assert.equal(contentQuad.object.termType, 'Literal');
    assert.equal(contentQuad.object.value, 'value plus uncertainty');
  });

  it('omits hyperedgeContent when content is null', () => {
    const quads = quadsFor(makeHyperedge());
    assert.ok(!quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hyperedgeContent',
    ));
  });
});
