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

export const PLURALITY_MARKER = Object.freeze({
  DOUBLE: 'double',
  DASHED: 'dashed',
});

export const PLURALITY_MARKER_VALUES = Object.freeze([
  PLURALITY_MARKER.DOUBLE,
  PLURALITY_MARKER.DASHED,
]);

export function isValidPluralityMarker(value) {
  return PLURALITY_MARKER_VALUES.includes(value);
}
