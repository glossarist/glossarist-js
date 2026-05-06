// Models
export {
  GlossaristModel,
  Concept, LocalizedConcept,
  Designation, Expression, Abbreviation, Symbol, GraphicalSymbol,
  Citation, ConceptSource, RelatedConcept, ConceptDate,
  DetailedDefinition, NonVerbRep,
  RELATIONSHIP_TYPES, DATE_TYPES,
} from './models/index';

// GCR reader
export { loadGcr, GcrPackage, parseConceptYaml, naturalSort } from './gcr-reader';
export type { GcrMetadata } from './gcr-reader';

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
export { validateConcept, validateRegister, createConceptValidator, ValidationError, ValidationRule, RegisterValidator } from './validators/index';

// UUID
export { conceptUuid, localizedConceptUuid, uuidV5 } from './uuid';

// Reference resolution
export { ReferenceResolver, Reference, referenceResolver } from './reference-resolver';

// V1 support
export { V1Reader, migrateV1ToV2 } from './v1-reader';

// Errors
export { GlossaristError, InvalidInputError, YamlParseError } from './errors';
