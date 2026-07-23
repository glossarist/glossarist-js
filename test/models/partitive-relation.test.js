// Comprehensive specs for the v2 PartitiveRelation model suite.
//
// Covers:
//   - Construction and validation for PartitiveRelation, PartitiveMember,
//     TypeSharedPlurality, Completeness, MemberCertainty.
//   - Identity for diff/patch.
//   - Migration from v1 PartitiveHyperedge shape.
//   - toJSON / fromJSON round-trip.
//   - ISO 704 invariants (≥2 partitives, no self-loop, etc.).
//   - ISO 12620 coordinate-concept coherence (criterion field).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartitiveRelation } from '../../src/models/partitive-relation.js';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import { TypeSharedPlurality } from '../../src/models/type-shared-plurality.js';
import {
  COMPLETENESS,
  COMPLETENESS_VALUES,
  DEFAULT_COMPLETENESS,
  isValidCompleteness,
} from '../../src/models/completeness.js';
import {
  MEMBER_CERTAINTY,
  DEFAULT_MEMBER_CERTAINTY,
  isValidMemberCertainty,
} from '../../src/models/member-certainty.js';
import {
  migrateHyperedgeToRelation,
  downgradeRelationToHyperedge,
} from '../../src/migration/partitive-relation-migrator.js';

describe('Completeness enum', () => {
  it('exposes complete and partial', () => {
    assert.equal(COMPLETENESS.COMPLETE, 'complete');
    assert.equal(COMPLETENESS.PARTIAL, 'partial');
  });

  it('default is complete', () => {
    assert.equal(DEFAULT_COMPLETENESS, 'complete');
  });

  it('validates values', () => {
    assert.equal(isValidCompleteness('complete'), true);
    assert.equal(isValidCompleteness('partial'), true);
    assert.equal(isValidCompleteness('closed'), false);  // v1 name rejected
    assert.equal(isValidCompleteness(null), false);
  });

  it('is frozen', () => {
    assert.ok(Object.isFrozen(COMPLETENESS_VALUES));
  });
});

describe('MemberCertainty enum', () => {
  it('exposes confirmed and possible', () => {
    assert.equal(MEMBER_CERTAINTY.CONFIRMED, 'confirmed');
    assert.equal(MEMBER_CERTAINTY.POSSIBLE, 'possible');
  });

  it('default is confirmed', () => {
    assert.equal(DEFAULT_MEMBER_CERTAINTY, 'confirmed');
  });

  it('validates values', () => {
    assert.equal(isValidMemberCertainty('confirmed'), true);
    assert.equal(isValidMemberCertainty('possible'), true);
    assert.equal(isValidMemberCertainty('dashed'), false);
    assert.equal(isValidMemberCertainty(null), false);
  });
});

describe('TypeSharedPlurality', () => {
  it('requires isShared boolean', () => {
    assert.throws(
      () => new TypeSharedPlurality({}),
      /requires isShared/,
    );
    assert.throws(
      () => new TypeSharedPlurality({ isShared: 'yes' }),
      /requires isShared/,
    );
  });

  it('defaults isUncertain to false', () => {
    const p = new TypeSharedPlurality({ isShared: true });
    assert.equal(p.isUncertain, false);
  });

  it('accepts both camelCase and snake_case input', () => {
    const p1 = new TypeSharedPlurality({ isShared: true, isUncertain: true });
    const p2 = new TypeSharedPlurality({ is_shared: true, is_uncertain: true });
    assert.equal(p1.isShared, true);
    assert.equal(p1.isUncertain, true);
    assert.equal(p2.isShared, true);
    assert.equal(p2.isUncertain, true);
  });

  it('toJSON emits snake_case wire names; omits default isUncertain', () => {
    const p1 = new TypeSharedPlurality({ isShared: true });
    assert.deepEqual(p1.toJSON(), { is_shared: true });

    const p2 = new TypeSharedPlurality({ isShared: true, isUncertain: true });
    assert.deepEqual(p2.toJSON(), { is_shared: true, is_uncertain: true });
  });

  it('round-trips through toJSON / fromJSON', () => {
    const p = new TypeSharedPlurality({ isShared: true, isUncertain: true });
    const restored = TypeSharedPlurality.fromJSON(p.toJSON());
    assert.equal(restored.isShared, true);
    assert.equal(restored.isUncertain, true);
  });

  it('hasSharedType predicate works', () => {
    const withType = new TypeSharedPlurality({
      isShared: true,
      sharedType: { conceptId: 'phys-quantity', refType: 'domain', source: 'VIM' },
    });
    const withoutType = new TypeSharedPlurality({ isShared: true });
    assert.equal(withType.hasSharedType(), true);
    assert.equal(withoutType.hasSharedType(), false);
  });
});

