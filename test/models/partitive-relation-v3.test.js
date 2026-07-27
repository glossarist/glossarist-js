// Comprehensive v3 specs for PartitiveRelation / PartitiveMember.
//
// Covers contributions from TODO.partitive-relation-v3/:
//   - all 5 multiplicity values (5) + new per-value getters
//   - is_delimiting boolean validation (throws on non-boolean)
//   - DelimitingCoherenceRule (overuse, inconsistent, missing criterion)
//   - multiplicityStats + renderer label
//   - ref-keys / criterion-keys shared helper

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Concept } from '../../src/models/concept.js';
import { PartitiveRelation } from '../../src/models/partitive-relation.js';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import {
  MULTIPLICITY,
  MULTIPLICITY_VALUES,
  DEFAULT_MULTIPLICITY,
  isValidMultiplicity,
} from '../../src/models/multiplicity.js';
import { DelimitingCoherenceRule } from '../../src/validators/delimiting-coherence-rule.js';
import { refKey, criterionKey } from '../../src/validators/ref-keys.js';
import { multiplicityStats } from '../../src/diff/diff-renderer.js';
import { ValidationResult } from '../../src/validators/validation-result.js';

function runRule(Rule, concept) {
  const result = new ValidationResult();
  new Rule().validate(concept, '', result);
  return result;
}

function makeMember(id, overrides = {}) {
  return { ref: { source: 'VIM', id }, ...overrides };
}

function makeRelation(overrides = {}) {
  return new PartitiveRelation({
    comprehensive: overrides.comprehensive ?? { source: 'VIM', id: '1' },
    partitives: overrides.partitives ?? [
      makeMember('2'),
      makeMember('3'),
    ],
    ...overrides,
  });
}

describe('Multiplicity enum (all 5 values + ordering)', () => {
  it('exposes all 5 values in declared order', () => {
    assert.deepEqual(
      [...MULTIPLICITY_VALUES],
      [
        'compulsory',
        'optional',
        'compulsory_multiple',
        'optional_multiple',
        'compulsory_at_least_one',
      ],
    );
  });

  it('default is compulsory', () => {
    assert.equal(DEFAULT_MULTIPLICITY, 'compulsory');
  });

  it('validates each value', () => {
    for (const v of MULTIPLICITY_VALUES) {
      assert.equal(isValidMultiplicity(v), true, v);
    }
  });

  it('rejects unknown values', () => {
    assert.equal(isValidMultiplicity('confirmed'), false);
    assert.equal(isValidMultiplicity(null), false);
    assert.equal(isValidMultiplicity(undefined), false);
  });

  it('exposes the renamed constant', () => {
    assert.equal(MULTIPLICITY.COMPULSORY_AT_LEAST_ONE, 'compulsory_at_least_one');
  });
});

describe('PartitiveMember per-value multiplicity predicates', () => {
  for (const v of MULTIPLICITY_VALUES) {
    it(`is<${v}> returns true when multiplicity is ${v}`, () => {
      const m = new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        multiplicity: v,
      });
      const getter = `is${v.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join('')}`;
      // Special-case: 'compulsory_at_least_one' → 'isCompulsoryAtLeastOne'
      assert.equal(m[getter], true, `${getter} should be true for ${v}`);
    });

    it(`is<${v}> is false when multiplicity is a different value`, () => {
      // Pick a different value
      const other = MULTIPLICITY_VALUES.find(x => x !== v);
      const m = new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        multiplicity: other,
      });
      const getter = `is${v.split('_').map(s => s[0].toUpperCase() + s.slice(1)).join('')}`;
      assert.equal(m[getter], false, `${getter} should be false for ${other}`);
    });
  }

  it('defaults to compulsory when omitted', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    assert.equal(m.multiplicity, 'compulsory');
    assert.equal(m.isCompulsory, true);
  });
});

describe('PartitiveMember is_delimiting strict boolean validation', () => {
  it('accepts true', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' }, is_delimiting: true });
    assert.equal(m.is_delimiting, true);
    assert.equal(m.isDelimiting, true);
  });

  it('accepts false', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' }, is_delimiting: false });
    assert.equal(m.is_delimiting, false);
  });

  it('defaults to false when omitted', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    assert.equal(m.is_delimiting, false);
  });

  it('accepts null as default', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' }, is_delimiting: null });
    assert.equal(m.is_delimiting, false);
  });

  it('throws on string true', () => {
    assert.throws(
      () => new PartitiveMember({ ref: { source: 'VIM', id: '1' }, is_delimiting: 'true' }),
      /is_delimiting must be a boolean/,
    );
  });

  it('throws on number 1', () => {
    assert.throws(
      () => new PartitiveMember({ ref: { source: 'VIM', id: '1' }, is_delimiting: 1 }),
      /is_delimiting must be a boolean/,
    );
  });

  it('throws on string yes', () => {
    assert.throws(
      () => new PartitiveMember({ ref: { source: 'VIM', id: '1' }, is_delimiting: 'yes' }),
      /is_delimiting must be a boolean/,
    );
  });

  it('throws on object', () => {
    assert.throws(
      () => new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        is_delimiting: { value: true },
      }),
      /is_delimiting must be a boolean/,
    );
  });
});

