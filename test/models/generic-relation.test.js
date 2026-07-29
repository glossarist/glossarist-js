import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GenericRelation } from '../../src/models/generic-relation.js';
import { GenericMember } from '../../src/models/generic-member.js';
import { ConceptRef } from '../../src/models/concept-ref.js';

test('GenericRelation constructs with comprehensive, members, completeness, criterion', () => {
  const rel = new GenericRelation({
    comprehensive: { source: 'VIML', id: '5.1' },
    members: [
      { ref: { source: 'VIML', id: '5.13' } },
      { ref: { source: 'VIML', id: '3.2' } },
    ],
    completeness: 'complete',
    criterion: { eng: 'by realization medium' },
  });
  assert.equal(rel.comprehensive.id, '5.1');
  assert.equal(rel.members.length, 2);
  assert.equal(rel.completeness, 'complete');
  assert.deepEqual(rel.criterion, { eng: 'by realization medium' });
});

test('GenericRelation defaults completeness to complete when omitted', () => {
  const rel = new GenericRelation({
    comprehensive: { source: 'VIML', id: '5.1' },
    members: [
      { ref: { source: 'VIML', id: '5.13' } },
      { ref: { source: 'VIML', id: '3.2' } },
    ],
  });
  assert.equal(rel.completeness, 'complete');
  assert.equal(rel.isComplete, true);
  assert.equal(rel.isPartial, false);
});

test('GenericRelation is coordinate when it has 2+ members', () => {
  const rel = new GenericRelation({
    comprehensive: { source: 'VIML', id: '5.1' },
    members: [
      { ref: { source: 'VIML', id: '5.13' } },
      { ref: { source: 'VIML', id: '3.2' } },
    ],
  });
  assert.equal(rel.isCoordinate, true);
});

test('GenericRelation rejects <2 members (ISO 704 requires two or more)', () => {
  assert.throws(
    () => new GenericRelation({
      comprehensive: { source: 'VIML', id: '5.1' },
      members: [{ ref: { source: 'VIML', id: '5.13' } }],
    }),
    /requires ≥2 members/,
  );
});

test('GenericRelation rejects empty comprehensive', () => {
  assert.throws(
    () => new GenericRelation({
      comprehensive: {},
      members: [
        { ref: { source: 'VIML', id: '5.13' } },
        { ref: { source: 'VIML', id: '3.2' } },
      ],
    }),
    /non-empty ConceptReference/,
  );
});

test('GenericRelation rejects self-loop', () => {
  assert.throws(
    () => new GenericRelation({
      comprehensive: { source: 'VIML', id: '5.1' },
      members: [
        { ref: { source: 'VIML', id: '5.1' } },
        { ref: { source: 'VIML', id: '3.2' } },
      ],
    }),
    /self-loops/,
  );
});

test('GenericRelation round-trips through toJSON / fromJSON', () => {
  const rel = new GenericRelation({
    comprehensive: { source: 'VIML', id: '5.1' },
    members: [
      { ref: { source: 'VIML', id: '5.13' } },
      { ref: { source: 'VIML', id: '3.2' } },
    ],
    completeness: 'complete',
    criterion: { eng: 'by realization medium' },
  });
  const restored = GenericRelation.fromJSON(rel.toJSON());
  assert.equal(restored.comprehensive.id, '5.1');
  assert.deepEqual(
    restored.members.map(m => m.ref.id),
    ['5.13', '3.2'],
  );
  assert.deepEqual(restored.criterion, { eng: 'by realization medium' });
});

test('GenericMember inherits MECE dimensions from ConceptSystemMember', () => {
  const m = new GenericMember({
    ref: { source: 'VIML', id: '5.13' },
    presence: 'optional',
    count: 'multiple',
    is_delimiting: true,
  });
  assert.equal(m.isOptional, true);
  assert.equal(m.isRequired, false);
  assert.equal(m.isDelimiting, true);
  assert.equal(m.count, 'multiple');
});

test('GenericMember rejects invalid presence+count combo', () => {
  assert.throws(
    () => new GenericMember({
      ref: { source: 'VIML', id: '5.13' },
      presence: 'optional',
      count: 'at_least_one',
    }),
    /invalid/i,
  );
});
