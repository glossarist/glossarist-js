import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deterministicBnodeId } from '../../src/rdf/bnode-id.js';

describe('bnode-id', () => {
  describe('deterministicBnodeId', () => {
    it('produces stable IDs across calls in the same process', () => {
      const a = deterministicBnodeId('a', 'b', 'c');
      const b = deterministicBnodeId('a', 'b', 'c');
      assert.equal(a, b);
    });

    it('produces different IDs for different inputs', () => {
      const a = deterministicBnodeId('a', 'b');
      const b = deterministicBnodeId('a', 'c');
      assert.notEqual(a, b);
    });

    it('ignores null and undefined parts', () => {
      const a = deterministicBnodeId('a', null, 'b', undefined);
      const b = deterministicBnodeId('a', 'b');
      assert.equal(a, b);
    });

    it('ignores empty-string parts', () => {
      const a = deterministicBnodeId('a', '', 'b');
      const b = deterministicBnodeId('a', 'b');
      assert.equal(a, b);
    });

    it('returns a deterministic value for empty input', () => {
      const a = deterministicBnodeId();
      const b = deterministicBnodeId();
      assert.equal(a, b);
    });

    it('returns a hex-compatible ID (no special chars)', () => {
      const id = deterministicBnodeId('some', 'input');
      assert.match(id, /^[0-9a-f]+$/);
    });
  });
});
