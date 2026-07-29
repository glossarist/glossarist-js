// Base-class inheritance contract.
//
// Audit (AUDIT-2026-07-29 P1-1): the GenericHyperedge commit
// (a62cf85 / 61759a9) introduced HyperedgeMember and
// AbstractHyperedge as shared base classes but did not pin
// the inheritance with a test. These specs catch future regressions
// where someone re-declares a leaf class without extending the base.
//
// Matches docs/design/abstract-nary-relation.md (concept-model repo).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import { GenericMember } from '../../src/models/generic-member.js';
import { HyperedgeMember } from '../../src/models/hyperedge-member.js';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import { GenericHyperedge } from '../../src/models/generic-hyperedge.js';
import { AbstractHyperedge } from '../../src/models/abstract-hyperedge.js';

describe('HyperedgeMember — base for PartitiveMember + GenericMember', () => {
  it('PartitiveMember extends HyperedgeMember (MECE shape inheritance)', () => {
    assert.ok(
      new PartitiveMember({ ref: { source: 'VIM', id: '1' } }) instanceof HyperedgeMember,
      'PartitiveMember must extend HyperedgeMember — the base class carries the MECE dimensions',
    );
  });

  it('GenericMember extends HyperedgeMember (MECE shape inheritance)', () => {
    assert.ok(
      new GenericMember({ ref: { source: 'OIML', id: '5.1' } }) instanceof HyperedgeMember,
      'GenericMember must extend HyperedgeMember — the base class carries the MECE dimensions',
    );
  });

  it('PartitiveMember and GenericMember are both HyperedgeMember instances', () => {
    // The contract isn't that the two leaf classes are the same JS class
    // (they're declared in different files), but that both are
    // instances of the shared base. This catches a regression where
    // someone re-declares a leaf class without `extends
    // HyperedgeMember`.
    const p = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    const g = new GenericMember({ ref: { source: 'OIML', id: '5.1' } });
    assert.ok(p instanceof HyperedgeMember);
    assert.ok(g instanceof HyperedgeMember);
  });
});

describe('AbstractHyperedge — base for PartitiveHyperedge + GenericHyperedge', () => {
  it('PartitiveHyperedge extends AbstractHyperedge', () => {
    const r = new PartitiveHyperedge({
      comprehensive: { source: 'VIM', id: '1' },
      partitives: [
        { ref: { source: 'VIM', id: '2' } },
        { ref: { source: 'VIM', id: '3' } },
      ],
    });
    assert.ok(r instanceof AbstractHyperedge,
      'PartitiveHyperedge must extend AbstractHyperedge — the base class carries comprehensive, members, criterion, etc.');
  });

  it('GenericHyperedge extends AbstractHyperedge', () => {
    const r = new GenericHyperedge({
      comprehensive: { source: 'OIML', id: '5.1' },
      members: [
        { ref: { source: 'OIML', id: '5.4' } },
        { ref: { source: 'OIML', id: '5.5' } },
      ],
    });
    assert.ok(r instanceof AbstractHyperedge,
      'GenericHyperedge must extend AbstractHyperedge');
  });

  it('PartitiveHyperedge and GenericHyperedge are both AbstractHyperedge instances', () => {
    const p = new PartitiveHyperedge({
      comprehensive: { source: 'VIM', id: '1' },
      partitives: [{ ref: { source: 'VIM', id: '2' } }, { ref: { source: 'VIM', id: '3' } }],
    });
    const g = new GenericHyperedge({
      comprehensive: { source: 'OIML', id: '5.1' },
      members: [{ ref: { source: 'OIML', id: '5.4' } }, { ref: { source: 'OIML', id: '5.5' } }],
    });
    assert.ok(p instanceof AbstractHyperedge);
    assert.ok(g instanceof AbstractHyperedge);
  });
});
