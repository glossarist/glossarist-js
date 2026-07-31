// PartitiveHyperedge — an ISO 704:2022 / ISO 1087-1 / ISO 12620
// partitive relation connecting a comprehensive concept
// (superordinate concept partitive) to two or more partitive
// concepts (subordinate concepts partitive) which fitted together
// constitute the comprehensive.
//
// Extends AbstractHyperedge; the leaf-specific concern is the
// PartitiveMember type for `members`. The wire-level field name
// stays `partitives` for v1/v2 backward compat.

import { AbstractHyperedge } from './abstract-hyperedge.js';
import type { AbstractHyperedgeJson } from './abstract-hyperedge.js';
import { PartitiveMember } from './partitive-member.js';
import type { PartitiveMemberJson } from './partitive-member.js';
import { HyperedgeRegistry } from './hyperedge-registry.js';

export interface PartitiveHyperedgeJson extends AbstractHyperedgeJson {
  members: ReadonlyArray<PartitiveMemberJson | PartitiveMember>;
  /** PartitiveHyperedge wire alias of `members`. Both emitted for
   *  backward compat with consumers that read `partitives`. */
  partitives?: ReadonlyArray<PartitiveMemberJson | PartitiveMember>;
}

export class PartitiveHyperedge extends AbstractHyperedge {
  // Per-class metadata block — the OCP contract. External systems
  // (parser, serializer, diff, RDF emitter, validators) read from
  // these statics and the HyperedgeRegistry. Adding a new hyperedge
  // type = declaring these fields on a new subclass + registering
  // it. Nothing else in the codebase changes.
  static wireKey = 'partitive_relations' as const;
  static typeTag = 'partitive_relation' as const;
  static rdfType = 'gloss:PartitiveRelation' as const;
  static memberClass = PartitiveMember;
  static v1WireKeys = ['partitive_hyperedges'];
  static kindLabel = 'PART';

  declare readonly members: ReadonlyArray<PartitiveMember>;

  constructor(data: Partial<PartitiveHyperedgeJson> = {}) {
    const memberSource = data.members ?? data.partitives;
    const normalized: AbstractHyperedgeJson = {
      comprehensive: data.comprehensive ?? {},
      members: memberSource ?? [],
      completeness: data.completeness ?? 'complete',
      criterion: data.criterion,
      sources: data.sources,
      notes: data.notes,
      status: data.status,
    };
    super(normalized);
    this.members = (Array.isArray(memberSource) ? memberSource : []).map((m) =>
      m instanceof PartitiveMember ? m : new PartitiveMember(m as PartitiveMemberJson),
    );
  }

  get partitives(): ReadonlyArray<PartitiveMember> { return this.members; }

  override toJSON(): PartitiveHyperedgeJson {
    const base = super.toJSON() as Omit<PartitiveHyperedgeJson, 'partitives'>;
    const { members, ...rest } = base;
    return { ...rest, members: members as ReadonlyArray<PartitiveMemberJson | PartitiveMember>, partitives: members };
  }

  static identityOf(
    value: {
      comprehensive?: { source?: string | null; id?: string | null } | null;
      partitives?: ReadonlyArray<{ ref?: { source?: string | null; id?: string | null } | null } | null>;
      members?: ReadonlyArray<{ ref?: { source?: string | null; id?: string | null } | null } | null>;
    } | null | undefined,
  ): string {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const source = v.partitives ?? v.members ?? [];
    const partKeys = source
      .map((p) => {
        const r = p?.ref ?? (p as { source?: string; id?: string } | null) ?? {};
        return `${r.source ?? ''}:${r.id ?? ''}`;
      })
      .sort();
    return `${c.source ?? ''}:${c.id ?? ''}|${partKeys.join('|')}`;
  }

  static override fromJSON(data: PartitiveHyperedgeJson): PartitiveHyperedge {
    return new PartitiveHyperedge(data);
  }
}

export default PartitiveHyperedge;

HyperedgeRegistry.register(PartitiveHyperedge);
