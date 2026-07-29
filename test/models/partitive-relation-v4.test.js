// v4 specs — MECE decomposition of multiplicity into presence × count.
//
// Matches the actual implementation in src/models/partitive-member.js:
//   - presence (required|optional) + count (exactly_one|at_least_one|multiple)
//   - invalid combination (optional + at_least_one) rejected at construction

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTITIVE_PRESENCE,
  PARTITIVE_PRESENCE_VALUES,
  DEFAULT_PRESENCE,
  isValidPresence,
} from '../../src/models/partitive-presence.js';
import {
  PARTITIVE_COUNT,
  DEFAULT_COUNT,
  isValidCount,
} from '../../src/models/partitive-count.js';
import {
  MULTIPLICITY,
  MULTIPLICITY_VALUES,
  multiplicityFromPair,
  pairFromMultiplicity,
  isValidMultiplicity,
  resolveMultiplicity,
} from '../../src/models/multiplicity.js';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import { Concept } from '../../src/models/concept.js';
import { PartitiveRelation } from '../../src/models/partitive-relation.js';

describe('PartitivePresence enum', () => {
  it('exposes required and optional', () => {
    assert.equal(PARTITIVE_PRESENCE.REQUIRED, 'required');
    assert.equal(PARTITIVE_PRESENCE.OPTIONAL, 'optional');
  });

  it('default is required', () => {
    assert.equal(DEFAULT_PRESENCE, 'required');
  });

  it('validates values', () => {
    assert.equal(isValidPresence('required'), true);
    assert.equal(isValidPresence('optional'), true);
    assert.equal(isValidPresence('maybe'), false);
    assert.equal(isValidPresence(null), false);
  });

  it('is frozen', () => {
    assert.ok(Object.isFrozen(PARTITIVE_PRESENCE_VALUES));
  });
});

describe('PartitiveCount enum', () => {
  it('exposes exactly_one, at_least_one, multiple', () => {
    assert.equal(PARTITIVE_COUNT.EXACTLY_ONE, 'exactly_one');
    assert.equal(PARTITIVE_COUNT.AT_LEAST_ONE, 'at_least_one');
    assert.equal(PARTITIVE_COUNT.MULTIPLE, 'multiple');
  });

  it('default is exactly_one', () => {
    assert.equal(DEFAULT_COUNT, 'exactly_one');
  });

  it('validates values', () => {
    assert.equal(isValidCount('exactly_one'), true);
    assert.equal(isValidCount('at_least_one'), true);
    assert.equal(isValidCount('multiple'), true);
    assert.equal(isValidCount('two'), false);
    assert.equal(isValidCount(null), false);
  });
});

describe('Multiplicity pair ↔ name derivation', () => {
  it('all 5 valid pairs derive to ISO 704 names', () => {
    assert.equal(multiplicityFromPair('required', 'exactly_one'), 'compulsory');
    assert.equal(multiplicityFromPair('optional', 'exactly_one'), 'optional');
    assert.equal(multiplicityFromPair('required', 'multiple'), 'compulsory_multiple');
    assert.equal(multiplicityFromPair('optional', 'multiple'), 'optional_multiple');
    assert.equal(multiplicityFromPair('required', 'at_least_one'), 'compulsory_at_least_one');
  });

  it('optional + at_least_one is rejected (collapses to optional + multiple)', () => {
    assert.throws(
      () => multiplicityFromPair('optional', 'at_least_one'),
      /Invalid multiplicity combination.*collapses to optional \+ multiple/,
    );
  });

  it('round-trips: pair → name → pair', () => {
    const cases = [
      ['required', 'exactly_one'],
      ['optional', 'exactly_one'],
      ['required', 'multiple'],
      ['optional', 'multiple'],
      ['required', 'at_least_one'],
    ];
    for (const [p, c] of cases) {
      const name = multiplicityFromPair(p, c);
      const back = pairFromMultiplicity(name);
      assert.equal(back.presence, p);
      assert.equal(back.count, c);
    }
  });

  it('MULTIPLICITY constants match the ISO names', () => {
    assert.equal(MULTIPLICITY.COMPULSORY, 'compulsory');
    assert.equal(MULTIPLICITY.OPTIONAL, 'optional');
    assert.equal(MULTIPLICITY.COMPULSORY_MULTIPLE, 'compulsory_multiple');
    assert.equal(MULTIPLICITY.OPTIONAL_MULTIPLE, 'optional_multiple');
    assert.equal(MULTIPLICITY.COMPULSORY_AT_LEAST_ONE, 'compulsory_at_least_one');
  });

  it('MULTIPLICITY_VALUES has 5 entries', () => {
    assert.equal(MULTIPLICITY_VALUES.length, 5);
  });

  it('isValidMultiplicity matches the 5 names', () => {
    for (const v of MULTIPLICITY_VALUES) {
      assert.equal(isValidMultiplicity(v), true, v);
    }
    assert.equal(isValidMultiplicity('at_least_one'), false);
    assert.equal(isValidMultiplicity(null), false);
  });

  it('pairFromMultiplicity throws on unknown name', () => {
    assert.throws(
      () => pairFromMultiplicity('mandatory'),
      /Unknown multiplicity/,
    );
  });

  describe('resolveMultiplicity — member-aware resolver', () => {
    it('derives from presence + count on v4 model instances', () => {
      const m = { presence: 'required', count: 'multiple' };
      assert.equal(resolveMultiplicity(m), 'compulsory_multiple');
    });

    it('falls back to literal multiplicity for pre-v4 JSON', () => {
      const legacy = { multiplicity: 'optional_multiple' };
      assert.equal(resolveMultiplicity(legacy), 'optional_multiple');
    });

    it('returns DEFAULT_MULTIPLICITY for empty member', () => {
      assert.equal(resolveMultiplicity({}), 'compulsory');
      assert.equal(resolveMultiplicity(null), 'compulsory');
      assert.equal(resolveMultiplicity(undefined), 'compulsory');
    });

    it('propagates the invalid-combination error rather than swallowing it', () => {
      // The model rejects this at construction. If a caller bypassed the
      // model and passes raw {presence: optional, count: at_least_one},
      // resolveMultiplicity must surface the error, not silently return
      // 'compulsory' (which would mask the data corruption).
      assert.throws(
        () => resolveMultiplicity({ presence: 'optional', count: 'at_least_one' }),
        /Invalid multiplicity combination/,
      );
    });

    it('prefers (presence, count) over legacy multiplicity when both present', () => {
      const m = { presence: 'required', count: 'exactly_one', multiplicity: 'optional_multiple' };
      assert.equal(resolveMultiplicity(m), 'compulsory');
    });
  });
});

