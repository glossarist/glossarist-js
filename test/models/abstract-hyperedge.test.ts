// Base-class inheritance contract.
//
// Pins the inheritance: PartitiveMember/GenericMember extend
// HyperedgeMember; PartitiveHyperedge/GenericHyperedge extend
// AbstractHyperedge. Catches regressions where someone re-declares
// a leaf class without extending the base.
//
// Matches docs/design/abstract-hyperedge.md (concept-model repo).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PartitiveMember } from '../../src/models/partitive-member.js';
import { GenericMember } from '../../src/models/generic-member.js';
import { HyperedgeMember } from '../../src/models/hyperedge-member.js';
import { PartitiveHyperedge } from '../../src/models/partitive-hyperedge.js';
import { GenericHyperedge } from '../../src/models/generic-hyperedge.js';
import { AbstractHyperedge } from '../../src/models/abstract-hyperedge.js';

function makeGenericMember(id) {
  return {
    ref: { source: 'OIML', id },
    delimitingCharacteristic: { eng: `delimiting characteristic for ${id}` },
  };
}

describe('HyperedgeMember — base for PartitiveMember + GenericMember', () => {
  it('PartitiveMember extends HyperedgeMember (MECE shape inheritance)', () => {
    assert.ok(
      new PartitiveMember({ ref: { source: 'VIM', id: '1' } }) instanceof HyperedgeMember,
      'PartitiveMember must extend HyperedgeMember — the base class carries the MECE dimensions',
    );
  });

  it('GenericMember extends HyperedgeMember (MECE shape inheritance)', () => {
    assert.ok(
      new GenericMember(makeGenericMember('5.1')) instanceof HyperedgeMember,
      'GenericMember must extend HyperedgeMember — the base class carries the MECE dimensions',
    );
  });

  it('PartitiveMember and GenericMember are both HyperedgeMember instances', () => {
    const p = new PartitiveMember({ ref: { source: 'VIM', id: '1' } });
    const g = new GenericMember(makeGenericMember('5.1'));
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
      members: [makeGenericMember('5.4'), makeGenericMember('5.5')],
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
      members: [makeGenericMember('5.4'), makeGenericMember('5.5')],
    });
    assert.ok(p instanceof AbstractHyperedge);
    assert.ok(g instanceof AbstractHyperedge);
  });
});
