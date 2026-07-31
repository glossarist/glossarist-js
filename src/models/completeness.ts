// Completeness — whether a PartitiveHyperedge's encoded partitives
// constitute the whole comprehensive (complete) or only some of it
// (partial).
//
// ISO 704 depicts this as the rake's backline: a backline ending with
// a tooth is complete; a backline continuing without a tooth is
// partial.

import { makeEnum } from './enum.js';

export type Completeness = 'complete' | 'partial';

export const COMPLETENESS = makeEnum('COMPLETENESS', {
  COMPLETE: 'complete',
  PARTIAL: 'partial',
});

export const COMPLETENESS_VALUES = COMPLETENESS.VALUES;
export const isValidCompleteness = COMPLETENESS.isValid;

export const DEFAULT_COMPLETENESS: Completeness = COMPLETENESS.COMPLETE;
