// HyperedgeMember — abstract base shape for the members of any directed
// 1→N hyperedge (PartitiveMember, GenericMember, future AssociativeMember,
// SequentialMember).
//
// Carries ONLY the dimensions shared by every hyperedge member type:
//   ref       — ConceptRef [1] (the member concept)
//   presence  — 'required' | 'optional' (default: required)
//   count     — 'exactly_one' | 'at_least_one' | 'multiple' (default: exactly_one)
//
// These three form the ISO 704:2022 MECE pair (presence × count). The
// pair is the shared invariant across all hyperedge types — that's
// why it lives on the base.
//
// Type-specific extensions live on the leaves:
//   PartitiveMember  — is_delimiting (rake-diagram semantics, ISO 704 §5.5.4.2.2)
//   GenericMember    — delimitingCharacteristic (intension difference, ISO 704 §5.5.4.2.1)
//
// See docs/design/abstract-hyperedge.md (concept-model repo).

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import type { ConceptRefJson } from './concept-ref.js';
import { PARTITIVE_PRESENCE_VALUES, DEFAULT_PRESENCE, isValidPresence } from './partitive-presence.js';
import type { PartitivePresence } from './partitive-presence.js';
import { PARTITIVE_COUNT_VALUES, DEFAULT_COUNT, isValidCount } from './partitive-count.js';
import type { PartitiveCount } from './partitive-count.js';
import { multiplicityFromPair } from './multiplicity.js';

export interface HyperedgeMemberJson {
  ref?: ConceptRefJson | ConceptRef;
  presence?: PartitivePresence;
  count?: PartitiveCount;
}

export abstract class HyperedgeMember extends GlossaristModel {
  readonly ref: ConceptRef;
  readonly presence: PartitivePresence;
  readonly count: PartitiveCount;

  constructor(data: HyperedgeMemberJson = {}) {
    super();
    this.ref = _ensureRef(data.ref);
    this.presence = _resolvePresence(data.presence);
    this.count = _resolveCount(data.count);

    _assertValidPair(this.presence, this.count);
  }

  get isRequired(): boolean { return this.presence === 'required'; }
  get isOptional(): boolean { return this.presence === 'optional'; }

  override identity(): string {
    return HyperedgeMember.identityOf(this);
  }

  override toJSON(): HyperedgeMemberJson {
    const obj: HyperedgeMemberJson = { ref: this.ref.toJSON() };
    if (this.presence !== DEFAULT_PRESENCE) obj.presence = this.presence;
    if (this.count !== DEFAULT_COUNT) obj.count = this.count;
    return obj;
  }

  static identityOf(
    value: { ref?: { source?: string | null; id?: string | null } | null } | null | undefined,
  ): string {
    const v = value ?? {};
    const ref = v.ref ?? {};
    return `${ref.source ?? ''}:${ref.id ?? ''}`;
  }

  static override fromJSON(_data: HyperedgeMemberJson): HyperedgeMember {
    // Abstract base — subclasses MUST override. The base
    // implementation is a typed marker that dispatches to the wrong
    // class would surface as a runtime error rather than silently
    // returning a mis-typed instance.
    throw new Error(
      'HyperedgeMember.fromJSON must be overridden by a subclass',
    );
  }
}

function _ensureRef(value: ConceptRefJson | ConceptRef | null | undefined): ConceptRef {
  const ref = value instanceof ConceptRef ? value : new ConceptRef(value ?? {});
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'HyperedgeMember.ref must be a non-empty ConceptRef ' +
      '(source, id, or text required)',
    );
  }
  return ref;
}

function _resolvePresence(value: PartitivePresence | null | undefined): PartitivePresence {
  const p = value ?? DEFAULT_PRESENCE;
  if (!isValidPresence(p)) {
    throw new Error(
      `invalid presence ${JSON.stringify(value)}; ` +
      `must be one of: ${PARTITIVE_PRESENCE_VALUES.join(', ')}`,
    );
  }
  return p;
}

function _resolveCount(value: PartitiveCount | null | undefined): PartitiveCount {
  const c = value ?? DEFAULT_COUNT;
  if (!isValidCount(c)) {
    throw new Error(
      `invalid count ${JSON.stringify(value)}; ` +
      `must be one of: ${PARTITIVE_COUNT_VALUES.join(', ')}`,
    );
  }
  return c;
}

function _assertValidPair(presence: PartitivePresence, count: PartitiveCount): void {
  // Delegate to the multiplicity SSOT. The canonical error string
  // lives in one place: multiplicity.ts. Calling multiplicityFromPair
  // throws on the invalid combination; we don't need to duplicate the
  // error message here.
  multiplicityFromPair(presence, count);
}
