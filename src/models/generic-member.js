// GenericMember — one member of a GenericHyperedge.
//
// Per ISO 704:2022 §5.5.4.2.1 (Generic relations and general concepts):
//
//   "In a generic relation, the intension of the subordinate concept
//    includes the intension of the superordinate concept plus at least
//    one additional delimiting characteristic."
//
// In hyperedge terms: when a GenericHyperedge has comprehensive=computer mouse
// and criterion=means of movement detection, each member (mechanical mouse,
// optomechanical mouse, optical mouse) carries a delimitingCharacteristic —
// the value of the criterion for that specific concept:
//
//   mechanical mouse     → 'detecting movement by means of rollers'
//   optomechanical mouse → 'detecting movement by means of rollers and light sensors'
//   optical mouse        → 'detecting movement by means of light sensors'
//
// Multidimensionality (§5.6.3): the same comprehensive can be the
// '1' side of multiple generic hyperedges simultaneously, each by a
// different criterion. computer mouse is also comprehensive of
// {wired mouse, wireless mouse} under criterion=computer connection.
// That second hyperedge's members carry their own delimitingCharacteristic
// values ('using a corded electrical connection', 'using a cordless
// light or sound connection').
//
// delimitingCharacteristic is REQUIRED on GenericMember. Without it,
// the member is just a coordinate concept with no semantic content
// tying it to the criterion — ISO 704 says the relation is meaningless
// without the delimiting characteristic.
//
// LocalizedString shape (mirrors criterion on the parent hyperedge):
//   { eng: 'detecting movement by means of light sensors' }
//   { eng: '...', fra: '...' }   — multiple languages supported

import { HyperedgeMember } from './hyperedge-member.js';

export class GenericMember extends HyperedgeMember {
  constructor(data = {}) {
    super(data);
    this.delimitingCharacteristic = _resolveDelimitingCharacteristic(data.delimitingCharacteristic);
  }

  toJSON() {
    const base = super.toJSON();
    base.delimitingCharacteristic = { ...this.delimitingCharacteristic };
    return base;
  }
}

function _resolveDelimitingCharacteristic(value) {
  if (value == null) {
    throw new Error(
      'GenericMember.delimitingCharacteristic is required per ISO 704:2022 §5.5.4.2.1 ' +
      '(the intension of a subordinate concept must include at least one additional ' +
      'delimiting characteristic beyond the superordinate).',
    );
  }
  if (typeof value === 'string') {
    if (value.length === 0) {
      throw new Error(
        'GenericMember.delimitingCharacteristic cannot be empty (ISO 704:2022 §5.5.4.2.1)',
      );
    }
    return { default: value };
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => typeof v === 'string' && v.length > 0);
    if (entries.length === 0) {
      throw new Error(
        'GenericMember.delimitingCharacteristic must have at least one non-empty string ' +
        'value (ISO 704:2022 §5.5.4.2.1)',
      );
    }
    return Object.fromEntries(entries);
  }
  throw new Error(
    `GenericMember.delimitingCharacteristic must be a string or a language-keyed object; ` +
    `got ${typeof value}`,
  );
}

export default GenericMember;
