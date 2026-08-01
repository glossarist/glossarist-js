// GenericMember — one member of a GenericHyperedge.
//
// Per ISO 704:2022 §5.5.4.2.1 (Generic relations and general concepts):
//
//   "In a generic relation, the intension of the subordinate concept
//    includes the intension of the superordinate concept plus at least
//    one additional delimiting characteristic."
//
// See docs/design/abstract-hyperedge.md for the full rationale and
// the computer-mouse worked example.

import { HyperedgeMember } from './hyperedge-member.js';
import type { HyperedgeMemberJson } from './hyperedge-member.js';

export type LocalizedString = Readonly<Record<string, string>>;

export interface GenericMemberJson extends HyperedgeMemberJson {
  delimitingCharacteristic: LocalizedString | string;
}

export class GenericMember extends HyperedgeMember {
  readonly delimitingCharacteristic: LocalizedString;

  constructor(data: GenericMemberJson = { delimitingCharacteristic: {} }) {
    super(data);
    this.delimitingCharacteristic = _resolveDelimitingCharacteristic(
      data.delimitingCharacteristic,
    );
  }

  override toJSON(): GenericMemberJson {
    const base = super.toJSON() as GenericMemberJson;
    base.delimitingCharacteristic = { ...this.delimitingCharacteristic };
    return base;
  }

  static override fromJSON(data: GenericMemberJson): GenericMember {
    return new GenericMember(data);
  }
}

function _resolveDelimitingCharacteristic(
  value: LocalizedString | string | null | undefined,
): LocalizedString {
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
    const entries = Object.entries(value).filter(
      ([, v]) => typeof v === 'string' && v.length > 0,
    );
    if (entries.length === 0) {
      throw new Error(
        'GenericMember.delimitingCharacteristic must have at least one non-empty string ' +
        'value (ISO 704:2022 §5.5.4.2.1)',
      );
    }
    return Object.fromEntries(entries) as LocalizedString;
  }
  throw new Error(
    `GenericMember.delimitingCharacteristic must be a string or a language-keyed object; ` +
    `got ${typeof value}`,
  );
}

export default GenericMember;
