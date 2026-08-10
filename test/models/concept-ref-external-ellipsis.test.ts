import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptRef } from '../../src/models/concept-ref.js';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';

describe('ConceptRef external + ellipsis (TODO.external-ellipsis/README.md)', () => {
  describe('external form', () => {
    it('accepts {text, external: true}', () => {
      const ref = new ConceptRef({ text: 'precision condition', external: true });
      assert.equal(ref.isExternal, true);
      assert.equal(ref.isResolved, false);
      assert.equal(ref.isEllipsis, false);
      assert.equal(ref.isTextOnly, false);
      assert.deepEqual(ref.toJSON(), { text: 'precision condition', external: true });
    });

    it('defaults external to false', () => {
      const ref = new ConceptRef({ source: 'ISO', id: '704' });
      assert.equal(ref.isExternal, false);
    });

    it('rejects external + source/id', () => {
      assert.throws(
        () => new ConceptRef({ text: 'x', external: true, source: 'IEV', id: '1' }),
        /mutually exclusive/,
      );
    });

    it('has stable identity for external refs', () => {
      const a = new ConceptRef({ text: 'foo', external: true });
      const b = new ConceptRef({ text: 'foo', external: true });
      assert.equal(a.identity(), b.identity());
      assert.equal(a.identity(), 'ext:foo');
    });
  });

  describe('ellipsis form', () => {
    it('accepts {ellipsis: true}', () => {
      const ref = new ConceptRef({ ellipsis: true });
      assert.equal(ref.isEllipsis, true);
      assert.equal(ref.isExternal, false);
      assert.equal(ref.isResolved, false);
      assert.equal(ref.isTextOnly, false);
      assert.deepEqual(ref.toJSON(), { ellipsis: true });
    });

    it('rejects ellipsis + text', () => {
      assert.throws(
        () => new ConceptRef({ ellipsis: true, text: 'x' }),
        /mutually exclusive/,
      );
    });

    it('rejects ellipsis + source', () => {
      assert.throws(
        () => new ConceptRef({ ellipsis: true, source: 'IEV' }),
        /mutually exclusive/,
      );
    });

    it('rejects ellipsis + external', () => {
      assert.throws(
        () => new ConceptRef({ ellipsis: true, external: true }),
        /mutually exclusive/,
      );
    });

    it('ellipsis refs share a sentinel identity', () => {
      const a = ConceptRef.ellipsis();
      const b = ConceptRef.ellipsis();
      assert.equal(a.identity(), b.identity());
      assert.equal(a.identity(), 'ellipsis');
    });
  });

  describe('empty ConceptRef', () => {
    it('rejects empty input', () => {
      assert.throws(
        () => new ConceptRef({}),
        /must have/,
      );
    });

    it('rejects undefined input', () => {
      assert.throws(
        () => new ConceptRef(),
        /must have/,
      );
    });
  });

  describe('text-only form', () => {
    it('isTextOnly is true for text without source/id/external', () => {
      const ref = new ConceptRef({ text: 'some label' });
      assert.equal(ref.isTextOnly, true);
      assert.equal(ref.isResolved, false);
      assert.equal(ref.isExternal, false);
    });
  });

  describe('resolved form (unchanged)', () => {
    it('isResolved is true when both source and id are set', () => {
      const ref = new ConceptRef({ source: 'ISO', id: '704' });
      assert.equal(ref.isResolved, true);
      assert.equal(ref.isTextOnly, false);
    });

    it('isResolved is false when only source is set', () => {
      const ref = new ConceptRef({ source: 'ISO' });
      assert.equal(ref.isResolved, false);
      assert.equal(ref.isTextOnly, false);
    });
  });

  describe('convenience constructors', () => {
    it('ConceptRef.external(text) creates an external ref', () => {
      const ref = ConceptRef.external('precision condition');
      assert.equal(ref.isExternal, true);
      assert.equal(ref.text, 'precision condition');
    });

    it('ConceptRef.ellipsis() creates an ellipsis sentinel', () => {
      const ref = ConceptRef.ellipsis();
      assert.equal(ref.isEllipsis, true);
    });

    it('ConceptRef.fromPair(source, id) creates a resolved ref', () => {
      const ref = ConceptRef.fromPair('ISO', '704');
      assert.equal(ref.isResolved, true);
    });
  });

  describe('HyperedgeMember with external/ellipsis refs', () => {
    it('PartitiveMember accepts an external ref', () => {
      const m = new PartitiveMember({
        ref: { text: 'precision condition', external: true },
      });
      assert.equal(m.ref.isExternal, true);
    });

    it('PartitiveMember accepts an ellipsis ref', () => {
      const m = new PartitiveMember({
        ref: { ellipsis: true },
      });
      assert.equal(m.ref.isEllipsis, true);
    });
  });

  describe('AbstractHyperedge helpers', () => {
    it('hasExternalMembers detects external refs', () => {
      const edge = new PartitiveHyperedge({
        comprehensive: { source: 'ISO', id: '704' },
        partitives: [
          { ref: { source: 'ISO', id: '1' } },
          { ref: { text: 'ext concept', external: true } },
        ],
      });
      assert.equal(edge.hasExternalMembers, true);
      assert.equal(edge.externalMembers.length, 1);
    });

    it('hasEllipsisMember detects ellipsis refs', () => {
      const edge = new PartitiveHyperedge({
        comprehensive: { source: 'ISO', id: '704' },
        partitives: [
          { ref: { source: 'ISO', id: '1' } },
          { ref: { ellipsis: true } },
        ],
      });
      assert.equal(edge.hasEllipsisMember, true);
      assert.equal(edge.ellipsisMembers.length, 1);
    });

    it('returns false when no external/ellipsis members', () => {
      const edge = new PartitiveHyperedge({
        comprehensive: { source: 'ISO', id: '704' },
        partitives: [
          { ref: { source: 'ISO', id: '1' } },
          { ref: { source: 'ISO', id: '2' } },
        ],
      });
      assert.equal(edge.hasExternalMembers, false);
      assert.equal(edge.hasEllipsisMember, false);
    });
  });

  describe('serialization round-trip', () => {
    it('round-trips external refs through toJSON/fromJSON', () => {
      const ref = new ConceptRef({ text: 'precision condition', external: true });
      const json = ref.toJSON();
      const restored = ConceptRef.fromJSON(json);
      assert.equal(restored.isExternal, true);
      assert.equal(restored.text, 'precision condition');
    });

    it('round-trips ellipsis through toJSON/fromJSON', () => {
      const ref = ConceptRef.ellipsis();
      const json = ref.toJSON();
      assert.deepEqual(json, { ellipsis: true });
      const restored = ConceptRef.fromJSON(json);
      assert.equal(restored.isEllipsis, true);
    });

    it('hyperedge with external comprehensive + ellipsis member round-trips', () => {
      const edge = new PartitiveHyperedge({
        comprehensive: { text: 'ext comp', external: true },
        partitives: [
          { ref: { source: 'ISO', id: '1' } },
          { ref: { ellipsis: true } },
        ],
        completeness: 'partial',
      });
      const json = edge.toJSON();
      const restored = PartitiveHyperedge.fromJSON(json);
      assert.equal(restored.comprehensive.isExternal, true);
      assert.equal(restored.hasEllipsisMember, true);
      assert.equal(restored.isPartial, true);
    });
  });
});
