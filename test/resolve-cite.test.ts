import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReferenceResolver } from '../src/reference-resolver.js';

describe('ReferenceResolver.resolveCite (P3)', () => {
  const resolver = new ReferenceResolver();

  it('classifies as internal-citation when source matches current dataset', () => {
    const result = resolver.resolveCite(
      { key: 'c1', sourceId: 'dataset-a' },
      'dataset-a',
    );
    assert.equal(result.classification, 'internal-citation');
    assert.deepEqual(result.resolved, { registerId: 'dataset-a', conceptId: 'c1' });
  });

  it('classifies as external-citation when source is a different dataset', () => {
    const result = resolver.resolveCite(
      { key: 'c1', sourceId: 'dataset-b' },
      'dataset-a',
    );
    assert.equal(result.classification, 'external-citation');
    assert.deepEqual(result.resolved, { registerId: 'dataset-b', conceptId: 'c1' });
  });

  it('classifies as external-citation when no sourceDatasetId is provided', () => {
    const result = resolver.resolveCite(
      { key: 'c1', sourceId: 'dataset-b' },
    );
    assert.equal(result.classification, 'external-citation');
  });

  it('classifies as self-contained-citation when only a link is provided', () => {
    const result = resolver.resolveCite(
      { link: 'https://example.com/paper' },
      'dataset-a',
    );
    assert.equal(result.classification, 'self-contained-citation');
    assert.equal(result.resolved, null);
  });

  it('classifies as unresolved-citation when no key or sourceId', () => {
    const result = resolver.resolveCite({}, 'dataset-a');
    assert.equal(result.classification, 'unresolved-citation');
    assert.equal(result.resolved, null);
  });

  it('uses ref.source and ref.id when sourceId/key are absent', () => {
    const result = resolver.resolveCite(
      { ref: { source: 'ds', id: 'c2' } },
      'ds',
    );
    assert.equal(result.classification, 'internal-citation');
    assert.deepEqual(result.resolved, { registerId: 'ds', conceptId: 'c2' });
  });

  it('prefers explicit sourceId/key over ref fields', () => {
    const result = resolver.resolveCite(
      { key: 'explicit', sourceId: 'explicit-ds', ref: { source: 'implicit-ds', id: 'implicit' } },
      'explicit-ds',
    );
    assert.equal(result.classification, 'internal-citation');
    assert.deepEqual(result.resolved, { registerId: 'explicit-ds', conceptId: 'explicit' });
  });

  it('self-contained takes precedence when link is present but no source/id', () => {
    const result = resolver.resolveCite(
      { link: 'https://example.com' },
    );
    assert.equal(result.classification, 'self-contained-citation');
  });
});
