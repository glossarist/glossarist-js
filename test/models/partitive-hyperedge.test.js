import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import {
  PARTITIVE_ENUMERATION,
  PARTITIVE_ENUMERATION_VALUES,
  isValidPartitiveEnumeration,
} from '../../src/models/partitive-enumeration.js';
import {
  PLURALITY_MARKER,
  PLURALITY_MARKER_VALUES,
  isValidPluralityMarker,
} from '../../src/models/plurality-marker.js';
import { Concept } from '../../src/models/concept.js';

describe('PartitiveHyperedge', () => {
  describe('construction', () => {
    it('accepts comprehensive, parts, enumeration, markers, content', () => {
      const he = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '2.9' },
        parts: [
          { source: 'VIM', id: '2.10' },
          { source: 'VIM', id: '2.26' },
        ],
        enumeration: 'closed',
        markers: ['double'],
        content: 'value + uncertainty',
      });

      assert.equal(he.comprehensive.id, '2.9');
      assert.deepEqual(he.parts.map(p => p.id), ['2.10', '2.26']);
      assert.equal(he.enumeration, 'closed');
      assert.deepEqual(he.markers, ['double']);
      // Plain-string content is normalized to { default: '...' }
      assert.deepEqual(he.content, { default: 'value + uncertainty' });
      assert.equal(he.contentString, 'value + uncertainty');
    });

    it('defaults enumeration to closed when omitted', () => {
      const he = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
      });
      assert.equal(he.enumeration, 'closed');
      assert.equal(he.hasEnumeration(PARTITIVE_ENUMERATION.CLOSED), true);
      assert.equal(he.hasEnumeration(PARTITIVE_ENUMERATION.OPEN), false);
    });

    it('initializes markers to empty array when omitted', () => {
      const he = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
      });
      assert.deepEqual(he.markers, []);
      assert.equal(he.isMarked, false);
    });
  });

  describe('enumeration validation', () => {
    it('rejects unknown enumeration values', () => {
      assert.throws(
        () => new PartitiveHyperedge({
          comprehensive: { source: 'VIM', id: '1.1' },
          parts: [{ source: 'VIM', id: '1.2' }],
          enumeration: 'partial',
        }),
        /invalid enumeration/,
      );
    });

    it('throws on invalid markers (per P1: symmetric with enumeration)', () => {
      assert.throws(
        () => new PartitiveHyperedge({
          comprehensive: { source: 'VIM', id: '1.1' },
          parts: [{ source: 'VIM', id: '1.2' }],
          markers: ['double', 'dotted', 'dashed'],
        }),
        /invalid plurality marker/,
      );
    });

    it('throws on duplicate markers', () => {
      assert.throws(
        () => new PartitiveHyperedge({
          comprehensive: { source: 'VIM', id: '1.1' },
          parts: [{ source: 'VIM', id: '1.2' }],
          markers: ['double', 'double'],
        }),
        /duplicate plurality marker/,
      );
    });
  });

  describe('predicates', () => {
    it('isMarked reflects presence of any marker', () => {
      const marked = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
        markers: ['dashed'],
      });
      const unmarked = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
      });
      assert.equal(marked.isMarked, true);
      assert.equal(unmarked.isMarked, false);
    });

    it('hasMarker reflects specific markers (data-driven)', () => {
      const double = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
        markers: ['double'],
      });
      const dashed = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
        markers: ['dashed'],
      });
      const both = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
        markers: ['double', 'dashed'],
      });
      assert.equal(double.hasMarker(PLURALITY_MARKER.DOUBLE), true);
      assert.equal(double.hasMarker(PLURALITY_MARKER.DASHED), false);
      assert.equal(dashed.hasMarker(PLURALITY_MARKER.DOUBLE), false);
      assert.equal(dashed.hasMarker(PLURALITY_MARKER.DASHED), true);
      assert.equal(both.hasMarker(PLURALITY_MARKER.DOUBLE), true);
      assert.equal(both.hasMarker(PLURALITY_MARKER.DASHED), true);
    });

    it('hasEnumeration reflects enumeration (data-driven)', () => {
      const closed = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
        enumeration: 'closed',
      });
      const open = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.1' },
        parts: [{ source: 'VIM', id: '1.2' }],
        enumeration: 'open',
      });
      assert.equal(closed.hasEnumeration(PARTITIVE_ENUMERATION.CLOSED), true);
      assert.equal(closed.hasEnumeration(PARTITIVE_ENUMERATION.OPEN), false);
      assert.equal(open.hasEnumeration(PARTITIVE_ENUMERATION.CLOSED), false);
      assert.equal(open.hasEnumeration(PARTITIVE_ENUMERATION.OPEN), true);
    });
  });

  describe('toJSON / fromJSON round-trip', () => {
    it('round-trips a closed hyperedge with markers and content', () => {
      const he = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '2.9' },
        parts: [
          { source: 'VIM', id: '2.10' },
          { source: 'VIM', id: '2.26' },
        ],
        enumeration: 'closed',
        markers: ['double'],
        content: 'value + uncertainty',
      });
      const restored = PartitiveHyperedge.fromJSON(he.toJSON());

      assert.equal(restored.comprehensive.id, '2.9');
      assert.deepEqual(restored.parts.map(p => p.id), ['2.10', '2.26']);
      assert.equal(restored.enumeration, 'closed');
      assert.deepEqual(restored.markers, ['double']);
      assert.deepEqual(restored.content, { default: 'value + uncertainty' });
    });

    it('round-trips an open hyperedge without markers', () => {
      const he = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.3' },
        parts: [{ source: 'VIM', id: '1.4' }],
        enumeration: 'open',
      });
      const restored = PartitiveHyperedge.fromJSON(he.toJSON());
      assert.equal(restored.isOpen, true);
      assert.equal(restored.isMarked, false);
    });

    it('omits markers and content from JSON when absent', () => {
      const he = new PartitiveHyperedge({
        comprehensive: { source: 'VIM', id: '1.3' },
        parts: [{ source: 'VIM', id: '1.4' }],
      });
      const json = he.toJSON();
      assert.equal('markers' in json, false);
      assert.equal('content' in json, false);
    });
  });

  describe('integration with Concept', () => {
    // v2 wire-through: Concept auto-migrates v1 hyperedge data to v2
    // PartitiveRelation instances. The .partitiveHyperedges property
    // is now a backward-compat alias for .partitiveRelations.
    it('Concept auto-migrates v1 partitive_hyperedges to v2 partitiveRelations', () => {
      const c = new Concept({
        id: '112-02-09',
        partitive_hyperedges: [
          {
            comprehensive: { source: 'VIM', id: '112-02-09' },
            parts: [
              { source: 'VIM', id: '112-02-10' },
              { source: 'VIM', id: '112-03-26' },
            ],
            enumeration: 'closed',
            markers: ['double'],
          },
        ],
      });
      assert.equal(c.partitiveRelations.length, 1);
      const rel = c.partitiveRelations[0];
      assert.equal(rel.comprehensive.id, '112-02-09');
      assert.deepEqual(rel.partitives.map(p => p.ref.id), ['112-02-10', '112-03-26']);
      assert.equal(rel.isComplete, true);  // 'closed' → 'complete'
      assert.equal(rel.plurality.isShared, true);  // 'double' → is_shared
    });

    it('Concept.toJSON emits partitive_relations (v2 wire name)', () => {
      const c = new Concept({
        id: '112-02-09',
        partitive_hyperedges: [
          {
            comprehensive: { source: 'VIM', id: '112-02-09' },
            parts: [
              { source: 'VIM', id: '112-02-10' },
              { source: 'VIM', id: '112-03-26' },
            ],
            enumeration: 'closed',
          },
        ],
      });
      const json = c.toJSON();
      assert.ok(Array.isArray(json.partitive_relations));
      assert.equal(json.partitive_relations.length, 1);
      assert.equal(json.partitive_relations[0].comprehensive.id, '112-02-09');
      // v1 wire key is NOT emitted (v2 is canonical)
      assert.equal('partitive_hyperedges' in json, false);
    });

    it('Concept tolerates absence of partitive_hyperedges', () => {
      const c = new Concept({ id: '1' });
      assert.deepEqual(c.partitiveRelations, []);
      assert.equal('partitive_relations' in c.toJSON(), false);
    });
  });
});

