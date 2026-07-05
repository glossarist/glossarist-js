import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deterministicId, deterministicBnode } from '../../src/rdf/deterministic-id.js';

describe('deterministicId', () => {
  it('returns a 12-character hex string', () => {
    const id = deterministicId('hello', 'world');
    assert.match(id, /^[0-9a-f]{12}$/);
  });

  it('produces the same ID for the same inputs across calls', () => {
    assert.equal(
      deterministicId('alpha', 'beta', 'gamma'),
      deterministicId('alpha', 'beta', 'gamma'),
    );
  });

  it('produces a different ID when any input differs', () => {
    assert.notEqual(
      deterministicId('alpha', 'beta'),
      deterministicId('alpha', 'gamma'),
    );
  });

  it('skips null/undefined parts without changing the seed for remaining parts', () => {
    assert.equal(
      deterministicId('alpha', null, undefined, 'beta'),
      deterministicId('alpha', 'beta'),
    );
  });
});

describe('deterministicBnode', () => {
  it('produces a valid blank-node label prefixed with _:b', () => {
    const bnode = deterministicBnode('https://example.org/s', 'desig', 0);
    assert.match(bnode, /^_:b[0-9a-f]{12}$/);
  });

  it('is stable for the same subject+role+index', () => {
    assert.equal(
      deterministicBnode('https://example.org/s', 'desig', 0),
      deterministicBnode('https://example.org/s', 'desig', 0),
    );
  });
});
