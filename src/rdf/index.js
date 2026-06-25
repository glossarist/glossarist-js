// Public RDF layer. Mirrors lib/glossarist/rdf/ in glossarist-ruby.
export { PRED, PREFIXES, SKOSXL, WELL_KNOWN } from './prefixes.js';
export { deterministicId, deterministicBnode } from './deterministic-id.js';
export {
  conceptUri,
  conceptToQuads,
} from './gloss-concept.js';
export {
  localizedConceptUri,
  localizedConceptToQuads,
} from './gloss-localized-concept.js';
export {
  designationToQuads,
  skosLabelPredicate,
  skosxlLabelPredicate,
} from './gloss-designation.js';
export { detailedDefinitionToQuads } from './gloss-detailed-definition.js';
export { conceptSourceToQuads } from './gloss-source.js';
export {
  collectQuads,
  writeTurtle,
  writeNTriples,
  writeJsonld,
  sortQuads,
} from './document-writer.js';
export { validateShacl, loadShapes, quadsToDataset } from './shacl.js';
