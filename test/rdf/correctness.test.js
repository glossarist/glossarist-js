// Coverage for the three independent correctness fixes in TODO 22:
// 1. Compound normative-status normalization produces clean URIs.
// 2. Graph term is the 4th sort key in compareQuad.
// 3. Source status/type with slashes produce clean URIs.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DataFactory } from 'n3';
import { Designation } from '../../src/models/designation.js';
import { ConceptSource } from '../../src/models/concept-source.js';
import {
  designationToQuads,
  conceptSourceToQuads,
  collectQuads,
  sortQuads,
  skosLabelPredicate,
  skosxlLabelPredicate,
} from '../../src/rdf/index.js';
import { normalizeEnum } from '../../src/rdf/normalize-enum.js';

const { namedNode, literal, quad, defaultGraph } = DataFactory;

describe('normalizeEnum', () => {
  it('returns the last slash-segment', () => {
    assert.equal(normalizeEnum('preferred/admitted'), 'admitted');
  });

  it('returns the last hash-segment', () => {
    assert.equal(normalizeEnum('http://x/ns#preferred'), 'preferred');
  });

  it('passes through a bare token', () => {
    assert.equal(normalizeEnum('preferred'), 'preferred');
  });

  it('returns empty string for null/undefined/empty', () => {
    assert.equal(normalizeEnum(null), '');
    assert.equal(normalizeEnum(undefined), '');
    assert.equal(normalizeEnum(''), '');
    assert.equal(normalizeEnum('   '), '');
  });
});

describe('designation status normalization', () => {
  it('produces a clean normativeStatus URI from a compound value', () => {
    const d = new Designation({
      type: 'expression',
      designation: 'foo',
      normative_status: 'preferred/admitted',
    });
    const quads = collectQuads(designationToQuads(d, {
      subjectUri: 'https://example.org/c/eng',
      language: 'eng',
      index: 0,
    }));
    const statusQuad = quads.find(q => q.predicate.value === 'https://www.glossarist.org/ontologies/normativeStatus');
    assert.ok(statusQuad, 'expected normativeStatus quad');
    assert.equal(
      statusQuad.object.value,
      'https://www.glossarist.org/ontologies/norm/admitted',
      'URI must use only the last path segment',
    );
    assert.ok(
      !statusQuad.object.value.includes('//admitted'),
      'compound value must not introduce extra slashes',
    );
  });

  it('skips emission when normativeStatus normalizes to empty', () => {
    const d = new Designation({
      type: 'expression',
      designation: 'foo',
      normative_status: '///',
    });
    const quads = collectQuads(designationToQuads(d, {
      subjectUri: 'https://example.org/c/eng',
      language: 'eng',
      index: 0,
    }));
    const statusQuad = quads.find(q => q.predicate.value === 'https://www.glossarist.org/ontologies/normativeStatus');
    assert.ok(!statusQuad, 'no normativeStatus quad expected for empty token');
  });

  it('skosLabelPredicate and skosxlLabelPredicate use the normalized token', () => {
    const d = new Designation({
      type: 'expression',
      designation: 'foo',
      normative_status: 'deprecated/legacy',
    });
    // 'legacy' is not in TYPE_BY_NORMATIVE_STATUS, so falls back to altLabel.
    assert.equal(skosLabelPredicate(d), 'http://www.w3.org/2004/02/skos/core#altLabel');
    assert.equal(skosxlLabelPredicate(d), 'http://www.w3.org/2008/05/skos-xl#altLabel');
  });
});

describe('source status/type normalization', () => {
  it('produces clean URIs from slashed status and type', () => {
    const src = new ConceptSource({
      status: 'authoritative/legacy',
      type: 'lineage/imports',
    });
    const quads = collectQuads(conceptSourceToQuads(src, {
      subjectUri: 'https://example.org/c/eng',
      index: 0,
    }));
    const statusQuad = quads.find(q => q.predicate.value === 'https://www.glossarist.org/ontologies/sourceStatus');
    const typeQuad = quads.find(q => q.predicate.value === 'https://www.glossarist.org/ontologies/sourceType');
    assert.ok(statusQuad);
    assert.equal(statusQuad.object.value, 'https://www.glossarist.org/ontologies/srcstatus/legacy');
    assert.ok(typeQuad);
    assert.equal(typeQuad.object.value, 'https://www.glossarist.org/ontologies/srctype/imports');
  });

  it('skips emission when status normalizes to empty', () => {
    const src = new ConceptSource({ status: '///', type: '' });
    const quads = collectQuads(conceptSourceToQuads(src, {
      subjectUri: 'https://example.org/c/eng',
      index: 0,
    }));
    const statusQuad = quads.find(q => q.predicate.value === 'https://www.glossarist.org/ontologies/sourceStatus');
    const typeQuad = quads.find(q => q.predicate.value === 'https://www.glossarist.org/ontologies/sourceType');
    assert.ok(!statusQuad);
    assert.ok(!typeQuad);
  });
});

describe('sortQuads graph tiebreaker', () => {
  it('uses graph.value as the 4th sort key when s/p/o match', () => {
    const s = namedNode('https://example.org/s');
    const p = namedNode('https://example.org/p');
    const o = literal('same');
    const g1 = namedNode('https://example.org/g1');
    const g2 = namedNode('https://example.org/g2');
    const input = [
      quad(s, p, o, g2),
      quad(s, p, o, g1),
      quad(s, p, o, defaultGraph()),
    ];
    const sorted = sortQuads(input);
    // DefaultGraph ('') sorts before any named graph; then g1 < g2.
    assert.equal(sorted[0].graph.termType, 'DefaultGraph');
    assert.equal(sorted[1].graph.value, 'https://example.org/g1');
    assert.equal(sorted[2].graph.value, 'https://example.org/g2');
  });
});
