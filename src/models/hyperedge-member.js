// HyperedgeMember — abstract base shape for members of any
// n-ary concept-system relation (PartitiveMember, GenericMember,
// future AssociativeMember, SequentialMember).
//
// Carries the shared ISO 704:2022 MECE dimensions: presence × count,
// plus the orthogonal is_delimiting flag.
//
// Concrete leaf classes extend this with type-specific fields if
// needed (currently none). See docs/design/abstract-nary-relation.md
// (concept-model repo).

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  PARTITIVE_PRESENCE,
  PARTITIVE_PRESENCE_VALUES,
  DEFAULT_PRESENCE,
  isValidPresence,
} from './partitive-presence.js';
import {
  PARTITIVE_COUNT,
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
    this.is_delimiting = _resolveDelimiting(data.is_delimiting);

    _assertValidPair(this.presence, this.count);
  }

  get isRequired() { return this.presence === PARTITIVE_PRESENCE.REQUIRED; }
  get isOptional() { return this.presence === PARTITIVE_PRESENCE.OPTIONAL; }
  get isDelimiting() { return this.is_delimiting === true; }

  identity() {
    return HyperedgeMember.identityOf(this);
  }

  toJSON() {
    const obj = { ref: this.ref.toJSON() };
    if (this.presence !== DEFAULT_PRESENCE) obj.presence = this.presence;
    if (this.count !== DEFAULT_COUNT) obj.count = this.count;
    if (this.is_delimiting) obj.is_delimiting = true;
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

function _resolveDelimiting(value) {
  if (value == null) return false;
  if (typeof value !== 'boolean') {
    throw new Error(
      `HyperedgeMember.is_delimiting must be boolean; got ${typeof value}`,
    );
  }
  return value;
}

function _assertValidPair(presence, count) {
  // Delegate to the multiplicity SSOT (Phase 8 of TODO.abstract-hyperedge).
  // The canonical error string lives in one place: multiplicity.js.
  // Calling multiplicityFromPair throws on the invalid combination;
  // we don't need to duplicate the error message here.
  multiplicityFromPair(presence, count);
}
