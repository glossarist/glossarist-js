import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExternalConcept,
  isExternalMember,
  isExternalComprehensive,
  getExternalMembers,
  hasProvidedBy,
  hasDanglingExternal,
} from '../../src/utils/external-detection.js';
import { ConceptRef } from '../../src/models/concept-ref.js';

// Minimal in-memory store for tests. Real callers use VocabularyStore
// or similar; the ConceptStore interface is the only contract.
function makeStore(map: Map<string, { status?: string; related?: Array<{ type?: string }> }>) {
  return {
    lookup(ref: { source?: string | null; id?: string | null } | null) {
      if (!ref) return null;
      const key = `${ref.source ?? ''}|${ref.id ?? ''}`;
      return map.get(key) ?? null;
    },
  };
}

describe('isExternalConcept', () => {
  it('returns true for status: external', () => {
    assert.equal(isExternalConcept({ status: 'external' }), true);
  });
  it('returns false for other statuses', () => {
    assert.equal(isExternalConcept({ status: 'valid' }), false);
    assert.equal(isExternalConcept({ status: 'draft' }), false);
  });
  it('returns false for null/undefined', () => {
    assert.equal(isExternalConcept(null), false);
    assert.equal(isExternalConcept(undefined), false);
    assert.equal(isExternalConcept({}), false);
  });
});

describe('isExternalMember', () => {
  it('returns true when the member ref resolves to an external concept', () => {
    const store = makeStore(new Map([['ISO|9000', { status: 'external' }]]));
    assert.equal(isExternalMember({ ref: { source: 'ISO', id: '9000' } }, store), true);
  });
  it('returns false for a non-external concept', () => {
    const store = makeStore(new Map([['ISO|9000', { status: 'valid' }]]));
    assert.equal(isExternalMember({ ref: { source: 'ISO', id: '9000' } }, store), false);
  });
  it('returns false when the store cannot resolve', () => {
    const store = makeStore(new Map());
    assert.equal(isExternalMember({ ref: { source: 'ISO', id: '9000' } }, store), false);
  });
  it('returns false for null member', () => {
    const store = makeStore(new Map());
    assert.equal(isExternalMember(null, store), false);
  });
});

describe('isExternalComprehensive', () => {
  it('returns true when comprehensive resolves to external', () => {
    const store = makeStore(new Map([['VIM|1', { status: 'external' }]]));
    assert.equal(isExternalComprehensive({ comprehensive: { source: 'VIM', id: '1' } }, store), true);
  });
  it('returns false when comprehensive is absent', () => {
    const store = makeStore(new Map());
    assert.equal(isExternalComprehensive({}, store), false);
  });
  it('works with a ConceptRef instance', () => {
    const store = makeStore(new Map([['VIM|1', { status: 'external' }]]));
    const ref = new ConceptRef({ source: 'VIM', id: '1' });
    assert.equal(isExternalComprehensive({ comprehensive: ref }, store), true);
  });
});

describe('getExternalMembers', () => {
  it('filters members to externals only', () => {
    const store = makeStore(new Map([
      ['VIM|1', { status: 'external' }],
      ['VIM|2', { status: 'valid' }],
      ['VIM|3', { status: 'external' }],
    ]));
    const hyperedge = {
      members: [
        { ref: { source: 'VIM', id: '1' } },
        { ref: { source: 'VIM', id: '2' } },
        { ref: { source: 'VIM', id: '3' } },
      ],
    };
    const externals = getExternalMembers(hyperedge, store);
    assert.equal(externals.length, 2);
    assert.deepEqual(externals[0]!.ref, { source: 'VIM', id: '1' });
  });
  it('falls back to partitives when members absent', () => {
    const store = makeStore(new Map([['VIM|1', { status: 'external' }]]));
    const hyperedge = {
      partitives: [{ ref: { source: 'VIM', id: '1' } }],
    };
    const externals = getExternalMembers(hyperedge, store);
    assert.equal(externals.length, 1);
  });
});

describe('hasProvidedBy', () => {
  it('returns true when related contains provided_by', () => {
    assert.equal(hasProvidedBy({ related: [{ type: 'provided_by' }] }), true);
  });
  it('returns true for the provides alias', () => {
    assert.equal(hasProvidedBy({ related: [{ type: 'provides' }] }), true);
  });
  it('returns false for unrelated edge types', () => {
    assert.equal(hasProvidedBy({ related: [{ type: 'has_part' }] }), false);
  });
  it('returns false when related is absent', () => {
    assert.equal(hasProvidedBy({}), false);
    assert.equal(hasProvidedBy(null), false);
  });
});

describe('hasDanglingExternal', () => {
  it('returns true when an external comprehensive lacks provided_by', () => {
    const store = makeStore(new Map([['VIM|1', { status: 'external' }]]));
    const hyperedge = {
      comprehensive: { source: 'VIM', id: '1' },
      members: [],
    };
    assert.equal(hasDanglingExternal(hyperedge, store), true);
  });
  it('returns false when an external comprehensive has provided_by', () => {
    const store = makeStore(new Map([
      ['VIM|1', { status: 'external', related: [{ type: 'provided_by' }] }],
    ]));
    const hyperedge = {
      comprehensive: { source: 'VIM', id: '1' },
      members: [],
    };
    assert.equal(hasDanglingExternal(hyperedge, store), false);
  });
  it('returns true when an external member lacks provided_by', () => {
    const store = makeStore(new Map([
      ['VIM|1', { status: 'valid' }],
      ['VIM|2', { status: 'external' }],
    ]));
    const hyperedge = {
      comprehensive: { source: 'VIM', id: '1' },
      members: [{ ref: { source: 'VIM', id: '2' } }],
    };
    assert.equal(hasDanglingExternal(hyperedge, store), true);
  });
  it('returns false when no externals are present', () => {
    const store = makeStore(new Map([
      ['VIM|1', { status: 'valid' }],
      ['VIM|2', { status: 'valid' }],
    ]));
    const hyperedge = {
      comprehensive: { source: 'VIM', id: '1' },
      members: [{ ref: { source: 'VIM', id: '2' } }],
    };
    assert.equal(hasDanglingExternal(hyperedge, store), false);
  });
});
