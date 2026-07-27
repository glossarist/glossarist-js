// Multiplicity — ISO 704:2022 partitive member multiplicity.
//
// Encodes the diagram line notation as structured data:
//   compulsory          — 1 solid line (must exist in every instance)
//   optional            — 1 dashed line (exists in some instances only)
//   compulsory_multiple — 2 solid lines (multiple must exist)
//   optional_multiple   — 2 dashed lines (multiple may exist)
//   compulsory_at_least_one        — 1 solid + 1 dashed line (at least one must exist)
//
// Defaults to `compulsory` when omitted.

import { makeEnum } from './enum.js';

export const MULTIPLICITY = makeEnum('MULTIPLICITY', {
  COMPULSORY: 'compulsory',
  OPTIONAL: 'optional',
  COMPULSORY_MULTIPLE: 'compulsory_multiple',
  OPTIONAL_MULTIPLE: 'optional_multiple',
  COMPULSORY_AT_LEAST_ONE: 'compulsory_at_least_one',
});

export const MULTIPLICITY_VALUES = MULTIPLICITY.VALUES;
export const DEFAULT_MULTIPLICITY = MULTIPLICITY.COMPULSORY;
export const isValidMultiplicity = MULTIPLICITY.isValid;
