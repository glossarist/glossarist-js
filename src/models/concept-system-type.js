// ConceptSystemType — ISO 12620 A.7.1 concept system type enum.
//
// Permissible instances per ISO 12620:
//   generic     — species are part of the extension of the genus
//   partitive   — based on whole-part relations
//   sequential  — based on spatial and temporal relations
//   associative — based on thematic or pragmatic relations
//   mixed       — two or more of the above (the realistic case)

export const CONCEPT_SYSTEM_TYPE = Object.freeze({
  GENERIC: 'generic',
  PARTITIVE: 'partitive',
  SEQUENTIAL: 'sequential',
  ASSOCIATIVE: 'associative',
  MIXED: 'mixed',
});

export const CONCEPT_SYSTEM_TYPE_VALUES = Object.freeze(
  Object.values(CONCEPT_SYSTEM_TYPE),
);

export function isValidConceptSystemType(value) {
  return CONCEPT_SYSTEM_TYPE_VALUES.includes(value);
}

export default CONCEPT_SYSTEM_TYPE;
