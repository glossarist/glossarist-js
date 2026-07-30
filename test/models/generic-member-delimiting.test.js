// Specs for GenericMember.delimitingCharacteristic per ISO 704:2022 §5.5.4.2.1.
//
// Quote:
//   "In a generic relation, the intension of the subordinate concept
//    includes the intension of the superordinate concept plus at least
//    one additional delimiting characteristic."
//
// Example used throughout: comprehensive=computer mouse, criterion=means
// of movement detection, members={mechanical mouse, optomechanical
// mouse, optical mouse}. Each member carries the value of the criterion
// for that specific concept:
//   mechanical mouse     → 'detecting movement by means of rollers'
//   optomechanical mouse → 'detecting movement by means of rollers and light sensors'
//   optical mouse        → 'detecting movement by means of light sensors'
//
// Multidimensionality (§5.6.3): the same comprehensive can be the '1'
// side of multiple generic hyperedges simultaneously, each by a different
// criterion. computer mouse is also comprehensive of {wired mouse,
// wireless mouse} under criterion=computer connection.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { GenericMember } from '../../src/models/generic-member.js';
import { GenericHyperedge } from '../../src/models/generic-hyperedge.js';
import { HyperedgeMember } from '../../src/models/hyperedge-member.js';

function member(id, characteristic) {
  return {
    ref: { source: 'ISO 704', id },
    delimitingCharacteristic: characteristic,
  };
}

