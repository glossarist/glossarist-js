// Models
export {
  GlossaristModel,
  Concept, LocalizedConcept,
  Designation, Expression, Abbreviation, Symbol, GraphicalSymbol,
  Citation, ConceptSource, RelatedConcept, ConceptDate,
  DetailedDefinition, NonVerbRep,
  GcrMetadata, GcrStatistics,
  RELATIONSHIP_TYPES, DATE_TYPES,
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
export { validateConcept, validateRegister, validateGcrPackage, createConceptValidator, ValidationError, ValidationRule, ValidationResult, RegisterValidator, GcrValidator } from './validators/index';

// UUID
export { conceptUuid, localizedConceptUuid, uuidV5 } from './uuid';

// Reference resolution
export { ReferenceResolver, Reference, referenceResolver } from './reference-resolver';

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
