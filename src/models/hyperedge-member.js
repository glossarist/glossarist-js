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
import {
  PARTITIVE_PRESENCE,
  PARTITIVE_PRESENCE_VALUES,
  DEFAULT_PRESENCE,
  isValidPresence,
} from './partitive-presence.js';
import {
  PARTITIVE_COUNT_VALUES,
  DEFAULT_COUNT,
  isValidCount,
} from './partitive-count.js';
import { multiplicityFromPair } from './multiplicity.js';

export class HyperedgeMember extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.ref = _ensureRef(data.ref);
    this.presence = _resolvePresence(data.presence);
    this.count = _resolveCount(data.count);

    _assertValidPair(this.presence, this.count);
  }

  get isRequired() { return this.presence === PARTITIVE_PRESENCE.REQUIRED; }
  get isOptional() { return this.presence === PARTITIVE_PRESENCE.OPTIONAL; }

  identity() {
    return HyperedgeMember.identityOf(this);
  }

  toJSON() {
    const obj = { ref: this.ref.toJSON() };
    if (this.presence !== DEFAULT_PRESENCE) obj.presence = this.presence;
    if (this.count !== DEFAULT_COUNT) obj.count = this.count;
    return obj;
  }

  static identityOf(value) {
    const v = value ?? {};
    const ref = v.ref ?? {};
    return `${ref.source ?? ''}:${ref.id ?? ''}`;
  }

  static fromJSON(data) {
    return new HyperedgeMember(data);
  }
}

function _ensureRef(value) {
  const ref = value instanceof ConceptRef ? value : new ConceptRef(value ?? {});
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'HyperedgeMember.ref must be a non-empty ConceptRef ' +
      '(source, id, or text required)',
    );
  }
  return ref;
}

function _resolvePresence(value) {
  const p = value ?? DEFAULT_PRESENCE;
  if (!isValidPresence(p)) {
    throw new Error(
      `invalid presence ${JSON.stringify(value)}; ` +
      `must be one of: ${PARTITIVE_PRESENCE_VALUES.join(', ')}`,
    );
  }
  return p;
}

function _resolveCount(value) {
  const c = value ?? DEFAULT_COUNT;
  if (!isValidCount(c)) {
    throw new Error(
      `invalid count ${JSON.stringify(value)}; ` +
      `must be one of: ${PARTITIVE_COUNT_VALUES.join(', ')}`,
    );
  }
  return c;
}

function _assertValidPair(presence, count) {
  // Delegate to the multiplicity SSOT. The canonical error string
  // lives in one place: multiplicity.js. Calling multiplicityFromPair
  // throws on the invalid combination; we don't need to duplicate the
  // error message here.
  multiplicityFromPair(presence, count);
}
