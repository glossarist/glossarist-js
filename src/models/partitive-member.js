// PartitiveMember — one member of a PartitiveRelation.
//
// Carries a ConceptRef (the subordinate concept partitive) plus
// ISO 704:2022 presence + count (MECE multiplicity) and is_delimiting.

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  PARTITIVE_PRESENCE,
  DEFAULT_PRESENCE,
  PARTITIVE_PRESENCE_VALUES,
  isValidPresence,
} from './partitive-presence.js';
import {
  PARTITIVE_COUNT,
  DEFAULT_COUNT,
  PARTITIVE_COUNT_VALUES,
  isValidCount,
} from './partitive-count.js';

export class PartitiveMember extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.ref = data.ref instanceof ConceptRef
      ? data.ref
      : new ConceptRef(data.ref ?? {});
    this.presence = _resolvePresence(data.presence);
    this.count = _resolveCount(data.count);
    this.is_delimiting = data.is_delimiting === true;

    _assertNonEmptyRef(this.ref);
    _assertValidCombination(this.presence, this.count);
  }

  get isRequired() { return this.presence === PARTITIVE_PRESENCE.REQUIRED; }
  get isOptional() { return this.presence === PARTITIVE_PRESENCE.OPTIONAL; }
  get isDelimiting() { return this.is_delimiting === true; }

  // Derived ISO 704 name for display.
  get iso704Name() {
    const key = `${this.presence}+${this.count}`;
    return ISO704_NAMES[key] ?? 'unknown';
  }

  identity() {
    return PartitiveMember.identityOf(this);
  }

  toJSON() {
    const obj = { ref: this.ref.toJSON() };
    if (this.presence !== DEFAULT_PRESENCE) obj.presence = this.presence;
    if (this.count !== DEFAULT_COUNT) obj.count = this.count;
    if (this.is_delimiting === true) obj.is_delimiting = true;
    return obj;
  }

  static identityOf(value) {
    const v = value ?? {};
    const ref = v.ref ?? {};
    return `${ref.source ?? ''}:${ref.id ?? ''}`;
  }

  static fromJSON(data) {
    return new PartitiveMember(data);
  }
}

const ISO704_NAMES = {
  'required+exactly_one': 'compulsory',
  'optional+exactly_one': 'optional',
  'required+multiple': 'compulsory_multiple',
  'optional+multiple': 'optional_multiple',
  'required+at_least_one': 'compulsory_at_least_one',
};

function _resolvePresence(value) {
  if (value == null) return DEFAULT_PRESENCE;
  if (!isValidPresence(value)) {
    throw new Error(`invalid presence ${JSON.stringify(value)}; must be one of ${PARTITIVE_PRESENCE_VALUES.join(', ')}`);
  }
  return value;
}

function _resolveCount(value) {
  if (value == null) return DEFAULT_COUNT;
  if (!isValidCount(value)) {
    throw new Error(`invalid count ${JSON.stringify(value)}; must be one of ${PARTITIVE_COUNT_VALUES.join(', ')}`);
  }
  return value;
}

function _assertNonEmptyRef(ref) {
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error('PartitiveMember#ref must be a non-empty ConceptRef (source, id, or text required)');
  }
}

function _assertValidCombination(presence, count) {
  if (presence === 'optional' && count === 'at_least_one') {
    throw new Error(
      'PartitiveMember presence=optional + count=at_least_one is invalid — ' +
      'it collapses to optional + multiple (zero or more). ' +
      'Use presence: optional, count: multiple instead.',
    );
  }
}