describe('DelimitingCoherenceRule', () => {
  it('no issues when concept has no partitive relations', () => {
    const concept = new Concept({ id: '1' });
    const result = runRule(DelimitingCoherenceRule, concept);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  });

  it('passes for a single well-formed relation with one delimiting part', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        partitives: [
          makeMember('2', { is_delimiting: true }),
          makeMember('3'),
        ],
        criterion: { eng: 'physical structure' },
      })],
    });
    const result = runRule(DelimitingCoherenceRule, concept);
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 0);
  });

  it('warns when every partitive is delimiting (overuse)', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        partitives: [
          makeMember('2', { is_delimiting: true }),
          makeMember('3', { is_delimiting: true }),
        ],
        criterion: { eng: 'physical structure' },
      })],
    });
    const result = runRule(DelimitingCoherenceRule, concept);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0].message, /every partitive is marked is_delimiting/);
  });

  it('errors on inconsistent is_delimiting across same-criterion relations', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [
        makeRelation({
          partitives: [
            makeMember('2', { is_delimiting: true }),
            makeMember('3'),
          ],
          criterion: { eng: 'physical' },
        }),
        makeRelation({
          partitives: [
            makeMember('2', { is_delimiting: false }),
            makeMember('4'),
          ],
          criterion: { eng: 'physical' },
          // Different criterion... wait, this is the same.
        }),
      ],
    });
    const result = runRule(DelimitingCoherenceRule, concept);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /inconsistent is_delimiting/);
  });

  it('warns on delimiting without criterion', () => {
    const concept = new Concept({
      id: '1',
      partitiveRelations: [makeRelation({
        partitives: [
          makeMember('2', { is_delimiting: true }),
          makeMember('3'),
        ],
        // no criterion
      })],
    });
    const result = runRule(DelimitingCoherenceRule, concept);
    assert.equal(result.warnings.length, 1);
    assert.match(result.warnings[0].message, /no criterion/);
  });

  // Note: the model constructor enforces ≥2 partitives per ISO 704, so
  // there's no "single-partitive" case for the rule to handle.
});

describe('Shared ref-keys / criterion-keys helpers', () => {
  it('refKey produces stable source:id keys', () => {
    assert.equal(refKey({ source: 'VIM', id: '1' }), 'VIM:1');
    assert.equal(refKey({ source: 'VIM', id: '1', text: 'whatever' }), 'VIM:1');
    assert.equal(refKey(null), null);
    assert.equal(refKey({}), null);
  });

  it('criterionKey sorts values for stable comparison', () => {
    const a = criterionKey({ eng: 'physical', fra: 'physique' });
    const b = criterionKey({ fra: 'physique', eng: 'physical' });
    assert.equal(a, b);
    assert.equal(a, 'physical|physique');
  });

  it('criterionKey returns null for empty / non-string', () => {
    assert.equal(criterionKey(null), null);
    assert.equal(criterionKey({}), null);
    assert.equal(criterionKey({ eng: 1 }), null);
    assert.equal(criterionKey({ eng: '' }), null);
  });

  it('criterionKey filters whitespace-only values', () => {
    assert.equal(criterionKey({ eng: '   ' }), null);
    assert.equal(criterionKey({ eng: 'physical', fra: '  ' }), 'physical');
  });
});

describe('multiplicityStats aggregate', () => {
  it('returns 0/empty for no relations', () => {
    const stats = multiplicityStats([]);
    assert.equal(stats.total, 0);
    assert.deepEqual(stats.byMultiplicity, {});
    assert.equal(stats.delimiting, 0);
  });

  it('counts per multiplicity value', () => {
    const stats = multiplicityStats([
      makeRelation({
        partitives: [
          makeMember('2', { multiplicity: 'compulsory' }),
          makeMember('3', { multiplicity: 'optional' }),
        ],
      }),
      makeRelation({
        partitives: [
          makeMember('4', { multiplicity: 'compulsory' }),
          makeMember('5', { multiplicity: 'compulsory_at_least_one' }),
        ],
      }),
    ]);
    assert.equal(stats.total, 4);
    assert.equal(stats.byMultiplicity.compulsory, 2);
    assert.equal(stats.byMultiplicity.optional, 1);
    assert.equal(stats.byMultiplicity.compulsory_at_least_one, 1);
  });

  it('counts delimiting members', () => {
    const stats = multiplicityStats([
      makeRelation({
        partitives: [
          makeMember('2', { is_delimiting: true }),
          makeMember('3', { is_delimiting: true }),
          makeMember('4'),
        ],
      }),
    ]);
    assert.equal(stats.delimiting, 2);
  });
});
