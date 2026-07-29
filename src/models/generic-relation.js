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

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import { GenericMember } from './generic-member.js';
import {
  COMPLETENESS,
  DEFAULT_COMPLETENESS,
  isValidCompleteness,
} from './completeness.js';

export class GenericRelation extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.comprehensive = _ensureComprehensive(data.comprehensive);
    this.members = _ensureMembers(data.members);
    this.completeness = _resolveCompleteness(data.completeness);
    this.criterion = _normalizeCriterion(data.criterion);
    this.sources = data.sources ?? [];
    this.notes = data.notes ?? null;
    this.status = data.status ?? null;

    _assertNoSelfLoop(this.comprehensive, this.members);
  }

  get isComplete() { return this.completeness === COMPLETENESS.COMPLETE; }
  get isPartial() { return this.completeness === COMPLETENESS.PARTIAL; }
  get isCoordinate() { return this.members.length >= 2; }

  hasCriterion() { return this.criterion != null; }

  identity() {
    return GenericRelation.identityOf(this);
  }

  toJSON() {
    const obj = {
      comprehensive: this.comprehensive.toJSON(),
      members: this.members.map(m => m.toJSON()),
      completeness: this.completeness,
    };
    if (this.criterion != null) obj.criterion = { ...this.criterion };
    if (this.sources.length > 0) obj.sources = this.sources;
    if (this.notes != null) obj.notes = { ...this.notes };
    if (this.status != null) obj.status = this.status;
    return obj;
  }

  static identityOf(value) {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const memberKeys = Array.isArray(v.members)
      ? v.members.map(m => {
          const r = m?.ref ?? {};
          return `${r.source ?? ''}:${r.id ?? ''}`;
        }).sort()
      : [];
    return `${c.source ?? ''}:${c.id ?? ''}|${memberKeys.join('|')}`;
  }

  static fromJSON(data) {
    return new GenericRelation(data);
  }
}

function _ensureComprehensive(value) {
  const ref = value instanceof ConceptRef ? value : new ConceptRef(value ?? {});
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'GenericRelation.comprehensive must be a non-empty ConceptReference ' +
      '(source, id, or text required)',
    );
  }
  return ref;
}

function _ensureMembers(values) {
  if (!Array.isArray(values)) {
    throw new Error(
      `GenericRelation.members must be an array (got ${typeof values})`,
    );
  }
  if (values.length < 2) {
    throw new Error(
      `GenericRelation requires ≥2 members (ISO 704); got ${values.length}`,
    );
  }
  return values.map(v => v instanceof GenericMember ? v : new GenericMember(v));
}

function _resolveCompleteness(value) {
  const c = value ?? DEFAULT_COMPLETENESS;
  if (!isValidCompleteness(c)) {
    throw new Error(
      `GenericRelation.completeness has invalid value ${JSON.stringify(value)}`,
    );
  }
  return c;
}

function _normalizeCriterion(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    return value.length > 0 ? { default: value } : null;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => typeof v === 'string');
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }
  return null;
}

function _assertNoSelfLoop(comprehensive, members) {
  const cKey = `${comprehensive.source ?? ''}:${comprehensive.id ?? ''}`;
  for (const m of members) {
    const ref = m.ref;
    const pKey = `${ref.source ?? ''}:${ref.id ?? ''}`;
    if (pKey === cKey && (ref.source || ref.id)) {
      throw new Error(
        'GenericRelation.members cannot include the comprehensive (no self-loops)',
      );
    }
  }
}

export default GenericRelation;
