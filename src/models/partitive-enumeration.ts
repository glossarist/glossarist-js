// PartitiveEnumeration — allowed values for PartitiveHyperedge#enumeration.
//
//   closed — the encoded parts are ALL the parts of the comprehensive.
//            Adding or removing a part would change the relationship.
//   open   — the encoded parts are SOME of the parts; others may exist
//            but are not encoded.

export type PartitiveEnumeration = 'closed' | 'open';

export const PARTITIVE_ENUMERATION: Readonly<
  Record<'CLOSED' | 'OPEN', PartitiveEnumeration>
> = Object.freeze({
  CLOSED: 'closed',
  OPEN: 'open',
});

export const PARTITIVE_ENUMERATION_VALUES: ReadonlyArray<PartitiveEnumeration> =
  Object.freeze([PARTITIVE_ENUMERATION.CLOSED, PARTITIVE_ENUMERATION.OPEN]);

export function isValidPartitiveEnumeration(
  value: unknown,
): value is PartitiveEnumeration {
  return (
    typeof value === 'string' &&
    (PARTITIVE_ENUMERATION_VALUES as readonly string[]).includes(value)
  );
}
