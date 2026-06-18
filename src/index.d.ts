// Models
export {
  GlossaristModel,
  RegistrableModel,
  Concept, LocalizedConcept,
  Designation, Expression, Abbreviation, Symbol, LetterSymbol, GraphicalSymbol,
  Citation, ConceptRef, ConceptSource, RelatedConcept,
  DesignationRelationship, ConceptReference, ConceptDate,
  DetailedDefinition, NonVerbRep, NON_VERBAL_TYPES,
  NonVerbalEntity, SharedNonVerbalEntity,
  Figure, FigureImage, Table, Formula,
  NonVerbalReference, FigureReference, TableReference, FormulaReference,
  BibliographyEntry, BibliographyData,
  GcrMetadata, GcrStatistics,
  RELATIONSHIP_TYPES, DESIGNATION_RELATIONSHIP_TYPES, DATE_TYPES,
} from './models/index';

// GCR reader
export { loadGcr, GcrPackage, parseConceptYaml, naturalSort } from './gcr-reader';

// GCR writer
export { createGcr, GcrWriter } from './gcr-writer';

// Concept reader
export { readConcepts, readConcept, listConceptIds, readRegister } from './concept-reader';

// Concept writer
export { writeConcept, writeConcepts } from './concept-writer';

// Collections
export { ConceptCollection } from './concept-collection';
export { ManagedConceptCollection } from './managed-concept-collection';

// Validators
export {
  validateConcept, validateRegister, validateGcrPackage,
  createConceptValidator,
  ValidationError, ValidationRule, ValidationResult,
  RegisterValidator, GcrValidator,
  NonVerbalRefIntegrityRule, OrphanedImagesRule,
} from './validators/index';
export { AssetIndex } from './validators/asset-index';

// UUID
export { conceptUuid, localizedConceptUuid, uuidV5 } from './uuid';

// Reference resolution
export {
  ReferenceResolver, Reference, referenceResolver,
  resolveBibliographyRecord, findNonVerbalEntity,
} from './reference-resolver';

export type MentionParseResult = {
  kind: 'cite-ref' | 'urn-ref' | 'fig-ref' | 'table-ref' | 'formula-ref'
      | 'numeric' | 'designation' | 'unresolved';
  key?: string;
  uri?: string;
  label?: string | null;
  id?: string;
  raw: string;
};

export function parseMention(raw: string): MentionParseResult;

export function fetchLocalizedString(
  hash: Record<string, string> | null,
  lang: string,
  fallback?: string,
): string | null;
export function localizedStringIsEmpty(hash: Record<string, string> | null): boolean;
export function localizedStringIsPresent(hash: Record<string, string> | null): boolean;

// V1 support
export { V1Reader, migrateV1ToV2 } from './v1-reader';

// Errors
export { GlossaristError, InvalidInputError, YamlParseError } from './errors';

// Compiled format registry
export const COMPILED_EXTENSIONS: ReadonlyMap<string, string>;
export const COMPILED_FORMATS: readonly string[];
export function isKnownFormat(format: string): boolean;
export function compiledFilename(format: string, id: string): string;
export function compiledPath(format: string, id: string): string;
export function parseCompiledPath(zipPath: string): { format: string; id: string } | null;

// Dataset asset registry
export const DATASET_ASSETS: readonly { path: string; type: string }[];
export const FILE_ASSETS: readonly { path: string; type: string }[];
export const DIRECTORY_ASSETS: readonly { path: string; type: string }[];
export function findFileAsset(path: string): { path: string; type: string } | undefined;
export function findDirectoryAssetPath(zipPath: string): { path: string; type: string } | undefined;
export function isDatasetAssetPath(zipPath: string): boolean;

// Entity directory registry
export const ENTITY_DIRECTORIES: ReadonlyMap<string, string>;
export const ENTITY_TYPES: readonly string[];
export function entityDir(type: string): string;
export function entityPath(type: string, id: string): string;
export function isKnownEntityType(type: string): boolean;
export function parseEntityPath(zipPath: string): { type: string; id: string } | null;
