// AbstractHyperedge — shared base for directed 1→N hyperedges
// relations (PartitiveHyperedge, GenericHyperedge, future
// SequentialRelation, AssociativeRelation).
//
// Carries the common shape:
//   - comprehensive: ConceptRef
//   - members: 2+ MECE dimensioned concept refs (≥2 per ISO 704)
//   - completeness: complete | partial
//   - criterion: localized subdivision criterion (ISO 12620)
//   - sources / notes / status: administrative metadata
//
// Concrete leaves add type-specific fields if needed (currently none).
// See docs/design/abstract-hyperedge.md (concept-model repo).

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  COMPLETENESS,
  DEFAULT_COMPLETENESS,
  isValidCompleteness,
} from './completeness.js';

export class AbstractHyperedge extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.comprehensive = _ensureComprehensive(data.comprehensive);
    this.members = _ensureMembers(data.members, this.constructor.name);
    this.completeness = _resolveCompleteness(data.completeness);
    this.criterion = _normalizeCriterion(data.criterion);
    this.sources = Array.isArray(data.sources) ? [...data.sources] : [];
    this.notes = data.notes ?? null;
    this.status = data.status ?? null;

    _assertNoSelfLoop(this.comprehensive, this.members);
  }

  get isComplete() { return this.completeness === COMPLETENESS.COMPLETE; }
  get isPartial() { return this.completeness === COMPLETENESS.PARTIAL; }
  get isCoordinate() { return this.members.length >= 2; }

  hasCriterion() { return this.criterion != null; }

  identity() {
    return this.constructor.identityOf(this);
  }

  toJSON() {
    const obj = {
      comprehensive: this.comprehensive.toJSON(),
      members: this.members.map(m => m.toJSON()),
      completeness: this.completeness,
    };
    if (this.criterion != null) obj.criterion = { ...this.criterion };
    if (this.sources.length > 0) obj.sources = [...this.sources];
    if (this.notes != null) obj.notes = { ...this.notes };
    if (this.status != null) obj.status = this.status;
    return obj;
  }
}

function _ensureComprehensive(value) {
  const ref = value instanceof ConceptRef ? value : new ConceptRef(value ?? {});
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'AbstractHyperedge.comprehensive must be a non-empty ConceptReference ' +
      '(source, id, or text required)',
    );
  }
  return ref;
}

function _ensureMembers(values, typeName) {
  if (!Array.isArray(values)) {
    throw new Error(
      `${typeName}.members must be an array (got ${typeof values})`,
    );
  }
  if (values.length < 2) {
    throw new Error(
      `${typeName} requires ≥2 partitives (ISO 704); got ${values.length}`,
    );
  }
  return values;
}

function _resolveCompleteness(value) {
  const c = value ?? DEFAULT_COMPLETENESS;
  if (!isValidCompleteness(c)) {
    throw new Error(
      `${c === value ? 'completeness' : 'completeness'} has invalid value ${JSON.stringify(value)}`,
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
    const pKey = `${ref?.source ?? ''}:${ref?.id ?? ''}`;
    if (pKey === cKey && (ref?.source || ref?.id)) {
      throw new Error(
        'Relation.members cannot include the comprehensive (no self-loops)',
      );
    }
  }
}
