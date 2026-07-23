// Completeness — whether a PartitiveRelation's encoded partitives
// constitute the whole comprehensive (complete) or only some of it
// (partial).
//
// ISO 704 depicts this as the rake's backline: a backline ending with
// a tooth is complete; a backline continuing without a tooth is
// partial.
//
// Renamed from the v1 `PartitiveEnumeration` (closed|open) per
// TODO.partitive-relation-v2 item 02. The semantic claim being
// expressed is completeness of the decomposition, not "enumeration"
// (which is a neutral-sounding word that doesn't convey the claim).

import { makeEnum } from './enum.js';

export const COMPLETENESS = makeEnum('COMPLETENESS', {
  COMPLETE: 'complete',
  PARTIAL: 'partial',
});

export const COMPLETENESS_VALUES = COMPLETENESS.VALUES;
export const isValidCompleteness = COMPLETENESS.isValid;

export const DEFAULT_COMPLETENESS = COMPLETENESS.COMPLETE;
