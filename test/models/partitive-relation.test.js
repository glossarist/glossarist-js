// Comprehensive specs for the v2 PartitiveRelation model suite.
//
// Covers:
//   - Construction and validation for PartitiveRelation, PartitiveMember,
//     Completeness, Multiplicity (ISO 704:2022).
//   - Identity for diff/patch.
//   - Migration from v1 PartitiveHyperedge shape.
//   - toJSON / fromJSON round-trip.
//   - ISO 704 invariants (≥2 partitives, no self-loop, etc.).
//   - ISO 12620 coordinate-concept coherence (criterion field).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartitiveRelation } from '../../src/models/partitive-relation.js';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import {
  COMPLETENESS,
  COMPLETENESS_VALUES,
  DEFAULT_COMPLETENESS,
  isValidCompleteness,
} from '../../src/models/completeness.js';
import {
  MULTIPLICITY,
  DEFAULT_MULTIPLICITY,
  isValidMultiplicity,
} from '../../src/models/multiplicity.js';
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

describe('Multiplicity enum (ISO 704:2022)', () => {
  it('exposes all 5 values', () => {
    assert.equal(MULTIPLICITY.COMPULSORY, 'compulsory');
    assert.equal(MULTIPLICITY.OPTIONAL, 'optional');
    assert.equal(MULTIPLICITY.COMPULSORY_MULTIPLE, 'compulsory_multiple');
    assert.equal(MULTIPLICITY.OPTIONAL_MULTIPLE, 'optional_multiple');
    assert.equal(MULTIPLICITY.COMPULSORY_AT_LEAST_ONE, 'compulsory_at_least_one');
  });

  it('default is compulsory', () => {
    assert.equal(DEFAULT_MULTIPLICITY, 'compulsory');
  });

  it('validates values', () => {
    assert.equal(isValidMultiplicity('compulsory'), true);
    assert.equal(isValidMultiplicity('optional'), true);
    assert.equal(isValidMultiplicity('confirmed'), false);  // old certainty name rejected
    assert.equal(isValidMultiplicity(null), false);
  });
});

describe('PartitiveMember', () => {
  it('requires a non-empty ref', () => {
    assert.throws(
      () => new PartitiveMember({ ref: {} }),
      /non-empty/,
    );
  });

  it('defaults multiplicity to compulsory and is_delimiting to false', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    assert.equal(m.multiplicity, 'compulsory');
    assert.equal(m.isCompulsory, true);
    assert.equal(m.isOptional, false);
    assert.equal(m.is_delimiting, false);
    assert.equal(m.isDelimiting, false);
  });

  it('accepts multiplicity: optional + is_delimiting: true', () => {
    const m = new PartitiveMember({
      ref: { source: 'VIM', id: '1' },
      multiplicity: 'optional',
      is_delimiting: true,
    });
    assert.equal(m.isOptional, true);
    assert.equal(m.isDelimiting, true);
  });

  it('rejects invalid multiplicity', () => {
    assert.throws(
      () => new PartitiveMember({ ref: { source: 'VIM', id: '1' }, multiplicity: 'maybe' }),
      /invalid multiplicity/,
    );
  });

  it('toJSON omits defaults', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    assert.deepEqual(m.toJSON(), { ref: { source: 'VIM', id: '1' } });
  });

  it('toJSON includes non-default multiplicity and is_delimiting', () => {
    const m = new PartitiveMember({
      ref: { source: 'VIM', id: '1' },
      multiplicity: 'optional',
      is_delimiting: true,
    });
    assert.equal(m.toJSON().multiplicity, 'optional');
    assert.equal(m.toJSON().is_delimiting, true);
  });

  it('identity includes ref only', () => {
    const a = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    const b = new PartitiveMember({ ref: { source: 'VIM', id: '1' }, multiplicity: 'optional' });
    assert.equal(a.identity(), b.identity());
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

  describe('per-member multiplicity + is_delimiting (ISO 704:2022)', () => {
    it('accepts members with non-default multiplicity and delimiting', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [
          { ref: { source: 'VIM', id: '2' }, multiplicity: 'optional', is_delimiting: true },
          { ref: { source: 'VIM', id: '3' }, multiplicity: 'compulsory' },
        ],
      });
      assert.equal(rel.partitives[0].isOptional, true);
      assert.equal(rel.partitives[0].isDelimiting, true);
      assert.equal(rel.partitives[1].isCompulsory, true);
    });

    it('defaults multiplicity to compulsory and is_delimiting to false', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
      });
      assert.equal(rel.partitives[0].multiplicity, 'compulsory');
      assert.equal(rel.partitives[0].is_delimiting, false);
    });
  });

  describe('toJSON / fromJSON round-trip', () => {
    it('round-trips a complete relation with criterion', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [
          { ref: { source: 'VIM', id: '2' }, multiplicity: 'compulsory' },
          { ref: { source: 'VIM', id: '3' }, multiplicity: 'optional' },
        ],
        completeness: 'partial',
        criterion: { eng: 'functional subsystem' },
      });
      const restored = PartitiveRelation.fromJSON(rel.toJSON());
      assert.equal(restored.comprehensive.id, '1');
      assert.equal(restored.partitives.length, 2);
      assert.equal(restored.partitives[0].ref.id, '2');
      assert.equal(restored.partitives[0].multiplicity, 'compulsory');
      assert.equal(restored.partitives[1].multiplicity, 'optional');
      assert.equal(restored.completeness, 'partial');
      assert.deepEqual(restored.criterion, { eng: 'functional subsystem' });
    });

    it('omits criterion from JSON when absent', () => {
      const rel = new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [makeMember('2'), makeMember('3')],
      });
      const json = rel.toJSON();
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

    it('criterion/completeness/multiplicity changes do NOT change identity', () => {
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
      { ref: { source: 'VIM', id: '2' }, multiplicity: 'compulsory' },
      { ref: { source: 'VIM', id: '3' }, multiplicity: 'compulsory' },
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

  it('drops markers with migration warning (v2 uses per-member multiplicity)', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      markers: ['double'],
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.equal(v2.plurality, undefined);
    assert.match(v2.migrationWarning, /markers.*dropped/);
  });

  it('drops multiple markers with migration warning', () => {
    const v1 = {
      comprehensive: { source: 'VIM', id: '1' },
      parts: [{ source: 'VIM', id: '2' }, { source: 'VIM', id: '3' }],
      markers: ['double', 'dashed'],
    };
    const v2 = migrateHyperedgeToRelation(v1);
    assert.equal(v2.plurality, undefined);
    assert.match(v2.migrationWarning, /markers.*dropped/);
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
    };
    const v2 = migrateHyperedgeToRelation(v1);
    delete v2.migrationWarning;
    const back = downgradeRelationToHyperedge(v2);
    assert.deepEqual(back.comprehensive, v1.comprehensive);
    assert.deepEqual(back.parts, v1.parts);
    assert.equal(back.enumeration, 'closed');
    // markers are lossily dropped in v2 (no longer round-trip through
    // plurality; v2 uses per-member multiplicity + is_delimiting)
  });
});
