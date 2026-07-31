// SequentialHyperedge — an ISO 12620 A.6.3 / ISO 704:2022 §5.5.5
// sequential relation connecting a comprehensive concept to two or
// more subordinate concepts in an ORDERED sequence (temporal,
// spatial, causal, developmental).
//
// Mirror of PartitiveHyperedge and GenericHyperedge. Member array
// order IS significant — reversing the array reverses the sequence.
// Use cases: manufacturing process steps, biological life cycles,
// software release lifecycles, supply chain stages, geological eras.
//
// See docs/design/abstract-nary-relation.md (concept-model repo).

import { AbstractHyperedge } from './abstract-hyperedge.js';
import { SequentialMember } from './sequential-member.js';
import { HyperedgeRegistry } from './hyperedge-registry.js';

export class SequentialHyperedge extends AbstractHyperedge {
  // Per-class metadata block — the OCP contract.
  static wireKey     = 'sequential_relations';
  static typeTag     = 'sequential_relation';
  static rdfType     = 'gloss:SequentialRelation';
  static memberClass = SequentialMember;
  static v1WireKeys  = [];
  static kindLabel   = 'SEQ';

  constructor(data = {}) {
    super(data);
    this.members = data?.members == null
      ? this.members
      : (Array.isArray(data.members)
          ? data.members.map(m =>
              m instanceof SequentialMember ? m : new SequentialMember(m))
          : this.members);
  }

  static identityOf(value) {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    // For sequential, member order IS significant — do NOT sort.
    const memberKeys = Array.isArray(v.members)
      ? v.members.map(m => {
          const r = m?.ref ?? m ?? {};
          return `${r.source ?? ''}:${r.id ?? ''}`;
        })
      : [];
    return `${c.source ?? ''}:${c.id ?? ''}|${memberKeys.join('|')}`;
  }

  static fromJSON(data) {
    return new SequentialHyperedge(data);
  }
}

export default SequentialHyperedge;

HyperedgeRegistry.register(SequentialHyperedge);
