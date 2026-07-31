// ConceptSystemType — ISO 12620 A.7.1 concept system type enum.
//
// Permissible instances per ISO 12620:
//   generic     — species are part of the extension of the genus
//   partitive   — based on whole-part relations
//   sequential  — based on spatial and temporal relations
//   associative — based on thematic or pragmatic relations
//   mixed       — two or more of the above (the realistic case)

export type ConceptSystemType =
  | 'generic'
  | 'partitive'
  | 'sequential'
  | 'associative'
  | 'mixed';

export const CONCEPT_SYSTEM_TYPE: Readonly<
  Record<'GENERIC' | 'PARTITIVE' | 'SEQUENTIAL' | 'ASSOCIATIVE' | 'MIXED', ConceptSystemType>
> = Object.freeze({
  GENERIC: 'generic',
  PARTITIVE: 'partitive',
  SEQUENTIAL: 'sequential',
  ASSOCIATIVE: 'associative',
  MIXED: 'mixed',
});

export const CONCEPT_SYSTEM_TYPE_VALUES: ReadonlyArray<ConceptSystemType> =
  Object.freeze(Object.values(CONCEPT_SYSTEM_TYPE));

export function isValidConceptSystemType(
  value: unknown,
): value is ConceptSystemType {
  return (
    typeof value === 'string' &&
    (CONCEPT_SYSTEM_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export default CONCEPT_SYSTEM_TYPE;
