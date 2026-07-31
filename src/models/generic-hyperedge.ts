// GenericHyperedge — an ISO 704 / ISO 1087-1 / ISO 12620 generic
// relation connecting a comprehensive concept (the genus) to two
// or more specific concepts (the species) which together constitute
// a decomposition by some criterion of subdivision.
//
// Mirror of PartitiveHyperedge. Multiple GenericRelations on the same
// comprehensive distinguished by `criterion` is the OIML pattern
// (5.1 measurement standard has 6 criterion groups).
//
// See docs/design/generic-relation.md (concept-model repo).

import { AbstractHyperedge } from './abstract-hyperedge.js';
import type { AbstractHyperedgeJson } from './abstract-hyperedge.js';
import { GenericMember } from './generic-member.js';
import type { GenericMemberJson } from './generic-member.js';
import { HyperedgeRegistry } from './hyperedge-registry.js';

export interface GenericHyperedgeJson extends AbstractHyperedgeJson {
  members: ReadonlyArray<GenericMemberJson | GenericMember>;
}

export class GenericHyperedge extends AbstractHyperedge {
  // Per-class metadata block — the OCP contract.
  static wireKey = 'generic_relations' as const;
  static typeTag = 'generic_relation' as const;
  static rdfType = 'gloss:GenericRelation' as const;
  static memberClass = GenericMember;
  static v1WireKeys: ReadonlyArray<string> = [];
  static kindLabel = 'GEN';

  declare readonly members: ReadonlyArray<GenericMember>;

  constructor(data: Partial<GenericHyperedgeJson> = {}) {
    super({
      comprehensive: data.comprehensive ?? {},
      members: data.members ?? [],
      completeness: data.completeness ?? 'complete',
      criterion: data.criterion,
      sources: data.sources,
      notes: data.notes,
      status: data.status,
    });
    this.members = (Array.isArray(data.members) ? data.members : []).map((m) =>
      m instanceof GenericMember ? m : new GenericMember(m as GenericMemberJson),
    );
  }

  static identityOf(
    value: {
      comprehensive?: { source?: string | null; id?: string | null } | null;
      members?: ReadonlyArray<{ ref?: { source?: string | null; id?: string | null } | null } | null>;
    } | null | undefined,
  ): string {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const memberKeys = (v.members ?? [])
      .map((m) => {
        const r = m?.ref ?? (m as { source?: string; id?: string } | null) ?? {};
        return `${r.source ?? ''}:${r.id ?? ''}`;
      })
      .sort();
    return `${c.source ?? ''}:${c.id ?? ''}|${memberKeys.join('|')}`;
  }

  static override fromJSON(data: GenericHyperedgeJson): GenericHyperedge {
    return new GenericHyperedge(data);
  }
}

export default GenericHyperedge;

HyperedgeRegistry.register(GenericHyperedge);