describe('PartitiveMember', () => {
  it('requires a non-empty ref', () => {
    assert.throws(
      () => new PartitiveMember({ ref: {} }),
      /non-empty/,
    );
  });

  it('defaults certainty to confirmed', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    assert.equal(m.certainty, 'confirmed');
    assert.equal(m.isConfirmed, true);
    assert.equal(m.isPossible, false);
  });

  it('accepts certainty: possible', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' }, certainty: 'possible' });
    assert.equal(m.isPossible, true);
  });

  it('rejects invalid certainty', () => {
    assert.throws(
      () => new PartitiveMember({ ref: { source: 'VIM', id: '1' }, certainty: 'dashed' }),
      /invalid value/,
    );
  });

  it('toJSON omits default certainty', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    assert.deepEqual(m.toJSON(), { ref: { source: 'VIM', id: '1' } });
  });

  it('toJSON includes non-default certainty', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' }, certainty: 'possible' });
    assert.equal(m.toJSON().certainty, 'possible');
  });

  it('identity includes ref + certainty', () => {
    const a = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    const b = new PartitiveMember({ ref: { source: 'VIM', id: '1' }, certainty: 'possible' });
    assert.notEqual(a.identity(), b.identity());
  });
});

describe('PartitiveRelation', () => {
  function makeMember(id) {
    return { ref: { source: 'VIM', id } };
  }

  describe('construction', () => {
    it('accepts comprehensive + 2 partitives', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
      });
      assert.equal(rel.completeness, 'complete');  // default
      assert.equal(rel.isComplete, true);
      assert.equal(rel.isPartial, false);
      assert.equal(rel.isCoordinate, true);
    });

    it('requires ≥2 partitives (ISO 704)', () => {
      assert.throws(
        () => new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [makeMember('2')],
        }),
        /≥2 partitives/,
      );
    });

    it('requires non-empty comprehensive', () => {
      assert.throws(
        () => new PartitiveRelation({
          comprehensive: {},
          partitives: [makeMember('2'), makeMember('3')],
        }),
        /non-empty ConceptReference/,
      );
    });

    it('rejects invalid completeness', () => {
      assert.throws(
        () => new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [makeMember('2'), makeMember('3')],
          completeness: 'closed',  // v1 name
        }),
        /invalid value/,
      );
    });

    it('rejects self-loop (comprehensive as partitive)', () => {
      assert.throws(
        () => new PartitiveRelation({
          comprehensive: { source: 'VIM', id: '1' },
          partitives: [makeMember('1'), makeMember('2')],
        }),
        /self-loops/,
      );
    });
  });

  describe('criterion', () => {
    it('normalizes plain string to { default: ... }', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
        criterion: 'physical structure',
      });
      assert.deepEqual(rel.criterion, { default: 'physical structure' });
      assert.equal(rel.hasCriterion(), true);
    });

    it('preserves lang-keyed hash', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
        criterion: { eng: 'physical structure', fra: 'structure physique' },
      });
      assert.deepEqual(rel.criterion, {
        eng: 'physical structure',
        fra: 'structure physique',
      });
    });

    it('filters non-string entries', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
        criterion: { eng: 'x', num: 42 },
      });
      assert.deepEqual(rel.criterion, { eng: 'x' });
    });

    it('null criterion preserved', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
      });
      assert.equal(rel.criterion, null);
      assert.equal(rel.hasCriterion(), false);
    });
  });

  describe('plurality (v2 structured form)', () => {
    it('accepts plurality block', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
        plurality: { is_shared: true, is_uncertain: true },
      });
      assert.equal(rel.plurality.isShared, true);
      assert.equal(rel.plurality.isUncertain, true);
      assert.equal(rel.hasPlurality(), true);
    });

    it('null plurality preserved', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
      });
      assert.equal(rel.plurality, null);
      assert.equal(rel.hasPlurality(), false);
    });
  });

  describe('toJSON / fromJSON round-trip', () => {
    it('round-trips a complete relation with criterion', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [
          { ref: { source: 'VIM', id: '2' }, certainty: 'confirmed' },
          { ref: { source: 'VIM', id: '3' }, certainty: 'possible' },
        ],
        completeness: 'partial',
        criterion: { eng: 'functional subsystem' },
      });
      const restored = PartitiveRelation.fromJSON(rel.toJSON());
      assert.equal(restored.comprehensive.id, '1');
      assert.equal(restored.partitives.length, 2);
      assert.equal(restored.partitives[0].ref.id, '2');
      assert.equal(restored.partitives[0].certainty, 'confirmed');
      assert.equal(restored.partitives[1].certainty, 'possible');
      assert.equal(restored.completeness, 'partial');
      assert.deepEqual(restored.criterion, { eng: 'functional subsystem' });
    });

    it('omits plurality and criterion from JSON when absent', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
      });
      const json = rel.toJSON();
      assert.equal('plurality' in json, false);
      assert.equal('criterion' in json, false);
    });
  });

  describe('identity', () => {
    it('same comprehensive + same partitive set = same identity', () => {
      const a = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
      });
      const b = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('3'), makeMember('2')],  // different order
      });
      assert.equal(a.identity(), b.identity());
    });

    it('criterion/completeness/plurality changes do NOT change identity', () => {
      const a = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
        completeness: 'complete',
      });
      const b = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
        completeness: 'partial',
        criterion: { eng: 'criterion' },
      });
      assert.equal(a.identity(), b.identity());
    });
  });
});

