// GenericRelation — an ISO 704 / ISO 1087-1 / ISO 12620 generic
// relation connecting a comprehensive concept (the genus) to two
// or more specific concepts (the species) which together constitute
// a decomposition by some criterion of subdivision.
//
// Mirror of PartitiveRelation. Multiple GenericRelations on the same
// comprehensive distinguished by `criterion` is the OIML pattern
// (5.1 measurement standard has 6 criterion groups).
//
// See docs/design/generic-relation.md (concept-model repo).

import { AbstractNaryRelation } from './abstract-nary-relation.js';
import { GenericMember } from './generic-member.js';

export class GenericRelation extends AbstractNaryRelation {
  constructor(data = {}) {
    super(data);
    this.members = data?.members == null
      ? this.members
      : (Array.isArray(data.members)
          ? data.members.map(m =>
              m instanceof GenericMember ? m : new GenericMember(m))
          : this.members);
  }

  static identityOf(value) {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const memberKeys = Array.isArray(v.members)
      ? v.members.map(m => {
          const r = m?.ref ?? m ?? {};
          return `${r.source ?? ''}:${r.id ?? ''}`;
        }).sort()
      : [];
    return `${c.source ?? ''}:${c.id ?? ''}|${memberKeys.join('|')}`;
  }

  static fromJSON(data) {
    return new GenericRelation(data);
  }
}

export default GenericRelation;
