// Specs for the unified Concept.relations API.
//
// Locks in Phase 4 invariants:
//   - .relations is the ONLY public relation accessor
//   - typed projections (.partitiveRelations etc.) are gone
//   - ambiguous input throws (relations + typed wire keys)
//   - duplicate input throws (same identity twice)
//   - mixed-type round-trip via toJSON
//   - v1 wire input (partitive_hyperedges) is migrated to v2

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Concept } from '../../src/models/concept.js';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import { GenericHyperedge } from '../../src/models/generic-hyperedge.js';

function makePartitive(overrides = {}) {
  return new PartitiveHyperedge({
    comprehensive: overrides.comprehensive ?? { source: 'VIM', id: '1' },
    partitives: overrides.partitives ?? [
      { ref: { source: 'VIM', id: '2' } },
      { ref: { source: 'VIM', id: '3' } },
    ],
    completeness: overrides.completeness ?? 'complete',
  });
}

function makeGeneric(overrides = {}) {
  return new GenericHyperedge({
    comprehensive: overrides.comprehensive ?? { source: 'OIML', id: '5.1' },
    members: overrides.members ?? [
      { ref: { source: 'OIML', id: '5.4' }, delimitingCharacteristic: { eng: 'by physical realization' } },
      { ref: { source: 'OIML', id: '5.5' }, delimitingCharacteristic: { eng: 'by digital realization' } },
    ],
    completeness: overrides.completeness ?? 'partial',
    criterion: overrides.criterion ?? { eng: 'by realization medium' },
  });
}

describe('Concept.relations unified API', () => {
  describe('typed projections are removed', () => {
    it('.partitiveRelations is undefined', () => {
      const c = new Concept({ id: '1' });
      assert.equal(c.partitiveRelations, undefined);
    });

    it('.genericRelations is undefined', () => {
      const c = new Concept({ id: '1' });
      assert.equal(c.genericRelations, undefined);
    });

    it('.partitiveHyperedges is undefined', () => {
      const c = new Concept({ id: '1' });
      assert.equal(c.partitiveHyperedges, undefined);
    });

    it('callers filter .relations by instanceof for type-specific access', () => {
      const c = new Concept({ id: '1', relations: [makePartitive(), makeGeneric()] });
      const partitiveOnly = c.relations.filter(r => r instanceof PartitiveHyperedge);
      const genericOnly = c.relations.filter(r => r instanceof GenericHyperedge);
      assert.equal(partitiveOnly.length, 1);
      assert.equal(genericOnly.length, 1);
    });
  });

  describe('unified input shape', () => {
    it('accepts data.relations with type-tagged hashes', () => {
      const c = new Concept({
        id: '1',
        relations: [
          {
            type: 'partitive_relation',
            comprehensive: { source: 'A', id: '1' },
            members: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
          },
          {
            type: 'generic_relation',
            comprehensive: { source: 'A', id: '1' },
            members: [
              { ref: { source: 'A', id: '4' }, delimitingCharacteristic: { eng: 'delimiting 4' } },
              { ref: { source: 'A', id: '5' }, delimitingCharacteristic: { eng: 'delimiting 5' } },
            ],
          },
        ],
      });
      assert.equal(c.relations.length, 2);
      assert.ok(c.relations[0] instanceof PartitiveHyperedge);
      assert.ok(c.relations[1] instanceof GenericHyperedge);
    });

    it('accepts typed wire keys (partitive_relations + generic_relations)', () => {
      const c = new Concept({
        id: '1',
        partitive_relations: [{
          comprehensive: { source: 'A', id: '1' },
          partitives: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
        }],
        generic_relations: [{
          comprehensive: { source: 'A', id: '1' },
          members: [
            { ref: { source: 'A', id: '4' }, delimitingCharacteristic: { eng: 'delimiting 4' } },
            { ref: { source: 'A', id: '5' }, delimitingCharacteristic: { eng: 'delimiting 5' } },
          ],
        }],
      });
      assert.equal(c.relations.length, 2);
    });

    it('accepts camelCase variants of typed wire keys', () => {
      const c = new Concept({
        id: '1',
        partitiveRelations: [{
          comprehensive: { source: 'A', id: '1' },
          partitives: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
        }],
      });
      assert.equal(c.relations.length, 1);
    });

    it('accepts v1 wire key (partitive_hyperedges) and migrates', () => {
      const c = new Concept({
        id: '1',
        partitive_hyperedges: [{
          comprehensive: { source: 'A', id: '1' },
          parts: [{ source: 'A', id: '2' }, { source: 'A', id: '3' }],
          enumeration: 'closed',
        }],
      });
      assert.equal(c.relations.length, 1);
      assert.ok(c.relations[0] instanceof PartitiveHyperedge);
      assert.equal(c.relations[0].completeness, 'complete');
    });
  });

  describe('ambiguous input throws (audit C4)', () => {
    it('throws when both relations and typed wire keys are passed', () => {
      assert.throws(
        () => new Concept({
          id: '1',
          relations: [{
            type: 'partitive_relation',
            comprehensive: { source: 'A', id: '1' },
            members: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
          }],
          partitive_relations: [{
            comprehensive: { source: 'B', id: '1' },
            partitives: [{ ref: { source: 'B', id: '2' } }, { ref: { source: 'B', id: '3' } }],
          }],
        }),
        /ambiguous/i,
      );
    });
  });

  describe('duplicate input throws (audit C6)', () => {
    it('throws when the same hyperedge is passed twice', () => {
      const p = makePartitive();
      assert.throws(
        () => new Concept({ id: '1', relations: [p, p] }),
        /duplicate hyperedge/i,
      );
    });

    it('throws when two equivalent hashes are passed (same identity)', () => {
      assert.throws(
        () => new Concept({
          id: '1',
          relations: [
            {
              type: 'partitive_relation',
              comprehensive: { source: 'A', id: '1' },
              members: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
            },
            {
              type: 'partitive_relation',
              comprehensive: { source: 'A', id: '1' },
              members: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
            },
          ],
        }),
        /duplicate hyperedge/i,
      );
    });

    it('allows two PartitiveHyperedges with the same comprehensive but different members', () => {
      // Not a duplicate — different identity.
      const c = new Concept({
        id: '1',
        partitive_relations: [
          {
            comprehensive: { source: 'A', id: '1' },
            partitives: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
          },
          {
            comprehensive: { source: 'A', id: '1' },
            partitives: [{ ref: { source: 'A', id: '4' } }, { ref: { source: 'A', id: '5' } }],
          },
        ],
      });
      assert.equal(c.relations.length, 2);
    });
  });

  describe('toJSON partitions by wire key', () => {
    it('emits partitive_relations and generic_relations from mixed unified array', () => {
      const c = new Concept({ id: '1', relations: [makePartitive(), makeGeneric()] });
      const json = c.toJSON();
      assert.ok(Array.isArray(json.partitive_relations));
      assert.ok(Array.isArray(json.generic_relations));
      assert.equal(json.partitive_relations.length, 1);
      assert.equal(json.generic_relations.length, 1);
    });

    it('omits empty wire keys', () => {
      const c = new Concept({ id: '1', relations: [makeGeneric()] });
      const json = c.toJSON();
      assert.equal(json.generic_relations.length, 1);
      assert.equal('partitive_relations' in json, false);
    });
  });
});
