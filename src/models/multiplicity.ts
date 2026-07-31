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

import type { PartitivePresence } from './partitive-presence.js';
import type { PartitiveCount } from './partitive-count.js';

export type MultiplicityName =
  | 'compulsory'
  | 'optional'
  | 'compulsory_multiple'
  | 'optional_multiple'
  | 'compulsory_at_least_one';

const NAME_BY_PAIR: Readonly<Record<string, MultiplicityName>> = Object.freeze({
  'required:exactly_one': 'compulsory',
  'optional:exactly_one': 'optional',
  'required:multiple': 'compulsory_multiple',
  'optional:multiple': 'optional_multiple',
  'required:at_least_one': 'compulsory_at_least_one',
});

const PAIR_BY_NAME: Readonly<Record<MultiplicityName, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(NAME_BY_PAIR).map(([pair, name]) => [name, pair]),
  ) as Record<MultiplicityName, string>,
);

export const MULTIPLICITY: Readonly<Record<Uppercase<MultiplicityName>, MultiplicityName>> =
  Object.freeze(
    Object.fromEntries(
      Object.values(NAME_BY_PAIR).map((name) => [name.toUpperCase(), name]),
    ),
  ) as Readonly<Record<Uppercase<MultiplicityName>, MultiplicityName>>;

export const MULTIPLICITY_VALUES: ReadonlyArray<MultiplicityName> = Object.freeze(
  Object.values(NAME_BY_PAIR),
);

export const DEFAULT_MULTIPLICITY: MultiplicityName = MULTIPLICITY.COMPULSORY;

export function multiplicityFromPair(
  presence: PartitivePresence,
  count: PartitiveCount,
): MultiplicityName {
  const name = NAME_BY_PAIR[`${presence}:${count}`];
  if (name == null) {
    throw invalidCombinationError(presence, count);
  }
  return name;
}

/**
 * Canonical error for the invalid (presence, count) combination.
 * Single source of truth — hyperedge-member.ts delegates to this so
 * the error string doesn't drift across the two files.
 */
export function invalidCombinationError(
  presence: unknown,
  count: unknown,
): Error {
  return new Error(
    `Invalid multiplicity combination: presence=${presence}, count=${count}. ` +
    `(optional + at_least_one collapses to optional + multiple — use count=multiple.)`,
  );
}

export function pairFromMultiplicity(
  name: MultiplicityName,
): { presence: PartitivePresence; count: PartitiveCount } {
  const pair = PAIR_BY_NAME[name];
  if (pair == null) {
    throw new Error(`Unknown multiplicity: ${JSON.stringify(name)}`);
  }
  const [presence, count] = pair.split(':') as [PartitivePresence, PartitiveCount];
  return { presence, count };
}

export function isValidMultiplicity(name: unknown): name is MultiplicityName {
  return (
    typeof name === 'string' &&
    Object.prototype.hasOwnProperty.call(PAIR_BY_NAME, name)
  );
}

interface MemberWithMultiplicity {
  presence?: PartitivePresence;
  count?: PartitiveCount;
  multiplicity?: string;
}

/**
 * Resolve the ISO 704 multiplicity name from any object carrying
 * `presence` + `count`, OR a legacy object that still has a literal
 * `multiplicity` field (pre-v4 JSON).
 *
 * For v4 `PartitiveMember` instances, `presence` + `count` are always
 * set (defaults applied at construction), so the legacy branch never
 * fires on a real instance — it exists purely to round-trip raw JSON
 * that bypassed the model constructor.
 *
 * Throws on the invalid `(optional, at_least_one)` combination — the
 * model already rejects this at construction, so reaching the throw
 * here means the caller bypassed the model. Let the error propagate
 * rather than silently returning 'compulsory' (which would mask the
 * data corruption).
 */
export function resolveMultiplicity(
  member: MemberWithMultiplicity | null | undefined,
): MultiplicityName | string {
  if (member?.presence && member?.count) {
    return multiplicityFromPair(member.presence, member.count);
  }
  if (typeof member?.multiplicity === 'string') {
    return member.multiplicity;
  }
  return DEFAULT_MULTIPLICITY;
}
