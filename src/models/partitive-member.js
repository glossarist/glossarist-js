// PartitiveMember — one member of a PartitiveRelation.
//
// A partitive member carries a ConceptRef (the subordinate concept
// partitive) and optional certainty metadata. A PartitiveMember with
// no certainty field is implicitly confirmed.
//
// Glossarist extension beyond ISO 704: ISO notation expresses
// plurality-level uncertainty (broken line); per-member certainty
// lets a relation assert "member b is confirmed, member d is possible"
// at the member level.

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  MEMBER_CERTAINTY,
  DEFAULT_MEMBER_CERTAINTY,
  isValidMemberCertainty,
} from './member-certainty.js';

export class PartitiveMember extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.ref = data.ref instanceof ConceptRef
      ? data.ref
      : new ConceptRef(data.ref ?? {});
    this.certainty = _resolveCertainty(data.certainty);

    _assertNonEmptyRef(this.ref);
  }

  get isConfirmed() {
    return this.certainty === MEMBER_CERTAINTY.CONFIRMED;
  }

  get isPossible() {
    return this.certainty === MEMBER_CERTAINTY.POSSIBLE;
  }

  identity() {
    return PartitiveMember.identityOf(this);
  }

  toJSON() {
    const obj = { ref: this.ref.toJSON() };
    if (this.certainty !== DEFAULT_MEMBER_CERTAINTY) {
      obj.certainty = this.certainty;
    }
    return obj;
  }

  static identityOf(value) {
    const v = value ?? {};
    const ref = v.ref ?? {};
    return `${ref.source ?? ''}|${ref.id ?? ''}|${v.certainty ?? DEFAULT_MEMBER_CERTAINTY}`;
  }

  static fromJSON(data) {
    return new PartitiveMember(data);
  }
}

function _resolveCertainty(value) {
  const cert = value ?? DEFAULT_MEMBER_CERTAINTY;
  if (!isValidMemberCertainty(cert)) {
    throw new Error(
      `PartitiveMember.certainty has invalid value ${JSON.stringify(value)}; ` +
      `must be one of: ${MEMBER_CERTAINTY.VALUES.join(', ')}`,
    );
  }
  return cert;
}

function _assertNonEmptyRef(ref) {
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'PartitiveMember.ref must be non-empty (source, id, or text required)',
    );
  }
}
