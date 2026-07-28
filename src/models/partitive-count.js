// PartitiveCount — ISO 704:2022 partitive member count.
//
// count (line count):
//   exactly_one  — 1 line (exactly one instance)
//   at_least_one — 1 solid + 1 dashed (at least one instance)
//   multiple     — 2 lines (multiple instances)
//
// Default: exactly_one.

import { makeEnum } from './enum.js';

export const PARTITIVE_COUNT = makeEnum('PARTITIVE_COUNT', {
  EXACTLY_ONE: 'exactly_one',
  AT_LEAST_ONE: 'at_least_one',
  MULTIPLE: 'multiple',
});

export const PARTITIVE_COUNT_VALUES = PARTITIVE_COUNT.VALUES;
export const DEFAULT_COUNT = PARTITIVE_COUNT.EXACTLY_ONE;
export const isValidCount = PARTITIVE_COUNT.isValid;
