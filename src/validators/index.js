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
} from './v3-rules.js';

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
} from './v3-rules.js';

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
  .addRule(new CiteRefIntegrityRule());

export function validateConcept(concept) {
  return _default.validate(concept);
}

export function createConceptValidator() {
  return new ConceptValidator();
}

export function validateRegister(register) {
  return new RegisterValidator().validate(register);
}

export async function validateGcrPackage(pkg) {
  return new GcrValidator().validate(pkg);
}
