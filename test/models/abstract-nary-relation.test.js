// Base-class inheritance contract.
//
// Audit (AUDIT-2026-07-29 P1-1): the GenericRelation commit
// (a62cf85 / 61759a9) introduced ConceptSystemMember and
// AbstractNaryRelation as shared base classes but did not pin
// the inheritance with a test. These specs catch future regressions
// where someone re-declares a leaf class without extending the base.
//
// Matches docs/design/abstract-nary-relation.md (concept-model repo).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import { GenericMember } from '../../src/models/generic-member.js';
import { ConceptSystemMember } from '../../src/models/concept-system-member.js';
import { PartitiveRelation } from '../../src/models/partitive-relation.js';
import { GenericRelation } from '../../src/models/generic-relation.js';
import { AbstractNaryRelation } from '../../src/models/abstract-nary-relation.js';

describe('ConceptSystemMember — base for PartitiveMember + GenericMember', () => {
  it('PartitiveMember extends ConceptSystemMember (MECE shape inheritance)', () => {
    assert.ok(
      new PartitiveMember({ ref: { source: 'VIM', id: '1' } }) instanceof ConceptSystemMember,
      'PartitiveMember must extend ConceptSystemMember — the base class carries the MECE dimensions',
    );
  });

  it('GenericMember extends ConceptSystemMember (MECE shape inheritance)', () => {
    assert.ok(
      new GenericMember({ ref: { source: 'OIML', id: '5.1' } }) instanceof ConceptSystemMember,
      'GenericMember must extend ConceptSystemMember — the base class carries the MECE dimensions',
    );
  });

  it('PartitiveMember and GenericMember are both ConceptSystemMember instances', () => {
    // The contract isn't that the two leaf classes are the same JS class
    // (they're declared in different files), but that both are
    // instances of the shared base. This catches a regression where
    // someone re-declares a leaf class without `extends
    // ConceptSystemMember`.
    const p = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    const g = new GenericMember({ ref: { source: 'OIML', id: '5.1' } });
    assert.ok(p instanceof ConceptSystemMember);
    assert.ok(g instanceof ConceptSystemMember);
  });
});

describe('AbstractNaryRelation — base for PartitiveRelation + GenericRelation', () => {
  it('PartitiveRelation extends AbstractNaryRelation', () => {
    const r = new PartitiveRelation({
      comprehensive: { source: 'VIM', id: '1' },
      partitives: [
        { ref: { source: 'VIM', id: '2' } },
        { ref: { source: 'VIM', id: '3' } },
      ],
    });
    assert.ok(r instanceof AbstractNaryRelation,
      'PartitiveRelation must extend AbstractNaryRelation — the base class carries comprehensive, members, criterion, etc.');
  });

  it('GenericRelation extends AbstractNaryRelation', () => {
    const r = new GenericRelation({
      comprehensive: { source: 'OIML', id: '5.1' },
      members: [
        { ref: { source: 'OIML', id: '5.4' } },
        { ref: { source: 'OIML', id: '5.5' } },
      ],
    });
    assert.ok(r instanceof AbstractNaryRelation,
      'GenericRelation must extend AbstractNaryRelation');
  });

  it('PartitiveRelation and GenericRelation are both AbstractNaryRelation instances', () => {
    const p = new PartitiveRelation({
      comprehensive: { source: 'VIM', id: '1' },
      partitives: [{ ref: { source: 'VIM', id: '2' } }, { ref: { source: 'VIM', id: '3' } }],
    });
    const g = new GenericRelation({
      comprehensive: { source: 'OIML', id: '5.1' },
      members: [{ ref: { source: 'OIML', id: '5.4' } }, { ref: { source: 'OIML', id: '5.5' } }],
    });
    assert.ok(p instanceof AbstractNaryRelation);
    assert.ok(g instanceof AbstractNaryRelation);
  });
});