describe('PartitiveEnumeration', () => {
  it('exposes CLOSED and OPEN constants', () => {
    assert.equal(PARTITIVE_ENUMERATION.CLOSED, 'closed');
    assert.equal(PARTITIVE_ENUMERATION.OPEN, 'open');
  });

  it('VALUES is frozen', () => {
    assert.ok(Object.isFrozen(PARTITIVE_ENUMERATION_VALUES));
  });

  it('isValidPartitiveEnumeration accepts closed and open, rejects others', () => {
    assert.equal(isValidPartitiveEnumeration('closed'), true);
    assert.equal(isValidPartitiveEnumeration('open'), true);
    assert.equal(isValidPartitiveEnumeration('partial'), false);
    assert.equal(isValidPartitiveEnumeration(null), false);
  });
});

describe('PluralityMarker', () => {
  it('exposes DOUBLE and DASHED constants', () => {
    assert.equal(PLURALITY_MARKER.DOUBLE, 'double');
    assert.equal(PLURALITY_MARKER.DASHED, 'dashed');
  });

  it('VALUES is frozen', () => {
    assert.ok(Object.isFrozen(PLURALITY_MARKER_VALUES));
  });

  it('isValidPluralityMarker accepts double and dashed, rejects others', () => {
    assert.equal(isValidPluralityMarker('double'), true);
    assert.equal(isValidPluralityMarker('dashed'), true);
    assert.equal(isValidPluralityMarker('dotted'), false);
    assert.equal(isValidPluralityMarker(null), false);
  });
});
