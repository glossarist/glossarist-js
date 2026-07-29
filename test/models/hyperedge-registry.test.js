// Specs for HyperedgeRegistry — the single source of truth for
// hyperedge type dispatch.
//
// Locks in:
//   - Both production types auto-register at module load
//   - All three indexes (wireKey, typeTag, rdfType) return the right class
//   - Abstract base (AbstractHyperedge) is NOT registered
//   - Duplicate registration throws (catches wireKey/typeTag/rdfType collisions)
//   - unregister() cleans up for tests that add mock types

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { HyperedgeRegistry, groupHyperedgesByWireKey } from '../../src/models/hyperedge-registry.js';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import { GenericHyperedge } from '../../src/models/generic-hyperedge.js';
import { AbstractHyperedge } from '../../src/models/abstract-hyperedge.js';

describe('HyperedgeRegistry', () => {
  it('PartitiveHyperedge is registered under all three indexes', () => {
    assert.equal(HyperedgeRegistry.forWireKey('partitive_relations'), PartitiveHyperedge);
    assert.equal(HyperedgeRegistry.forTypeTag('partitive_relation'), PartitiveHyperedge);
    assert.equal(HyperedgeRegistry.forRdfType('gloss:PartitiveRelation'), PartitiveHyperedge);
  });

  it('GenericHyperedge is registered under all three indexes', () => {
    assert.equal(HyperedgeRegistry.forWireKey('generic_relations'), GenericHyperedge);
    assert.equal(HyperedgeRegistry.forTypeTag('generic_relation'), GenericHyperedge);
    assert.equal(HyperedgeRegistry.forRdfType('gloss:GenericRelation'), GenericHyperedge);
  });

  it('allClasses returns both registered leaves without duplicates', () => {
    const all = HyperedgeRegistry.allClasses();
    assert.ok(all.includes(PartitiveHyperedge));
    assert.ok(all.includes(GenericHyperedge));
    const unique = new Set(all);
    assert.equal(all.length, unique.size, 'allClasses must dedup');
  });

  it('allWireKeys returns both v2 wire keys', () => {
    const keys = HyperedgeRegistry.allWireKeys();
    assert.ok(keys.includes('partitive_relations'));
    assert.ok(keys.includes('generic_relations'));
  });

  it('allWireAndLegacyKeys includes v1 keys declared on each class', () => {
    const keys = HyperedgeRegistry.allWireAndLegacyKeys();
    assert.ok(keys.includes('partitive_relations'));
    assert.ok(keys.includes('partitive_hyperedges'), 'v1 legacy wire key for PartitiveHyperedge');
    assert.ok(keys.includes('generic_relations'));
  });

  it('PartitiveHyperedge metadata block has all 6 required fields', () => {
    assert.equal(PartitiveHyperedge.wireKey, 'partitive_relations');
    assert.equal(PartitiveHyperedge.typeTag, 'partitive_relation');
    assert.equal(PartitiveHyperedge.rdfType, 'gloss:PartitiveRelation');
    assert.equal(typeof PartitiveHyperedge.memberClass, 'function');
    assert.ok(Array.isArray(PartitiveHyperedge.v1WireKeys));
    assert.equal(PartitiveHyperedge.kindLabel, 'PART');
  });

  it('GenericHyperedge metadata block has all 6 required fields', () => {
    assert.equal(GenericHyperedge.wireKey, 'generic_relations');
    assert.equal(GenericHyperedge.typeTag, 'generic_relation');
    assert.equal(GenericHyperedge.rdfType, 'gloss:GenericRelation');
    assert.equal(typeof GenericHyperedge.memberClass, 'function');
    assert.ok(Array.isArray(GenericHyperedge.v1WireKeys));
    assert.equal(GenericHyperedge.kindLabel, 'GEN');
  });

  it('AbstractHyperedge base is not registered (no wireKey)', () => {
    assert.equal(HyperedgeRegistry.forWireKey(undefined), null);
    assert.equal(
      HyperedgeRegistry.allClasses().findIndex(c => c === AbstractHyperedge),
      -1,
      'AbstractHyperedge must not be in the registry — it has no wireKey',
    );
  });

  it('throws on duplicate wireKey registration', () => {
    class FakePartitive extends AbstractHyperedge {
      static wireKey     = 'partitive_relations'; // collision
      static typeTag     = 'fake_partitive';
      static rdfType     = 'gloss:FakePartitive';
      static v1WireKeys  = [];
      static kindLabel   = 'FAKE';
    }
    assert.throws(
      () => HyperedgeRegistry.register(FakePartitive),
      /duplicate wireKey 'partitive_relations'/,
    );
  });

  it('throws on duplicate typeTag registration', () => {
    class FakePartitive2 extends AbstractHyperedge {
      static wireKey     = 'fake_wire';
      static typeTag     = 'partitive_relation'; // collision
      static rdfType     = 'gloss:FakePartitive2';
      static v1WireKeys  = [];
      static kindLabel   = 'FAKE';
    }
    assert.throws(
      () => HyperedgeRegistry.register(FakePartitive2),
      /duplicate typeTag 'partitive_relation'/,
    );
  });

  it('throws on duplicate rdfType registration', () => {
    class FakePartitive3 extends AbstractHyperedge {
      static wireKey     = 'fake_wire_3';
      static typeTag     = 'fake_partitive_3';
      static rdfType     = 'gloss:PartitiveRelation'; // collision
      static v1WireKeys  = [];
      static kindLabel   = 'FAKE';
    }
    assert.throws(
      () => HyperedgeRegistry.register(FakePartitive3),
      /duplicate rdfType 'gloss:PartitiveRelation'/,
    );
  });

  it('unregister removes the class from all three indexes', () => {
    class Temporary extends AbstractHyperedge {
      static wireKey     = 'temporary_relations';
      static typeTag     = 'temporary_relation';
      static rdfType     = 'gloss:TemporaryRelation';
      static v1WireKeys  = [];
      static kindLabel   = 'TEMP';
    }
    HyperedgeRegistry.register(Temporary);
    assert.equal(HyperedgeRegistry.forWireKey('temporary_relations'), Temporary);
    HyperedgeRegistry.unregister(Temporary);
    assert.equal(HyperedgeRegistry.forWireKey('temporary_relations'), null);
    assert.equal(HyperedgeRegistry.forTypeTag('temporary_relation'), null);
    assert.equal(HyperedgeRegistry.forRdfType('gloss:TemporaryRelation'), null);
  });
});

describe('groupHyperedgesByWireKey', () => {
  it('partitions a mixed array by class.wireKey', () => {
    const p = new PartitiveHyperedge({
      comprehensive: { source: 'A', id: '1' },
      partitives: [{ ref: { source: 'A', id: '2' } }, { ref: { source: 'A', id: '3' } }],
    });
    const g = new GenericHyperedge({
      comprehensive: { source: 'A', id: '1' },
      members: [{ ref: { source: 'A', id: '4' } }, { ref: { source: 'A', id: '5' } }],
    });
    const grouped = groupHyperedgesByWireKey([p, g]);
    assert.equal(grouped.partitive_relations.length, 1);
    assert.equal(grouped.generic_relations.length, 1);
  });

  it('returns empty object for empty input', () => {
    assert.deepEqual(groupHyperedgesByWireKey([]), {});
    assert.deepEqual(groupHyperedgesByWireKey(null), {});
    assert.deepEqual(groupHyperedgesByWireKey(undefined), {});
  });

  it('skips entries whose constructor has no wireKey', () => {
    const noKey = { constructor: { /* no wireKey */ } };
    const grouped = groupHyperedgesByWireKey([noKey]);
    assert.deepEqual(grouped, {});
  });
});
