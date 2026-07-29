// DefinitionType — ISO 704:2022 §5.3 definition strategy enum.
//
// Four values:
//   intensional (default): genus + differentiae
//   extensional: enumerate instances or species
//   partitive:   describe composition
//   translated:  translated from another language
//
// See docs/design/definition-types.md (concept-model repo).

export const DEFINITION_TYPE = Object.freeze({
  INTENSIONAL: 'intensional',
  EXTENSIONAL: 'extensional',
  PARTITIVE: 'partitive',
  TRANSLATED: 'translated',
});

export const DEFINITION_TYPE_VALUES = Object.freeze(
  Object.values(DEFINITION_TYPE),
);

export const DEFAULT_DEFINITION_TYPE = DEFINITION_TYPE.INTENSIONAL;

export function isValidDefinitionType(value) {
  return DEFINITION_TYPE_VALUES.includes(value);
}

export default DEFINITION_TYPE;
