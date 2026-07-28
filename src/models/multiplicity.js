// Multiplicity — ISO 704:2022 partitive multiplicity (derived view).
//
// ISO 704:2022 multiplicity is the cross product of two orthogonal
// dimensions (PartitivePresence × PartitiveCount). The 5 valid
// combinations map to the 5 ISO 704 names:
//
//   required × exactly_one  → compulsory
//   optional × exactly_one  → optional
//   required × multiple     → compulsory_multiple
//   optional × multiple     → optional_multiple
//   required × at_least_one → compulsory_at_least_one
//
// (optional × at_least_one is REDUNDANT with optional × multiple —
// "may exist, ≥1 if it does" = "may exist in any number" — and is
// explicitly rejected at construction with a clear error message.)
//
// This module is the SSOT for the (presence, count) → ISO name
// mapping. Both MULTIPLICITY constants and MULTIPLICITY_VALUES are
// derived from this single table; no duplicate string literals.

import { PARTITIVE_PRESENCE } from './partitive-presence.js';
import { PARTITIVE_COUNT } from './partitive-count.js';

const NAME_BY_PAIR = Object.freeze({
  [`${PARTITIVE_PRESENCE.REQUIRED}:${PARTITIVE_COUNT.EXACTLY_ONE}`]:  'compulsory',
  [`${PARTITIVE_PRESENCE.OPTIONAL}:${PARTITIVE_COUNT.EXACTLY_ONE}`]:  'optional',
  [`${PARTITIVE_PRESENCE.REQUIRED}:${PARTITIVE_COUNT.MULTIPLE}`]:     'compulsory_multiple',
  [`${PARTITIVE_PRESENCE.OPTIONAL}:${PARTITIVE_COUNT.MULTIPLE}`]:     'optional_multiple',
  [`${PARTITIVE_PRESENCE.REQUIRED}:${PARTITIVE_COUNT.AT_LEAST_ONE}`]: 'compulsory_at_least_one',
});

const PAIR_BY_NAME = Object.freeze(
  Object.fromEntries(
    Object.entries(NAME_BY_PAIR).map(([pair, name]) => [name, pair]),
  ),
);

export const MULTIPLICITY = Object.freeze(
  Object.fromEntries(
    Object.values(NAME_BY_PAIR).map(name => [name.toUpperCase(), name]),
  ),
);

export const MULTIPLICITY_VALUES = Object.freeze(Object.values(NAME_BY_PAIR));

export const DEFAULT_MULTIPLICITY = MULTIPLICITY.COMPULSORY;

export function multiplicityFromPair(presence, count) {
  const name = NAME_BY_PAIR[`${presence}:${count}`];
  if (name == null) {
    throw invalidCombinationError(presence, count);
  }
  return name;
}

export function pairFromMultiplicity(name) {
  const pair = PAIR_BY_NAME[name];
  if (pair == null) {
    throw new Error(`Unknown multiplicity: ${JSON.stringify(name)}`);
  }
  const [presence, count] = pair.split(':');
  return { presence, count };
}

export function isValidMultiplicity(name) {
  return Object.prototype.hasOwnProperty.call(PAIR_BY_NAME, name);
}

function invalidCombinationError(presence, count) {
  return new Error(
    `Invalid multiplicity combination: presence=${presence}, count=${count}. ` +
    `(optional + at_least_one collapses to optional + multiple — use count=multiple.)`,
  );
}
