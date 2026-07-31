// SequentialMember — one member of a SequentialHyperedge. Inherits
// the MECE shape from HyperedgeMember. Distinct leaf class for type
// safety. Member array order IS significant for sequential hyperedges.

import { HyperedgeMember } from './hyperedge-member.js';
import type { HyperedgeMemberJson } from './hyperedge-member.js';

export type SequentialMemberJson = HyperedgeMemberJson;

export class SequentialMember extends HyperedgeMember {
  static override fromJSON(data: SequentialMemberJson): SequentialMember {
    return new SequentialMember(data);
  }
}

export default SequentialMember;
