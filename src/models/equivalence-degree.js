// EquivalenceDegree — ISO 704:2022 §7.7.3 cross-language equivalence.
//
//   full        — equivalent intension across languages (default)
//   partial     — overlapping but not identical intension
//   none        — no corresponding concept in this language
//   directional — monodirectional equivalence (see equivalence_note)

export const EQUIVALENCE_DEGREE = Object.freeze({
  FULL: 'full',
  PARTIAL: 'partial',
  NONE: 'none',
  DIRECTIONAL: 'directional',
});

export const EQUIVALENCE_DEGREE_VALUES = Object.freeze(
  Object.values(EQUIVALENCE_DEGREE),
);

export const DEFAULT_EQUIVALENCE_DEGREE = EQUIVALENCE_DEGREE.FULL;

export function isValidEquivalenceDegree(value) {
  return EQUIVALENCE_DEGREE_VALUES.includes(value);
}

export default EQUIVALENCE_DEGREE;
