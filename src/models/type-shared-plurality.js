// TypeSharedPlurality — semantic claims encoded by ISO 704's
// close-set double line and broken line notation, promoted from
// diagram-notation flags to structured data.
//
//   is_shared    — ISO 704 close-set double line. True when several
//                  partitives of a given type are involved.
//   is_uncertain — ISO 704 broken line. True when the type-shared
//                  plurality is uncertain (asserted to exist but its
//                  boundaries are not firmly established).
//                  Defaults to false when omitted.
//   shared_type  — Glossarist extension. The type the partitives
//                  share, when known. ISO notation does not encode
//                  this; left for the reader to infer. Optional even
//                  when is_shared is true.
//
// A PartitiveRelation has at most one TypeSharedPlurality block.
// Absent means: no type-shared plurality claim is being made.
//
// Replaces the v1 `markers: [double, dashed]` field per
// TODO.partitive-relation-v2 item 03.

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';

export class TypeSharedPlurality extends GlossaristModel {
  constructor(data = {}) {
    super();
    if (typeof data.isShared !== 'boolean' && typeof data.is_shared !== 'boolean') {
      throw new Error(
        'TypeSharedPlurality requires isShared (boolean); got: ' +
        `${JSON.stringify(data.isShared ?? data.is_shared)}`,
      );
    }
    this.isShared = data.isShared ?? data.is_shared;
    this.isUncertain = data.isUncertain ?? data.is_uncertain ?? false;
    this.sharedType = data.sharedType
      ? (data.sharedType instanceof ConceptRef ? data.sharedType : new ConceptRef(data.sharedType))
      : null;

    _validate(this);
  }

  hasSharedType() {
    return this.sharedType != null;
  }

  toJSON() {
    const obj = { is_shared: this.isShared };
    if (this.isUncertain) obj.is_uncertain = this.isUncertain;
    if (this.sharedType != null) obj.shared_type = this.sharedType.toJSON();
    return obj;
  }

  static fromJSON(data) {
    return new TypeSharedPlurality(data);
  }
}

function _validate(plurality) {
  if (typeof plurality.isShared !== 'boolean') {
    throw new Error('TypeSharedPlurality.isShared must be boolean');
  }
  if (typeof plurality.isUncertain !== 'boolean') {
    throw new Error('TypeSharedPlurality.isUncertain must be boolean');
  }
  // ISO 704 semantic check: a broken line qualifies the close-set
  // double-line plurality claim. is_uncertain without is_shared is
  // semantically odd. The model accepts it (data is data); the
  // PartitiveRelationCoherenceRule surfaces it as a warning so
  // reviewers can decide whether the data shape is intentional.
}
