import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptSource } from '../../src/models/concept-source.js';
import { Citation } from '../../src/models/citation.js';

describe('ConceptSource', () => {
  describe('id field', () => {
    it('defaults to null when not provided', () => {
      const source = new ConceptSource({ type: 'authoritative' });
      assert.equal(source.id, null);
    });

    it('stores the provided id', () => {
      const source = new ConceptSource({ id: 'iso-7301-3-2', type: 'authoritative' });
      assert.equal(source.id, 'iso-7301-3-2');
    });

    it('round-trips id through toJSON', () => {
      const source = new ConceptSource({
        id: 'smith-2020',
        type: 'lineage',
        origin: new Citation({ ref: { source: 'DOI', id: '10.1234/abc' } }),
      });
      const json = source.toJSON();
      assert.equal(json.id, 'smith-2020');
    });

    it('omits id from JSON when null (no spurious key)', () => {
      const source = new ConceptSource({ type: 'authoritative' });
      const json = source.toJSON();
      assert.equal('id' in json, false);
    });

    it('round-trips a source with no id through fromJSON', () => {
      const source = new ConceptSource({ type: 'authoritative' });
      const restored = ConceptSource.fromJSON(source.toJSON());
      assert.equal(restored.id, null);
      assert.equal(restored.type, 'authoritative');
    });

    it('preserves id through fromJSON', () => {
      const source = new ConceptSource({ id: 'foo', type: 'authoritative' });
      const restored = ConceptSource.fromJSON(source.toJSON());
      assert.equal(restored.id, 'foo');
    });
  });

  describe('integration with Citation', () => {
    it('id is independent of Citation.ref', () => {
      const source = new ConceptSource({
        id: 'iso-7301',
        origin: new Citation({
          ref: { source: 'ISO', id: '7301', version: '2024' },
          locality: { type: 'clause', reference_from: '3.2' },
        }),
      });
      assert.equal(source.id, 'iso-7301');
      assert.equal(source.origin.ref.id, '7301');
      // Locality is constructed via the Locality model; it
      // exposes `referenceFrom` (camelCase). The constructor
      // also accepts the snake_case form.
      assert.equal(source.origin.locality.referenceFrom, '3.2');
    });
  });

  describe('sourced_from', () => {
    it('defaults to empty array when not provided', () => {
      const source = new ConceptSource({ type: 'authoritative' });
      assert.deepEqual(source.sourced_from, []);
    });

    it('wraps plain objects as Citation instances', () => {
      const source = new ConceptSource({
        type: 'lineage',
        origin: { ref: { source: 'OIML', id: 'G 18', version: '2010' } },
        sourced_from: [
          { ref: { source: 'OIML', id: 'B 3', version: '2003' } },
        ],
      });
      assert.equal(source.sourced_from.length, 1);
      assert.equal(source.sourced_from[0] instanceof Citation, true);
      assert.equal(source.sourced_from[0].ref.id, 'B 3');
    });

    it('round-trips through toJSON/fromJSON', () => {
      const source = new ConceptSource({
        type: 'lineage',
        status: 'identical',
        origin: { ref: { source: 'OIML', id: 'G 18', version: '2010' } },
        sourced_from: [
          { ref: { source: 'OIML', id: 'B 3', version: '2003' } },
        ],
      });
      const json = source.toJSON();
      assert.equal(json.sourced_from.length, 1);
      assert.equal(json.sourced_from[0].ref.id, 'B 3');
      const restored = ConceptSource.fromJSON(json);
      assert.equal(restored.sourced_from.length, 1);
      assert.equal(restored.sourced_from[0].ref.id, 'B 3');
    });

    it('omits sourced_from from JSON when empty', () => {
      const source = new ConceptSource({ type: 'authoritative' });
      const json = source.toJSON();
      assert.equal('sourced_from' in json, false);
    });

    it('handles multiple sourced_from entries', () => {
      const source = new ConceptSource({
        type: 'lineage',
        status: 'modified',
        modification: 'merged definitions from B 3 and B 4',
        origin: { ref: { source: 'OIML', id: 'G 18', version: '2010' } },
        sourced_from: [
          { ref: { source: 'OIML', id: 'B 3', version: '2003' } },
          { ref: { source: 'OIML', id: 'B 4', version: '2005' } },
        ],
      });
      const json = source.toJSON();
      assert.equal(json.sourced_from.length, 2);
      assert.equal(json.sourced_from[0].ref.id, 'B 3');
      assert.equal(json.sourced_from[1].ref.id, 'B 4');
    });

    it('preserves locality in sourced_from entries', () => {
      const source = new ConceptSource({
        type: 'lineage',
        status: 'identical',
        origin: { ref: { source: 'OIML', id: 'G 18', version: '2010' } },
        sourced_from: [
          { ref: { source: 'OIML', id: 'V 1', version: '2000' }, locality: { type: 'clause', reference_from: '3.1' } },
        ],
      });
      const json = source.toJSON();
      assert.equal(json.sourced_from[0].locality.type, 'clause');
      assert.equal(json.sourced_from[0].locality.reference_from, '3.1');
    });
  });
});
