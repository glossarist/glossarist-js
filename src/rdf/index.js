// Public RDF layer. Mirrors lib/glossarist/rdf/ in glossarist-ruby.
export { PRED, PREFIXES, SKOSXL, WELL_KNOWN } from './prefixes.js';
export {
  resolveIri,
  compactIri,
  isAbsoluteIri,
  RDF_TYPE,
  RDF_VALUE,
  RDFS_LABEL,
} from './curie.js';
export { deterministicBnodeId } from './bnode-id.js';
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
} from './vocabulary-emitter.js';
export { datasetToQuads } from './dataset-emitter.js';
export { groupToQuads } from './group-emitter.js';
export { bibliographyToQuads, bibliographyEntryIri, normalizeBibliographyData } from './bibliography-emitter.js';
export { buildActivityIri, buildActivityToQuads } from './build-activity-emitter.js';
export { agentsFromContributors, agentsToQuads, slugify } from './agents-emitter.js';
export { versionToQuads, versionHistoryToQuads } from './version-emitter.js';
export { imageVariantIri, imageVariantToQuads } from './image-variant-emitter.js';
export {
  collectQuads,
  writeTurtle,
  writeNTriples,
  writeJsonld,
  sortQuads,
} from './document-writer.js';
export { writeTurtleSync } from './write-turtle-sync.js';
// SHACL validator moved to glossarist/rdf/shacl subpath — it depends on
// node:fs/promises, node:path, node:url at module top-level, which would
// break browser bundles. Importing 'glossarist/rdf' alone is browser-safe.
export { quadSectionsToClassInstances } from './sections-builder.js';
export { provenanceToQuads } from './provenance-emitter.js';
