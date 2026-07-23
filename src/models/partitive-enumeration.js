// PartitiveEnumeration — allowed values for PartitiveHyperedge#enumeration.
//
//   closed — the encoded parts are ALL the parts of the comprehensive.
//            Adding or removing a part would change the relationship.
//   open   — the encoded parts are SOME of the parts; others may exist
//            but are not encoded.
//
// See concept-model/TODO.hyperedge/00-design-overview.md for the design
// rationale and the open/closed distinction.

export const PARTITIVE_ENUMERATION = Object.freeze({
  CLOSED: 'closed',
  OPEN: 'open',
});

export const PARTITIVE_ENUMERATION_VALUES = Object.freeze([
  PARTITIVE_ENUMERATION.CLOSED,
  PARTITIVE_ENUMERATION.OPEN,
]);

export function isValidPartitiveEnumeration(value) {
  return PARTITIVE_ENUMERATION_VALUES.includes(value);
}
