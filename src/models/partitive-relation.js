// PartitiveRelation — an ISO 704:2022 / ISO 1087-1 / ISO 12620
// partitive relation connecting a comprehensive concept
// (superordinate concept partitive) to two or more partitive
// concepts (subordinate concepts partitive) which fitted together
// constitute the comprehensive.
//
// Extends AbstractNaryRelation; the leaf-specific concern is the
// PartitiveMember type for `members`. The wire-level field name
// stays `partitives` for v1/v2 backward compat.
//
// ISO 704:2022 rake diagram semantics:
//
//   comprehensive concept
//   ─────────────────────
//   │ partitive (one or more) with per-member multiplicity + optional delimiting
//   ─────────────────────
//
// All partitives within one relation are coordinate concepts
// (ISO 12620): they share the comprehensive AND share the
// criterion of subdivision.
//
// "Delimiting" parts (bold/3x-width line in source diagrams) behave
// like delimiting characteristics — they distinguish the comprehensive
// from coordinate concepts. Whether a part is delimiting depends on
// the concept system, the coordinate concepts, the inheritance
// principle, and the criterion of subdivision used
// (ISO 704:2022 §5.5.4.2.1).
//
// Distinguished from binary `has_part` / `is_part_of` edges, which
// express pairwise part-of assertions without completeness,
// multiplicity, or criterion claims. A single partitive should be
// expressed as a binary edge, not a PartitiveRelation (ISO requires
// "two or more").

import { AbstractNaryRelation } from './abstract-nary-relation.js';
import { PartitiveMember } from './partitive-member.js';

export class PartitiveRelation extends AbstractNaryRelation {
  constructor(data = {}) {
    const members = data?.members ?? data?.partitives;
    super({ ...data, members });
    this.members = members == null
      ? this.members
      : (Array.isArray(members)
          ? members.map(m =>
              m instanceof PartitiveMember ? m : new PartitiveMember(m))
          : this.members);
  }

  get partitives() { return this.members; }

  toJSON() {
    const base = super.toJSON();
    const { members, ...rest } = base;
    return { ...rest, partitives: members };
  }

  static identityOf(value) {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const partKeys = Array.isArray(v.partitives ?? v.members)
      ? (v.partitives ?? v.members).map(p => {
          const r = p?.ref ?? p ?? {};
          return `${r.source ?? ''}:${r.id ?? ''}`;
        }).sort()
      : [];
    return `${c.source ?? ''}:${c.id ?? ''}|${partKeys.join('|')}`;
  }

  static fromJSON(data) {
    const normalized = { ...(data ?? {}), members: data?.partitives ?? data?.members };
    return new PartitiveRelation(normalized);
  }
}

export default PartitiveRelation;
