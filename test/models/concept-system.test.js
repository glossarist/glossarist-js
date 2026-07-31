import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptSystem } from '../../src/models/concept-system.js';
import { CONCEPT_SYSTEM_TYPE } from '../../src/models/concept-system-type.js';
import { EQUIVALENCE_DEGREE } from '../../src/models/equivalence-degree.js';
import { CONCEPT_TYPE } from '../../src/models/concept-type.js';

const validAttrs = () => ({
  id: 'viml-measurement-standard-system',
  name: { eng: 'Measurement Standard System' },
  type: 'mixed',
  members: [
    { source: 'VIML', id: '5.1' },
    { source: 'VIML', id: '5.13' },
  ],
  hyperedges: ['viml-5-1/by-realization-medium'],
  rootConcepts: [{ source: 'VIML', id: '5.1' }],
  status: 'valid',
});

test('ConceptSystem constructs from valid attrs', () => {
  const cs = new ConceptSystem(validAttrs());
  assert.equal(cs.id, 'viml-measurement-standard-system');
  assert.equal(cs.type, 'mixed');
  assert.equal(cs.members.length, 2);
  assert.equal(cs.hyperedges.length, 1);
});

test('ConceptSystem type predicates work', () => {
  assert.equal(new ConceptSystem(validAttrs()).isMixed, true);
  assert.equal(new ConceptSystem(validAttrs()).isGeneric, false);

  const genericCs = new ConceptSystem({ ...validAttrs(), type: 'generic' });
  assert.equal(genericCs.isGeneric, true);
});

test('ConceptSystem rejects empty id', () => {
  assert.throws(
    () => new ConceptSystem({ ...validAttrs(), id: '' }),
    /id/i,
  );
});

test('ConceptSystem rejects invalid type', () => {
  assert.throws(
    () => new ConceptSystem({ ...validAttrs(), type: 'unknown' }),
    /type/i,
  );
});

test('ConceptSystem rejects empty members', () => {
  assert.throws(
    () => new ConceptSystem({ ...validAttrs(), members: [] }),
    /members/i,
  );
});

test('ConceptSystem round-trips through toJSON / fromJSON', () => {
  const cs = new ConceptSystem(validAttrs());
  const restored = ConceptSystem.fromJSON(cs.toJSON());
  assert.equal(restored.id, cs.id);
  assert.equal(restored.type, cs.type);
  assert.deepEqual(restored.members.map(m => m.id), ['5.1', '5.13']);
});

test('hasHyperedge and hasMember lookups work', () => {
  const cs = new ConceptSystem(validAttrs());
  assert.equal(cs.hasHyperedge('viml-5-1/by-realization-medium'), true);
  assert.equal(cs.hasHyperedge('nonexistent'), false);
  assert.equal(cs.hasMember({ source: 'VIML', id: '5.1' }), true);
  assert.equal(cs.hasMember({ source: 'VIML', id: '5.99' }), false);
});

test('ConceptSystemType enum has all 5 values', () => {
  assert.deepEqual(
    Object.values(CONCEPT_SYSTEM_TYPE).sort(),
    ['associative', 'generic', 'mixed', 'partitive', 'sequential'],
  );
});

test('EquivalenceDegree enum has all 4 values', () => {
  assert.deepEqual(
    Object.values(EQUIVALENCE_DEGREE).sort(),
    ['directional', 'full', 'none', 'partial'],
  );
});

test('ConceptType enum has general and individual', () => {
  assert.deepEqual(
    Object.values(CONCEPT_TYPE).sort(),
    ['general', 'individual'],
  );
});
