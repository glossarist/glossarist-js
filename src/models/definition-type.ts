// DefinitionType — ISO 704:2022 §5.3 definition strategy enum.
//
//   intensional (default): genus + differentiae
//   extensional:           enumerate instances or species
//   partitive:             describe composition
//   translated:            translated from another language

import { makeEnum } from './enum.js';

export type DefinitionType =
  | 'intensional'
  | 'extensional'
  | 'partitive'
  | 'translated';

export const DEFINITION_TYPE = makeEnum('DEFINITION_TYPE', {
  INTENSIONAL: 'intensional',
  EXTENSIONAL: 'extensional',
  PARTITIVE: 'partitive',
  TRANSLATED: 'translated',
});

export const DEFAULT_DEFINITION_TYPE: DefinitionType =
  DEFINITION_TYPE.INTENSIONAL;
