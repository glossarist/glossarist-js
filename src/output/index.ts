// Canonical dataset output-set API (glossarist-js#132).
//
// Every interchange format is a projection of the same Concept model walk,
// aligned to concept-model by construction:
//   - turtle/jsonld predicates come from the generated context.jsonld mapping
//   - yaml/jsonl use the schemas/v3 wire shape
//   - tbx/csv are pure model projections
//
// See TODO.refactor/64-output-set-api-design.md.

export {
  CSV_COLUMNS,
  conceptsToCsv,
  type CsvOptions,
} from './csv.js';
export {
  conceptToTbx,
  conceptsToTbx,
  type TbxOptions,
} from './tbx.js';
export {
  conceptToJsonl,
  conceptsToJsonl,
} from './jsonl.js';
export {
  conceptToTurtle,
  type ConceptTurtleOptions,
} from './turtle.js';
export {
  emitOutputSet,
  emitPerConceptFiles,
  OUTPUT_FORMATS,
  PER_CONCEPT_FORMATS,
  type OutputFormat,
  type OutputSet,
  type EmitOutputSetOptions,
} from './output-set.js';
