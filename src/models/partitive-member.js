// PartitiveMember — one member of a PartitiveRelation. Inherits the
// ISO 704:2022 MECE shape from ConceptSystemMember; the `comprehensive`
// of its parent PartitiveRelation denotes the whole concept.
//
// Distinct leaf class for type safety and to leave room for
// Partitive-specific extensions.
//
// Matches concept-model/models/concepts/PartitiveMember.lutaml exactly:
//   +ref            — ConceptRef [1]
//   +presence       — PartitivePresence [0..1] (default: required)
//   +count          — PartitiveCount [0..1] (default: exactly_one)
//   +is_delimiting  — Boolean [0..1] (default: false)
//
// The combination (optional, at_least_one) is invalid: if a part is
// optional, the at-least-one constraint is vacuous and collapses to
// (optional, multiple). Rejected at construction.

import { ConceptSystemMember } from './concept-system-member.js';

export class PartitiveMember extends ConceptSystemMember {
  // Inherits all attributes and validations from ConceptSystemMember.
  // Declared as a distinct class for type safety and to leave room
  // for future partitive-specific extensions.
}

export default PartitiveMember;
