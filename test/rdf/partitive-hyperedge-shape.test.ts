// Cross-repo shape contract for the PartitiveHyperedge RDF emitter.
//
// Locks in the subject URI scheme, predicate names, and object types
// so JS output matches glossarist-ruby's `Rdf::GlossPartitiveRelation`
// byte for byte (modulo serialization order). When Ruby or JS changes
// the shape, this spec surfaces the divergence immediately.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import {
  conceptToQuads,
  partitiveRelationSubjectUri,
} from '../../src/rdf/index.js';

const BASE = 'https://example.org';
const REGISTER = 'vocab';

function quadsFor(concept) {
  return [...conceptToQuads(concept, { registerId: REGISTER, uriBase: BASE })];
}

describe('PartitiveHyperedge RDF shape — cross-repo contract', () => {
  function makeRelation(overrides = {}) {
    return new PartitiveHyperedge({
      comprehensive: overrides.comprehensive ?? { source: 'VIM', id: '112-02-09' },
      partitives: overrides.partitives ?? [
        { ref: { source: 'VIM', id: '112-02-10' } },
        { ref: { source: 'VIM', id: '112-03-26' } },
      ],
      completeness: overrides.completeness ?? 'complete',
      ...overrides,
    });
  }

  it('subject URI follows partitive-relation/<carrier>/<comprehensive> scheme', () => {
    const rel = makeRelation();
    const parentUri = `${BASE}/${REGISTER}/concept/112-02-09`;
    assert.equal(
      partitiveRelationSubjectUri(parentUri, rel, 0),
      `${BASE}/${REGISTER}/partitive-relation/112-02-09/112-02-09`,
    );
  });

  it('emits rdf:type gloss:PartitiveHyperedge', () => {
    const concept = new Concept({ id: '112-02-09', partitiveRelations: [makeRelation()] });
    const quads = quadsFor(concept);
    assert.ok(quads.some(q =>
      q.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
      q.object.value === 'https://www.glossarist.org/ontologies/PartitiveHyperedge' &&
      q.object.termType === 'NamedNode',
    ));
  });

  it('emits gloss:hasPartitiveRelation link from the carrying concept', () => {
    const concept = new Concept({ id: '112-02-09', partitiveRelations: [makeRelation()] });
    const quads = quadsFor(concept);
    assert.ok(quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hasPartitiveRelation' &&
      q.object.value === `${BASE}/${REGISTER}/partitive-relation/112-02-09/112-02-09`,
    ));
  });

  it('emits gloss:comprehensive as a named node pointing at the concept URI', () => {
    const concept = new Concept({ id: '112-02-09', partitiveRelations: [makeRelation()] });
    const quads = quadsFor(concept);
    assert.ok(quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/comprehensive' &&
      q.object.termType === 'NamedNode' &&
      q.object.value === `${BASE}/${REGISTER}/concept/112-02-09`,
    ));
  });

  it('emits gloss:hasPartitive as a named node per partitive member', () => {
    const concept = new Concept({ id: '112-02-09', partitiveRelations: [makeRelation()] });
    const quads = quadsFor(concept);
    const partQuads = quads.filter(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hasPartitive',
    );
    assert.equal(partQuads.length, 2);
    const targets = partQuads.map(q => q.object.value).sort();
    assert.deepEqual(targets, [
      `${BASE}/${REGISTER}/concept/112-02-10`,
      `${BASE}/${REGISTER}/concept/112-03-26`,
    ]);
  });

  it('emits gloss:completeness as a string literal', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        comprehensive: { source: 'VIM', id: '1' },
        completeness: 'partial',
      })],
    });
    const quads = quadsFor(concept);
    const completenessQuad = quads.find(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/completeness',
    );
    assert.ok(completenessQuad);
    // Per JSON-LD context (`@type: @id`), completeness is a URI
    // reference into the SKOS completeness taxonomy, not a literal.
    assert.equal(completenessQuad.object.termType, 'NamedNode');
    assert.equal(
      completenessQuad.object.value,
      'https://www.glossarist.org/ontologies/completeness/partial',
    );
  });

  it('emits gloss:presence, gloss:count, gloss:isDelimiting on member URIs', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [
          { ref: { source: 'VIM', id: '2' }, presence: 'optional', count: 'exactly_one', is_delimiting: true },
          { ref: { source: 'VIM', id: '3' } },
        ],
      })],
    });
    const quads = quadsFor(concept);
    // presence is `@type: @id` per JSON-LD context — URI reference.
    assert.ok(quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/presence' &&
      q.object.termType === 'NamedNode' &&
      q.object.value === 'https://www.glossarist.org/ontologies/presence/optional',
    ));
    // count is also `@type: @id`.
    assert.ok(quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/count' &&
      q.object.value === 'https://www.glossarist.org/ontologies/count/exactly_one',
    ));
    // isDelimiting is `xsd:boolean` literal.
    assert.ok(quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/isDelimiting' &&
      q.object.termType === 'Literal',
    ));
  });

  it('emits gloss:criterion as language-tagged literals', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        comprehensive: { source: 'VIM', id: '1' },
        criterion: { eng: 'physical structure', fra: 'structure physique' },
      })],
    });
    const quads = quadsFor(concept);
    const criterionQuads = quads.filter(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/criterion',
    );
    assert.equal(criterionQuads.length, 2);
    assert.deepEqual(
      criterionQuads.map(q => q.object.value).sort(),
      ['physical structure', 'structure physique'],
    );
  });

  it('omits hasPartitiveRelation quad when concept has no partitive relations', () => {
    const concept = new Concept({ id: '1' });
    const quads = quadsFor(concept);
    assert.ok(!quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hasPartitiveRelation',
    ));
  });

  it('v1 partitiveHyperedges input is auto-migrated to v2 RDF output', () => {
    // Concept accepts v1 input via the parser path; the RDF emitter
    // should produce v2 predicates regardless of input shape.
    const concept = new Concept({
      id: '112-02-09',
      partitiveHyperedges: [{
        comprehensive: { source: 'VIM', id: '112-02-09' },
        parts: [
          { source: 'VIM', id: '112-02-10' },
          { source: 'VIM', id: '112-03-26' },
        ],
        enumeration: 'closed',
        markers: ['double'],
      }],
    });
    const quads = quadsFor(concept);
    assert.ok(quads.some(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/hasPartitiveRelation',
    ));
    const completenessQuad = quads.find(q =>
      q.predicate.value === 'https://www.glossarist.org/ontologies/completeness',
    );
    assert.ok(completenessQuad);
    assert.equal(completenessQuad.object.termType, 'NamedNode');
    assert.equal(
      completenessQuad.object.value,
      'https://www.glossarist.org/ontologies/completeness/complete',
    );
    // v1 markers are dropped during migration (v2 uses per-member
    // multiplicity + is_delimiting, not plurality bnodes).
  });
});
