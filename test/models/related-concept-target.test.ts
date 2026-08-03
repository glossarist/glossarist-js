import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RelatedConcept, ConceptRef } from '../../src/models/index.js';

describe('RelatedConcept.target — cross-dataset link URL', () => {
  it('accepts a target field in the constructor', () => {
    const rc = new RelatedConcept({
      type: 'superseded_by',
      target: 'https://example.com/cie-2020/concept/17-21-097',
    });
    assert.equal(rc.target, 'https://example.com/cie-2020/concept/17-21-097');
  });

  it('defaults target to null when not provided', () => {
    const rc = new RelatedConcept({ type: 'see' });
    assert.equal(rc.target, null);
  });

  it('round-trips target through toJSON/fromJSON', () => {
    const rc = new RelatedConcept({
      type: 'supersedes',
      target: 'https://example.com/dataset/concept/42',
      ref: new ConceptRef({ source: 'ISO', id: '704' }),
    });
    const json = rc.toJSON();
    assert.equal(json.target, 'https://example.com/dataset/concept/42');

    const restored = RelatedConcept.fromJSON(json);
    assert.equal(restored.target, 'https://example.com/dataset/concept/42');
  });

  it('omits target from toJSON when null (clean serialization)', () => {
    const rc = new RelatedConcept({ type: 'see' });
    const json = rc.toJSON();
    assert.equal(json.target, undefined);
  });

  it('preserves target alongside ref (both can coexist)', () => {
    const rc = new RelatedConcept({
      type: 'superseded_by',
      target: 'https://example.com/cie-2020/concept/17-21-097',
      ref: { source: 'CIE S 017:2020', id: '17-21-097' },
    });
    assert.equal(rc.target, 'https://example.com/cie-2020/concept/17-21-097');
    assert.ok(rc.ref instanceof ConceptRef);
    assert.equal(rc.ref?.source, 'CIE S 017:2020');
    assert.equal(rc.ref?.id, '17-21-097');
  });
});

describe('RelatedConcept.target — identity includes target (prevents diff data loss)', () => {
  it('two instances with different target values have different identities', () => {
    const a = new RelatedConcept({
      type: 'supersedes',
      ref: { source: 'ISO', id: '704' },
      target: 'https://a.com',
    });
    const b = new RelatedConcept({
      type: 'supersedes',
      ref: { source: 'ISO', id: '704' },
      target: 'https://b.com',
    });
    assert.notEqual(a.identity(), b.identity());
  });

  it('two instances with the same target value have the same identity', () => {
    const a = new RelatedConcept({
      type: 'supersedes',
      ref: { source: 'ISO', id: '704' },
      target: 'https://same.com',
    });
    const b = new RelatedConcept({
      type: 'supersedes',
      ref: { source: 'ISO', id: '704' },
      target: 'https://same.com',
    });
    assert.equal(a.identity(), b.identity());
  });

  it('identity distinguishes target present from target absent', () => {
    const withTarget = new RelatedConcept({
      type: 'see',
      ref: { source: 'ISO', id: '704' },
      target: 'https://x.com',
    });
    const withoutTarget = new RelatedConcept({
      type: 'see',
      ref: { source: 'ISO', id: '704' },
    });
    assert.notEqual(withTarget.identity(), withoutTarget.identity());
  });
});