describe('v1 → v2 migration', () => {
  it('migrates closed hyperedge to complete relation', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      enumeration: 'closed',
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.equal(v2.completeness, 'complete');
    assert.deepEqual(v2.partitives, [
      { ref: { source: 'VIM', id: '2' }, certainty: 'confirmed' },
      { ref: { source: 'VIM', id: '3' }, certainty: 'confirmed' },
    ]);
  });

  it('migrates open hyperedge to partial relation', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      enumeration: 'open',
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.equal(v2.completeness, 'partial');
  });

  it('migrates [double] marker to plurality.is_shared=true', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      markers: ['double'],
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.deepEqual(v2.plurality, { is_shared: true, is_uncertain: false });
  });

  it('migrates [double, dashed] markers to full plurality block', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      markers: ['double', 'dashed'],
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.deepEqual(v2.plurality, { is_shared: true, is_uncertain: true });
  });

  it('drops content field with migration warning', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      content: 'prose text',
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.equal('content' in v2, false);
    assert.match(v2.migrationWarning, /content/);
  });

  it('flags single-part hyperedges with a warning (cannot construct v2)', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }],
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.match(v2.migrationWarning, /≥2/);
  });

  it('idempotent on v2 input (no v1 fields present)', () => {
    const v2 = {
      comprehensive: { source: 'VIM', id: '1' },
      partitives: [{ ref: { source: 'VIM', id: '2' } }, { ref: { source: 'VIM', id: '3' } }],
      completeness: 'complete',
    };
    // migrateHyperedgeToRelation should not be called on v2 data,
    // but if it is, it produces a harmless re-serialization.
    const result = migrateHyperedgeToRelation(v2);
    assert.equal(result.completeness, 'complete');
  });

  it('downgradeRelationToHyperedge is the inverse for round-trip tooling', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      enumeration: 'closed',
      markers: ['double'],
    };
    const v2 = migrateHyperedgeToRelation(v1);
    delete v2.migrationWarning;
    const back = downgradeRelationToHyperedge(v2);
    assert.deepEqual(back.comprehensive, v1.comprehensive);
    assert.deepEqual(back.parts, v1.parts);
    assert.equal(back.enumeration, 'closed');
    assert.deepEqual(back.markers, ['double']);
  });
});
