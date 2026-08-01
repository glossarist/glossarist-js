export { ValidationError } from './validation-error.js';
export { ValidationRule } from './validation-rule.js';
export { ValidationResult } from './validation-result.js';
export { ConceptValidator, LanguageCodeRule, DesignationTypeRule, EntryStatusRule } from './concept-validator.js';
export { RegisterValidator } from './register-validator.js';
export { GcrValidator } from './gcr-validator.js';
export { RelationshipTypeRule } from './relationship-type-rule.js';
export {
  RefShapeRule,
  LocalityCompletenessRule,
  LocalizationConsistencyRule,
  SchemaVersionRule,
  DomainRefRule,
  UuidFormatRule,
  SourceUrnFormatRule,
  CiteRefIntegrityRule,
  NonVerbalRefIntegrityRule,
  OrphanedImagesRule,
} from './v3-rules.js';
export { SourcedFromLocalityRule } from './sourced-from-locality-rule.js';
export { PartitiveRelationCoherenceRule, HyperedgeCoherenceRule } from './hyperedge-coherence-rule.js';
export { ExternalConceptShapeRule } from './external-concept-shape-rule.js';
export { BinaryHasPartRedundancyRule } from './binary-has-part-redundancy-rule.js';
export { DelimitingCoherenceRule } from './delimiting-coherence-rule.js';

import type { Concept } from '../models/concept.js';
import type { GcrPackage } from '../gcr-reader.js';
import { ConceptValidator, LanguageCodeRule, DesignationTypeRule, EntryStatusRule } from './concept-validator.js';
import { RegisterValidator } from './register-validator.js';
import { GcrValidator } from './gcr-validator.js';
import { RelationshipTypeRule } from './relationship-type-rule.js';
import {
  RefShapeRule,
  LocalityCompletenessRule,
  LocalizationConsistencyRule,
  SchemaVersionRule,
  DomainRefRule,
  UuidFormatRule,
  SourceUrnFormatRule,
  CiteRefIntegrityRule,
  NonVerbalRefIntegrityRule,
} from './v3-rules.js';
import { SourcedFromLocalityRule } from './sourced-from-locality-rule.js';
import { HyperedgeCoherenceRule } from './hyperedge-coherence-rule.js';
import { ExternalConceptShapeRule } from './external-concept-shape-rule.js';
import { BinaryHasPartRedundancyRule } from './binary-has-part-redundancy-rule.js';
import { DelimitingCoherenceRule } from './delimiting-coherence-rule.js';

const _default = new ConceptValidator()
  .addRule(new LanguageCodeRule())
  .addRule(new DesignationTypeRule())
  .addRule(new EntryStatusRule())
  .addRule(new RefShapeRule())
  .addRule(new LocalityCompletenessRule())
  .addRule(new LocalizationConsistencyRule())
  .addRule(new SchemaVersionRule())
  .addRule(new DomainRefRule())
  .addRule(new UuidFormatRule())
  .addRule(new SourceUrnFormatRule())
  .addRule(new RelationshipTypeRule())
  .addRule(new CiteRefIntegrityRule())
  .addRule(new NonVerbalRefIntegrityRule())
  .addRule(new SourcedFromLocalityRule())
  .addRule(new HyperedgeCoherenceRule())
  .addRule(new ExternalConceptShapeRule())
  .addRule(new BinaryHasPartRedundancyRule())
  .addRule(new DelimitingCoherenceRule());

export function validateConcept(concept: Concept) {
  return _default.validate(concept);
}

export function createConceptValidator() {
  return new ConceptValidator();
}

export function validateRegister(register: unknown) {
  return new RegisterValidator().validate(register as any);
}

export async function validateGcrPackage(pkg: GcrPackage) {
  return new GcrValidator().validate(pkg);
}
