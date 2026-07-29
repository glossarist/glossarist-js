// GenericMember — one member of a GenericRelation. Inherits the
// ISO 704:2022 MECE shape from ConceptSystemMember. Declared as a
// distinct leaf class for type safety and to leave room for
// generic-specific extensions.
//
// See docs/design/abstract-nary-relation.md and
// docs/design/generic-relation.md (concept-model repo).

import { ConceptSystemMember } from './concept-system-member.js';

export class GenericMember extends ConceptSystemMember {
  // Inherits all attributes and validations.
}

export default GenericMember;
