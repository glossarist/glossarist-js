// SequentialHyperedge — an ISO 12620 A.6.3 / ISO 704:2022 §5.5.5
// sequential relation connecting a comprehensive concept to two or
// more subordinate concepts in an ORDERED sequence (temporal,
// spatial, causal, developmental).
//
// Mirror of PartitiveHyperedge and GenericHyperedge. Member array
// order IS significant — reversing the array reverses the sequence.
// Use cases: manufacturing process steps, biological life cycles,
// software release lifecycles, supply chain stages, geological eras.

import { AbstractHyperedge } from './abstract-hyperedge.js';
import type { AbstractHyperedgeJson } from './abstract-hyperedge.js';
import { SequentialMember } from './sequential-member.js';
import type { SequentialMemberJson } from './sequential-member.js';
import { HyperedgeRegistry } from './hyperedge-registry.js';

export interface SequentialHyperedgeJson extends AbstractHyperedgeJson {
  members: ReadonlyArray<SequentialMemberJson | SequentialMember>;
}

export class SequentialHyperedge extends AbstractHyperedge {
  // Per-class metadata block — the OCP contract.
  static wireKey = 'sequential_relations' as const;
  static typeTag = 'sequential_relation' as const;
  static rdfType = 'gloss:SequentialRelation' as const;
  static memberClass = SequentialMember;
  static v1WireKeys: ReadonlyArray<string> = [];
  static kindLabel = 'SEQ';

  declare readonly members: ReadonlyArray<SequentialMember>;

  constructor(data: Partial<SequentialHyperedgeJson> = {}) {
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
      m instanceof SequentialMember ? m : new SequentialMember(m as SequentialMemberJson),
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
    // For sequential, member order IS significant — do NOT sort.
    const memberKeys = (v.members ?? []).map((m) => {
      const r = m?.ref ?? (m as { source?: string; id?: string } | null) ?? {};
      return `${r.source ?? ''}:${r.id ?? ''}`;
    });
    return `${c.source ?? ''}:${c.id ?? ''}|${memberKeys.join('|')}`;
  }

  static override fromJSON(data: SequentialHyperedgeJson): SequentialHyperedge {
    return new SequentialHyperedge(data);
  }
}

export default SequentialHyperedge;

HyperedgeRegistry.register(SequentialHyperedge);