describe('GenericMember.delimitingCharacteristic (ISO 704:2022 §5.5.4.2.1)', () => {
  describe('required at construction', () => {
    it('throws when delimitingCharacteristic is missing', () => {
      assert.throws(
        () => new GenericMember({ ref: { source: 'X', id: '1' } }),
        /delimitingCharacteristic is required per ISO 704:2022 §5.5.4.2.1/,
      );
    });

    it('throws when delimitingCharacteristic is null', () => {
      assert.throws(
        () => new GenericMember({ ref: { source: 'X', id: '1' }, delimitingCharacteristic: null }),
        /delimitingCharacteristic is required/,
      );
    });

    it('throws when delimitingCharacteristic is empty string', () => {
      assert.throws(
        () => new GenericMember({ ref: { source: 'X', id: '1' }, delimitingCharacteristic: '' }),
        /cannot be empty/,
      );
    });

    it('throws when delimitingCharacteristic is an object with no string values', () => {
      assert.throws(
        () => new GenericMember({
          ref: { source: 'X', id: '1' },
          delimitingCharacteristic: { eng: '', fra: 42 },
        }),
        /at least one non-empty string value/,
      );
    });

    it('throws on unsupported type (number)', () => {
      assert.throws(
        () => new GenericMember({
          ref: { source: 'X', id: '1' },
          delimitingCharacteristic: 42,
        }),
        /must be a string or a language-keyed object/,
      );
    });
  });

  describe('accepts valid input shapes', () => {
    it('accepts a plain string and normalizes to { default: ... }', () => {
      const m = new GenericMember({
        ref: { source: 'X', id: '1' },
        delimitingCharacteristic: 'detecting movement by means of rollers',
      });
      assert.deepEqual(m.delimitingCharacteristic, {
        default: 'detecting movement by means of rollers',
      });
    });

    it('accepts a language-keyed object (multi-language)', () => {
      const m = new GenericMember({
        ref: { source: 'X', id: '1' },
        delimitingCharacteristic: {
          eng: 'detecting movement by means of light sensors',
          fra: 'détection du mouvement au moyen de capteurs de lumière',
        },
      });
      assert.equal(m.delimitingCharacteristic.eng, 'detecting movement by means of light sensors');
      assert.equal(m.delimitingCharacteristic.fra, 'détection du mouvement au moyen de capteurs de lumière');
    });

    it('filters non-string entries from the language-keyed object', () => {
      const m = new GenericMember({
        ref: { source: 'X', id: '1' },
        delimitingCharacteristic: { eng: 'valid', num: 42, fra: '' },
      });
      assert.deepEqual(m.delimitingCharacteristic, { eng: 'valid' });
    });
  });

  describe('toJSON round-trips the characteristic', () => {
    it('emits delimitingCharacteristic in the JSON output', () => {
      const m = new GenericMember({
        ref: { source: 'X', id: '1' },
        delimitingCharacteristic: { eng: 'light-based detection' },
      });
      const json = m.toJSON();
      assert.deepEqual(json.delimitingCharacteristic, { eng: 'light-based detection' });
    });

    it('round-trips through constructor → toJSON → constructor', () => {
      const original = new GenericMember({
        ref: { source: 'X', id: '1' },
        delimitingCharacteristic: { eng: 'rollers', fra: 'rouleaux' },
      });
      const json = original.toJSON();
      const restored = new GenericMember(json);
      assert.deepEqual(restored.delimitingCharacteristic, original.delimitingCharacteristic);
    });
  });

  describe('GenericHyperedge integration (ISO 704 §5.5.4.2.1 example)', () => {
    it('models the computer mouse → movement detection example from ISO 704', () => {
      const h = new GenericHyperedge({
        comprehensive: { source: 'ISO 704', id: 'computer-mouse' },
        criterion: { eng: 'means of movement detection' },
        members: [
          member('mechanical-mouse', { eng: 'detecting movement by means of rollers' }),
          member('optomechanical-mouse', { eng: 'detecting movement by means of rollers and light sensors' }),
          member('optical-mouse', { eng: 'detecting movement by means of light sensors' }),
        ],
      });
      assert.equal(h.members.length, 3);
      assert.equal(h.members[0].delimitingCharacteristic.eng, 'detecting movement by means of rollers');
      assert.equal(h.members[2].delimitingCharacteristic.eng, 'detecting movement by means of light sensors');
    });

    it('supports multidimensionality (§5.6.3): same comprehensive, different criterion', () => {
      // Two distinct hyperedges share comprehensive=computer mouse but
      // differ by criterion. Members in each carry the delimiting
      // characteristic for that criterion.
      const byMovement = new GenericHyperedge({
        comprehensive: { source: 'ISO 704', id: 'computer-mouse' },
        criterion: { eng: 'means of movement detection' },
        members: [
          member('mechanical-mouse', { eng: 'rollers' }),
          member('optical-mouse', { eng: 'light sensors' }),
        ],
      });
      const byConnection = new GenericHyperedge({
        comprehensive: { source: 'ISO 704', id: 'computer-mouse' },
        criterion: { eng: 'computer connection' },
        members: [
          member('wired-mouse', { eng: 'using a corded electrical connection' }),
          member('wireless-mouse', { eng: 'using a cordless light or sound connection' }),
        ],
      });
      assert.equal(byMovement.members[0].delimitingCharacteristic.eng, 'rollers');
      assert.equal(byConnection.members[0].delimitingCharacteristic.eng, 'using a corded electrical connection');
    });

    it('constructs GenericMember instances from plain hashes', () => {
      const h = new GenericHyperedge({
        comprehensive: { source: 'X', id: '1' },
        members: [
          { ref: { source: 'X', id: '2' }, delimitingCharacteristic: { eng: 'a' } },
          { ref: { source: 'X', id: '3' }, delimitingCharacteristic: { eng: 'b' } },
        ],
      });
      assert.ok(h.members[0] instanceof GenericMember);
      assert.equal(h.members[0].delimitingCharacteristic.eng, 'a');
    });
  });
});

describe('HyperedgeMember no longer carries is_delimiting', () => {
  it('HyperedgeMember constructor does not set is_delimiting', () => {
    const m = new HyperedgeMember({ ref: { source: 'X', id: '1' }, is_delimiting: true });
    assert.equal(m.is_delimiting, undefined);
  });

  it('GenericMember does NOT have is_delimiting (it has delimitingCharacteristic instead)', () => {
    const m = new GenericMember({
      ref: { source: 'X', id: '1' },
      delimitingCharacteristic: { eng: 'detecting movement' },
      is_delimiting: true, // should be ignored on input
    });
    assert.equal(m.is_delimiting, undefined);
  });
});
