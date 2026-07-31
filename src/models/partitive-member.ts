// PartitiveMember — one member of a PartitiveHyperedge.
//
// Adds to HyperedgeMember the partitive-specific `is_delimiting` flag
// from ISO 704:2022 §5.5.4.2.2 (rake diagram semantics):
//
//   "Delimiting" parts (bold/3x-width line in source diagrams) behave
//   like delimiting characteristics — they distinguish the comprehensive
//   from coordinate concepts. Whether a part is delimiting depends on
//   the concept system, the coordinate concepts, the inheritance
//   principle, and the criterion of subdivision used.
//
// `is_delimiting` lives here on PartitiveMember, not on the base
// HyperedgeMember, because it is partitive-specific. GenericMember
// carries `delimitingCharacteristic` instead (the intension-difference
// value per §5.5.4.2.1, which always applies to every generic member).

import { HyperedgeMember } from './hyperedge-member.js';
import type { HyperedgeMemberJson } from './hyperedge-member.js';

export interface PartitiveMemberJson extends HyperedgeMemberJson {
  is_delimiting?: boolean;
}

export class PartitiveMember extends HyperedgeMember {
  readonly is_delimiting: boolean;

  constructor(data: PartitiveMemberJson = { ref: {} }) {
    super(data);
    this.is_delimiting = _resolveDelimiting(data.is_delimiting);
  }

  get isDelimiting(): boolean { return this.is_delimiting === true; }

  override toJSON(): PartitiveMemberJson {
    const base = super.toJSON();
    const out: PartitiveMemberJson = { ...base };
    if (this.is_delimiting) out.is_delimiting = true;
    return out;
  }

  static override fromJSON(data: PartitiveMemberJson): PartitiveMember {
    return new PartitiveMember(data);
  }
}

function _resolveDelimiting(value: boolean | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value !== 'boolean') {
    throw new Error(
      `PartitiveMember.is_delimiting must be boolean; got ${typeof value}`,
    );
  }
  return value;
}

export default PartitiveMember;