describe('PartitiveMember construction', () => {
  it('defaults to required + exactly_one (compulsory)', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    assert.equal(m.presence, 'required');
    assert.equal(m.count, 'exactly_one');
    assert.equal(multiplicityFromPair(m.presence, m.count), 'compulsory');
  });

  it('accepts presence + count', () => {
    const m = new PartitiveMember({
      ref: { source: 'VIM', id: '1' },
      presence: 'optional',
      count: 'multiple',
    });
    assert.equal(m.presence, 'optional');
    assert.equal(m.count, 'multiple');
    assert.equal(multiplicityFromPair(m.presence, m.count), 'optional_multiple');
  });

  it('rejects invalid combination (optional + at_least_one)', () => {
    assert.throws(
      () => new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        presence: 'optional',
        count: 'at_least_one',
      }),
      /invalid — it collapses to optional \+ multiple/,
    );
  });

  it('rejects invalid presence value', () => {
    assert.throws(
      () => new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        presence: 'maybe',
      }),
      /invalid presence/,
    );
  });

  it('rejects invalid count value', () => {
    assert.throws(
      () => new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        count: 'two',
      }),
      /invalid count/,
    );
  });

  it('rejects empty ref', () => {
    assert.throws(
      () => new PartitiveMember({ ref: {} }),
      /non-empty ConceptRef/,
    );
  });

  it('rejects non-boolean is_delimiting (strict, per v6 base)', () => {
    // v6 refactor: PartitiveMember extends ConceptSystemMember, which
    // validates is_delimiting as a boolean (throws on non-boolean).
    assert.throws(
      () => new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        is_delimiting: 'true',
      }),
      /is_delimiting must be boolean/,
    );
  });
});

describe('PartitiveMember predicates', () => {
  it('per-dimension predicates work', () => {
    const m = new PartitiveMember({
      ref: { source: 'VIM', id: '1' },
      presence: 'optional',
      count: 'multiple',
    });
    assert.equal(m.isRequired, false);
    assert.equal(m.isOptional, true);
    assert.equal(m.isDelimiting, false);
  });

  it('multiplicityFromPair covers all 5 valid combinations', () => {
    const cases = [
      ['required', 'exactly_one', 'compulsory'],
      ['optional', 'exactly_one', 'optional'],
      ['required', 'multiple', 'compulsory_multiple'],
      ['optional', 'multiple', 'optional_multiple'],
      ['required', 'at_least_one', 'compulsory_at_least_one'],
    ];
    for (const [p, c, name] of cases) {
      const m = new PartitiveMember({
        ref: { source: 'VIM', id: '1' },
        presence: p, count: c,
      });
      assert.equal(multiplicityFromPair(m.presence, m.count), name);
    }
  });
});

describe('PartitiveMember toJSON / fromJSON round-trip', () => {
  it('omits default presence + count', () => {
    const m = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    const json = m.toJSON();
    assert.equal('presence' in json, false);
    assert.equal('count' in json, false);
    assert.equal('is_delimiting' in json, false);
  });

  it('emits non-default presence + count', () => {
    const m = new PartitiveMember({
      ref: { source: 'VIM', id: '1' },
      presence: 'optional',
      count: 'multiple',
      is_delimiting: true,
    });
    assert.deepEqual(m.toJSON(), {
      ref: { source: 'VIM', id: '1' },
      presence: 'optional',
      count: 'multiple',
      is_delimiting: true,
    });
  });

  it('round-trips through toJSON → fromJSON preserving pair', () => {
    const original = new PartitiveMember({
      ref: { source: 'VIM', id: '1' },
      presence: 'required',
      count: 'at_least_one',
    });
    const restored = PartitiveMember.fromJSON(original.toJSON());
    assert.equal(restored.presence, 'required');
    assert.equal(restored.count, 'at_least_one');
    assert.equal(multiplicityFromPair(restored.presence, restored.count), 'compulsory_at_least_one');
  });
});

describe('Concept integration', () => {
  it('Concept.toJSON emits presence + count', () => {
    const c = new Concept({
      id: '1',
      partitiveRelations: [new PartitiveRelation({
        comprehensive: { source: 'VIM', id: '1' },
        partitives: [
          { ref: { source: 'VIM', id: '2' }, presence: 'optional', count: 'multiple' },
          { ref: { source: 'VIM', id: '3' } },
        ],
      })],
    });
    const json = c.toJSON();
    const m0 = json.partitive_relations[0].partitives[0];
    assert.equal(m0.presence, 'optional');
    assert.equal(m0.count, 'multiple');

    const m1 = json.partitive_relations[0].partitives[1];
    assert.equal('presence' in m1, false);
    assert.equal('count' in m1, false);
  });
});
