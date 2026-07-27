// PartitiveRelation — an ISO 704 / ISO 1087-1 / ISO 12620
// partitive relation connecting a comprehensive concept
// (superordinate concept partitive) to two or more partitive
// concepts (subordinate concepts partitive) which fitted together
// constitute the comprehensive.
//
// Field renames (v1 → v2):
//   parts [1..*]              → partitives [2..*]  (as PartitiveMember)
//   enumeration: closed|open  → completeness: complete|partial
//   content: LocalizedString  → (dropped — structural edges carry no prose)
//
// Per-member metadata (ISO 704:2022):
//   multiplicity (5 values) + is_delimiting (boolean)
//
// New field:
//   criterion: LocalizedString [0..1]  (ISO 12620 coordinate-concept coherence)
//
// Distinguished from binary `has_part` / `is_part_of` edges, which
// express pairwise part-of assertions without completeness,
// multiplicity, or criterion claims. A single partitive should be
// expressed as a binary edge, not a PartitiveRelation (ISO requires
// "two or more").

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import { PartitiveMember } from './partitive-member.js';
import {
  COMPLETENESS,
  COMPLETENESS_VALUES,
  DEFAULT_COMPLETENESS,
  isValidCompleteness,
} from './completeness.js';

export class PartitiveRelation extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.comprehensive = _ensureComprehensive(data.comprehensive);
    this.partitives = _ensurePartitives(data.partitives);
    this.completeness = _resolveCompleteness(data.completeness);
    this.criterion = _normalizeCriterion(data.criterion);

    _assertNoSelfLoop(this.comprehensive, this.partitives);
  }

  get isComplete() { return this.completeness === COMPLETENESS.COMPLETE; }
  get isPartial() { return this.completeness === COMPLETENESS.PARTIAL; }

  // ISO 12620 coordinate-concept predicate: a relation is "coordinate"
  // when it has ≥2 partitives (all partitives within one relation are
  // coordinate concepts by definition).
  get isCoordinate() { return this.partitives.length >= 2; }

  hasCriterion() { return this.criterion != null; }

  identity() {
    return PartitiveRelation.identityOf(this);
  }

  toJSON() {
    const obj = {
      comprehensive: this.comprehensive.toJSON(),
      partitives: this.partitives.map(p => p.toJSON()),
      completeness: this.completeness,
    };
    if (this.criterion != null) obj.criterion = { ...this.criterion };
    return obj;
  }

  // Stable identity for diffing: same comprehensive + same partitive
  // set (by ref identity) = same relation. Changes to completeness,
  // multiplicity, is_delimiting, or criterion produce "changed"
  // entries rather than add+remove.
  static identityOf(value) {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const partitiveKeys = Array.isArray(v.partitives)
      ? v.partitives.map(p => {
          const r = p?.ref ?? p ?? {};
          return `${r.source ?? ''}:${r.id ?? ''}`;
        }).sort()
      : [];
    return `${c.source ?? ''}:${c.id ?? ''}|${partitiveKeys.join('|')}`;
  }

  static fromJSON(data) {
    return new PartitiveRelation(data);
  }
}

function _ensureComprehensive(value) {
  const ref = value instanceof ConceptRef ? value : new ConceptRef(value ?? {});
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'PartitiveRelation.comprehensive must be a non-empty ConceptReference ' +
      '(source, id, or text required)',
    );
  }
  return ref;
}

function _ensurePartitives(values) {
  if (!Array.isArray(values)) {
    throw new Error(
      `PartitiveRelation.partitives must be an array (got ${typeof values})`,
    );
  }
  if (values.length < 2) {
    throw new Error(
      `PartitiveRelation requires ≥2 partitives (ISO 704); got ${values.length}`,
    );
  }
  return values.map(v => v instanceof PartitiveMember ? v : new PartitiveMember(v));
}

function _resolveCompleteness(value) {
  const c = value ?? DEFAULT_COMPLETENESS;
  if (!isValidCompleteness(c)) {
    throw new Error(
      `PartitiveRelation.completeness has invalid value ${JSON.stringify(value)}; ` +
      `must be one of: ${COMPLETENESS_VALUES.join(', ')}`,
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

function _assertNoSelfLoop(comprehensive, partitives) {
  const cKey = `${comprehensive.source ?? ''}:${comprehensive.id ?? ''}`;
  for (const p of partitives) {
    const ref = p.ref;
    const pKey = `${ref.source ?? ''}:${ref.id ?? ''}`;
    if (pKey === cKey && (ref.source || ref.id)) {
      throw new Error(
        'PartitiveRelation.partitives cannot include the comprehensive (no self-loops)',
      );
    }
  }
}
