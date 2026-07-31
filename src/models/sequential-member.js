// SequentialMember — one member of a SequentialHyperedge. Inherits
// the MECE shape from HyperedgeMember. Distinct leaf class for type
// safety. Member array order IS significant for sequential hyperedges.
//
// See docs/design/abstract-nary-relation.md (concept-model repo).

import { HyperedgeMember } from './hyperedge-member.js';

export class SequentialMember extends HyperedgeMember {
  // Inherits all attributes and validations from HyperedgeMember.
}

export default SequentialMember;
