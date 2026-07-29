// GenericMember — one member of a GenericHyperedge. Inherits the
// ISO 704:2022 MECE shape from HyperedgeMember. Declared as a
// distinct leaf class for type safety and to leave room for
// generic-specific extensions.
//
// See docs/design/abstract-nary-relation.md and
// docs/design/generic-relation.md (concept-model repo).

import { HyperedgeMember } from './hyperedge-member.js';

export class GenericMember extends HyperedgeMember {
  // Inherits all attributes and validations from HyperedgeMember.
}

export default GenericMember;
