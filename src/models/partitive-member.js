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
//
// Matches concept-model/models/concepts/PartitiveMember.lutaml exactly:
//   +ref            — ConceptRef [1]
//   +presence       — PartitivePresence [0..1] (default: required)
//   +count          — PartitiveCount [0..1] (default: exactly_one)
//   +is_delimiting  — Boolean [0..1] (default: false)
//
// The combination (optional, at_least_one) is invalid: if a part is
// optional, the at-least-one constraint is vacuous and collapses to
// (optional, multiple). Rejected at construction by HyperedgeMember's
// delegate to multiplicityFromPair.

import { HyperedgeMember } from './hyperedge-member.js';

export class PartitiveMember extends HyperedgeMember {
  constructor(data = {}) {
    super(data);
    this.is_delimiting = _resolveDelimiting(data.is_delimiting);
  }

  get isDelimiting() { return this.is_delimiting === true; }

  toJSON() {
    const base = super.toJSON();
    if (this.is_delimiting) base.is_delimiting = true;
    return base;
  }
}

function _resolveDelimiting(value) {
  if (value == null) return false;
  if (typeof value !== 'boolean') {
    throw new Error(
      `PartitiveMember.is_delimiting must be boolean; got ${typeof value}`,
    );
  }
  return value;
}

export default PartitiveMember;
