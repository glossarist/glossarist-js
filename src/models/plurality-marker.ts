// PluralityMarker — diagram notation flags from VIM concept-relationship
// diagrams. Travels with a PartitiveHyperedge so the rendering layer
// can reproduce the source diagram's notation.
//
//   double — close-set double line at the receiver end. Several
//            partitive concepts of the same type are involved.
//   dashed — broken/dashed line. Plurality is uncertain.
//
// Orthogonal to PartitiveEnumeration — both may be set on the same
// hyperedge.

export type PluralityMarker = 'double' | 'dashed';

export const PLURALITY_MARKER: Readonly<
  Record<'DOUBLE' | 'DASHED', PluralityMarker>
> = Object.freeze({
  DOUBLE: 'double',
  DASHED: 'dashed',
});

export const PLURALITY_MARKER_VALUES: ReadonlyArray<PluralityMarker> =
  Object.freeze([PLURALITY_MARKER.DOUBLE, PLURALITY_MARKER.DASHED]);

export function isValidPluralityMarker(
  value: unknown,
): value is PluralityMarker {
  return (
    typeof value === 'string' &&
    (PLURALITY_MARKER_VALUES as readonly string[]).includes(value)
  );
}
