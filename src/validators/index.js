export { ValidationError } from './validation-error.js';
export { ValidationRule } from './validation-rule.js';
export { ConceptValidator, LanguageCodeRule, DesignationTypeRule, EntryStatusRule } from './concept-validator.js';
export { RegisterValidator } from './register-validator.js';

import { ConceptValidator, LanguageCodeRule, DesignationTypeRule, EntryStatusRule } from './concept-validator.js';
import { RegisterValidator } from './register-validator.js';

const _default = new ConceptValidator()
  .addRule(new LanguageCodeRule())
  .addRule(new DesignationTypeRule())
  .addRule(new EntryStatusRule());

export function validateConcept(concept) {
  return _default.validate(concept);
}

export function createConceptValidator() {
  return new ConceptValidator();
}

export function validateRegister(register) {
  return new RegisterValidator().validate(register);
}
