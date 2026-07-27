// PartitiveMember — one member of a PartitiveRelation.
//
// Carries a ConceptRef (the subordinate concept partitive) plus
// ISO 704:2022 multiplicity and delimiting metadata.
//
// ISO 704:2022 partitive member notation:
//
//   multiplicity (diagram line notation):
//     compulsory          — 1 solid line (must exist in every instance)
//     optional            — 1 dashed line (exists in some instances only)
//     compulsory_multiple — 2 solid lines (multiple must exist)
//     optional_multiple   — 2 dashed lines (multiple may exist)
//     compulsory_at_least_one        — 1 solid + 1 dashed line (≥1 must exist)
//
//   is_delimiting (orthogonal, bold 3x-width line in diagram):
//     A delimiting part behaves like a delimiting characteristic:
//     it distinguishes the comprehensive from coordinate concepts.

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  MULTIPLICITY,
  DEFAULT_MULTIPLICITY,
  MULTIPLICITY_VALUES,
  isValidMultiplicity,
} from './multiplicity.js';

export class PartitiveMember extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.ref = data.ref instanceof ConceptRef
      ? data.ref
      : new ConceptRef(data.ref ?? {});
    this.multiplicity = _resolveMultiplicity(data.multiplicity);
    this.is_delimiting = data.is_delimiting === true;

    _assertNonEmptyRef(this.ref);
  }

  get isCompulsory() {
    return this.multiplicity === MULTIPLICITY.COMPULSORY;
  }

  get isOptional() {
    return this.multiplicity === MULTIPLICITY.OPTIONAL;
  }

  get isDelimiting() {
    return this.is_delimiting === true;
  }

  identity() {
    return PartitiveMember.identityOf(this);
  }

  toJSON() {
    const obj = { ref: this.ref.toJSON() };
    if (this.multiplicity !== DEFAULT_MULTIPLICITY) {
      obj.multiplicity = this.multiplicity;
    }
    if (this.is_delimiting === true) {
      obj.is_delimiting = true;
    }
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

function _resolveMultiplicity(value) {
  if (value == null) return DEFAULT_MULTIPLICITY;
  if (!isValidMultiplicity(value)) {
    throw new Error(
      `invalid multiplicity ${JSON.stringify(value)}; ` +
      `must be one of ${MULTIPLICITY_VALUES.join(', ')}`,
    );
  }
  return value;
}

function _assertNonEmptyRef(ref) {
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'PartitiveMember#ref must be a non-empty ConceptRef ' +
      '(source, id, or text required)',
    );
  }
}
