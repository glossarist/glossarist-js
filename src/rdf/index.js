// Public RDF layer. Mirrors lib/glossarist/rdf/ in glossarist-ruby.
export { PRED, PREFIXES, SKOSXL, WELL_KNOWN } from './prefixes.js';
export { deterministicId, deterministicBnode } from './deterministic-id.js';
export { namedNode, blankNode, literal, defaultGraph, quad } from './terms.js';
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
  nonVerbalRepToQuads,
  nonVerbalEntityToQuads,
  nonVerbalEntityUri,
} from './gloss-non-verbal-rep.js';
export {
  vocabularySchemeToQuads,
  vocabularyToQuads,
  resolveIri,
} from './vocabulary-emitter.js';
export { datasetToQuads } from './dataset-emitter.js';
export { groupToQuads } from './group-emitter.js';
export { bibliographyToQuads, bibliographyEntryIri, normalizeBibliographyData } from './bibliography-emitter.js';
export {
  collectQuads,
  writeTurtle,
  writeNTriples,
  writeJsonld,
  sortQuads,
} from './document-writer.js';
export { validateShacl, loadShapes, clearShapesCache, quadsToDataset } from './shacl.js';
