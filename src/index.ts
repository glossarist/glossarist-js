export { naturalSort } from './sort.js';
export {
  diffConcepts,
  diffLocalizedConcepts,
  diffText,
  diffList,
  diffSet,
  ConceptDiff,
  ConceptLevelDiff,
  LocalizedConceptDiff,
  MetadataDiff,
  DiffStats,
  ListDiff,
  TextDiff,
  TextHunk,
  Change,
  Added,
  Removed,
  Changed,
} from './diff/index.js';
export { loadGcr, GcrPackage, parseConceptYaml } from './gcr-reader.js';
export { readConcepts, readConcept, listConceptIds, readRegister } from './concept-reader.js';
export { writeConcept, writeConcepts } from './concept-writer.js';
export { createGcr, GcrWriter } from './gcr-writer.js';
export { ConceptCollection } from './concept-collection.js';
export { ManagedConceptCollection } from './managed-concept-collection.js';
export { validateConcept, validateRegister, validateGcrPackage, createConceptValidator, ValidationError, ValidationRule, ValidationResult, RegisterValidator, GcrValidator } from './validators/index.js';
export { conceptUuid, localizedConceptUuid, uuidV5 } from './uuid.js';
export { ReferenceResolver, Reference, referenceResolver, resolveBibliographyRecord, findNonVerbalEntity } from './reference-resolver.js';
export type { CitationClassification, CitationInput, CiteResolution } from './reference-resolver.js';
export { parseMention, extractMentionsFromText } from './reference-mention.js';
export type { MentionKind, MentionParseResult, ParseOptions, ExtractedMention } from './reference-mention.js';
export { parseMentions, parseMentionStrict, InvalidMentionError } from './mentions/parser.js';
export type { Segment, Mention as StrictMention, TextSegment, Target, TargetType, MentionKind as StrictMentionKind } from './mentions/parser.js';
export { resolveMention, resolveAll } from './mentions/resolver.js';
export { ReferenceClassifier } from './render-classification.js';
export { V1Reader, migrateV1ToV2 } from './v1-reader.js';
export { GlossaristError, InvalidInputError, YamlParseError } from './errors.js';

// External concept detection + extensional completeness check.
// Utilities for concept-browser and other consumers that need to render
// ISO 704:2022 external-concept and ellipsis notation.
// Per TODO 14 (external-concepts-ellipsis-rendering).
export {
  isExternalConcept,
  isExternalMember,
  isExternalComprehensive,
  getExternalMembers,
  hasProvidedBy,
  hasDanglingExternal,
} from './utils/external-detection.js';
export type { ConceptStore, ExternalConceptLike } from './utils/external-detection.js';
export {
  checkExtensionalCompleteness,
  OPEN_ENDED_PATTERNS,
} from './validators/extensional-completeness.js';
export type { ExtensionalDefinitionLike, ExtensionalCompletenessIssue } from './validators/extensional-completeness.js';
export { validateNoRawHtml } from './validators/raw-html-validator.js';
export type { HtmlValidationIssue } from './validators/raw-html-validator.js';

export {
  COMPILED_EXTENSIONS,
  COMPILED_FORMATS,
  isKnownFormat,
  compiledFilename,
  compiledPath,
  parseCompiledPath,
} from './compiled-format.js';

export {
  DATASET_ASSETS,
  FILE_ASSETS,
  DIRECTORY_ASSETS,
} from './dataset-asset.js';

export {
  GlossaristModel,
  RegistrableModel,
  Register, Section,
  REGISTER_STATUSES, ORDERING_METHODS,
  Concept, LocalizedConcept,
  Designation, Expression, Abbreviation, Symbol, GraphicalSymbol,
  Citation, ConceptRef, ConceptSource, RelatedConcept, DesignationRelationship, ConceptReference, ConceptDate,
  DetailedDefinition, NonVerbRep, NON_VERBAL_TYPES,
  NonConceptEntity, NonVerbalEntity,
  SharedNonVerbalEntity,
  Figure, FigureImage, Table, Formula,
  NonVerbalReference, FigureReference, TableReference, FormulaReference,
  BibliographyEntry, BibliographyData,
  fetchLocalizedString, localizedStringIsEmpty, localizedStringIsPresent,
  GcrMetadata, GcrStatistics,
  RELATIONSHIP_TYPES, DESIGNATION_RELATIONSHIP_TYPES, DATE_TYPES,
  PartitiveHyperedge,
  PARTITIVE_ENUMERATION, PARTITIVE_ENUMERATION_VALUES,
  PLURALITY_MARKER, PLURALITY_MARKER_VALUES,
} from './models/index.js';

export { AssetIndex } from './validators/asset-index.js';

export {
  ENTITY_DIRECTORIES,
  ENTITY_TYPES,
  entityDir,
  entityPath,
  isKnownEntityType,
  parseEntityPath,
} from './entity-directory.js';

// RDF serialization layer (WS C). Mirrors lib/glossarist/rdf/.
//
// NOTE: RDF and transforms are intentionally NOT re-exported from the
// main entry. They use Node-specific APIs (node:crypto for deterministic
// IDs) and pulling them in here would break browser builds. Consumers
// import them via the dedicated subpaths:
//
//   import { conceptToQuads, writeTurtle } from 'glossarist/rdf';
//   import { ConceptToGlossTransform } from 'glossarist/transforms';
//
// Both subpaths are declared in package.json `exports`.
