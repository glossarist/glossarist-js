import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { provenanceToQuads } from '../../src/rdf/provenance-emitter.js';
import { collectQuads } from '../../src/rdf/document-writer.js';

const PROV_NS = 'http://www.w3.org/ns/prov#';
const DCTERMS_NS = 'http://purl.org/dc/terms/';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

function quadSet(quads) {
  return new Set(quads.map(q =>
    `${q.subject.value} ${q.predicate.value} ${q.object.value}`,
  ));
}

describe('provenanceToQuads', () => {
  it('emits wasGeneratedBy link from subject to activity', () => {
    const quads = collectQuads(provenanceToQuads({
      subjectUri: 'https://example.org/c1',
      serializer: 'concept-browser',
      serializerVersion: '0.7.66',
      generatedAt: '2026-07-06T12:00:00Z',
    }));
    const has = quadSet(quads);
    assert.ok(has.has(`https://example.org/c1 ${PROV_NS}wasGeneratedBy activity/serializers/concept-browser/0.7.66`));
  });

  it('types the activity as prov:Activity', () => {
    const quads = collectQuads(provenanceToQuads({
      subjectUri: 'https://example.org/c1',
      serializer: 'cb',
      serializerVersion: '1',
      generatedAt: '2026-07-06T12:00:00Z',
    }));
    const has = quadSet(quads);
    assert.ok(has.has(`activity/serializers/cb/1 ${RDF_TYPE} ${PROV_NS}Activity`));
  });

  it('types the agent as prov:SoftwareAgent', () => {
    const quads = collectQuads(provenanceToQuads({
      subjectUri: 'https://example.org/c1',
      serializer: 'cb',
      serializerVersion: '1',
      generatedAt: '2026-07-06T12:00:00Z',
    }));
    const types = quads
      .filter(q => q.predicate.value === RDF_TYPE)
      .map(q => q.object.value);
    assert.ok(types.includes(`${PROV_NS}SoftwareAgent`));
  });

  it('types the subject as prov:Entity', () => {
    const quads = collectQuads(provenanceToQuads({
      subjectUri: 'https://example.org/c1',
      serializer: 'cb',
      serializerVersion: '1',
      generatedAt: '2026-07-06T12:00:00Z',
    }));
    const has = quadSet(quads);
    assert.ok(has.has(`https://example.org/c1 ${RDF_TYPE} ${PROV_NS}Entity`));
  });

  it('emits isVersionOf only when canonicalUri differs from subjectUri', () => {
    const withCanon = collectQuads(provenanceToQuads({
      subjectUri: 'https://example.org/c1/v2',
      serializer: 'cb',
      serializerVersion: '1',
      generatedAt: '2026-07-06T12:00:00Z',
      canonicalUri: 'https://example.org/c1',
    }));
    assert.ok(withCanon.some(q =>
      q.predicate.value === `${DCTERMS_NS}isVersionOf` &&
      q.object.value === 'https://example.org/c1',
    ));

    const sameCanon = collectQuads(provenanceToQuads({
      subjectUri: 'https://example.org/c1',
      serializer: 'cb',
      serializerVersion: '1',
      generatedAt: '2026-07-06T12:00:00Z',
      canonicalUri: 'https://example.org/c1',
    }));
    assert.ok(!sameCanon.some(q => q.predicate.value === `${DCTERMS_NS}isVersionOf`));
  });

  it('is idempotent — same input produces same bnode IDs and quad set', () => {
    const input = {
      subjectUri: 'https://example.org/c1',
      serializer: 'cb',
      serializerVersion: '1',
      generatedAt: '2026-07-06T12:00:00Z',
    };
    const a = collectQuads(provenanceToQuads(input));
    const b = collectQuads(provenanceToQuads(input));
    assert.deepEqual(quadSet(a), quadSet(b));
    // Bnode IDs are the same across runs
    const aBnodes = a.filter(q => q.subject.termType === 'BlankNode').map(q => q.subject.value);
    const bBnodes = b.filter(q => q.subject.termType === 'BlankNode').map(q => q.subject.value);
    assert.deepEqual(aBnodes, bBnodes);
  });

  it('throws when subjectUri is missing', () => {
    assert.throws(() =>
      [...provenanceToQuads({ serializer: 'cb', serializerVersion: '1', generatedAt: 'x' })],
      /subjectUri/,
    );
  });

  it('throws when serializer is missing', () => {
    assert.throws(() =>
      [...provenanceToQuads({ subjectUri: 'x', serializerVersion: '1', generatedAt: 'x' })],
      /serializer/,
    );
  });

  it('throws when generatedAt is missing', () => {
    assert.throws(() =>
      [...provenanceToQuads({ subjectUri: 'x', serializer: 'cb', serializerVersion: '1' })],
      /generatedAt/,
    );
  });
});
