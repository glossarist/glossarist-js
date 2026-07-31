// ConceptType — ISO 704:2022 §5.2-5.3 general vs individual concept.
//
//   general    — concept corresponds to a category of objects
//                (designated by terms or symbols)
//   individual — concept corresponds to a unique object
//                (designated by proper names / appellations)
//
// Individual concepts occupy the bottom rung of a concept ladder
// and cannot be subdivided into more specific concepts, but CAN be
// subdivided into parts via a partitive relation.

export type ConceptType = 'general' | 'individual';

export const CONCEPT_TYPE: Readonly<Record<'GENERAL' | 'INDIVIDUAL', ConceptType>> =
  Object.freeze({
    GENERAL: 'general',
    INDIVIDUAL: 'individual',
  });

export const CONCEPT_TYPE_VALUES: ReadonlyArray<ConceptType> = Object.freeze(
  Object.values(CONCEPT_TYPE),
);

export const DEFAULT_CONCEPT_TYPE: ConceptType = CONCEPT_TYPE.GENERAL;

export function isValidConceptType(value: unknown): value is ConceptType {
  return (
    typeof value === 'string' &&
    (CONCEPT_TYPE_VALUES as readonly string[]).includes(value)
  );
}

export default CONCEPT_TYPE;
