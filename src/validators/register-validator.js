import { ValidationResult } from './validation-result.js';

export class RegisterValidator {
  validate(register) {
    const result = new ValidationResult();
    if (!register || typeof register !== 'object') {
      result.addError('', 'Register must be a non-null object');
      return result;
    }
    if (!register.schema_version) {
      result.addWarning('schema_version', 'Register must have a schema_version');
    }
    if (!register.shortname) {
      result.addWarning('shortname', 'Register should have a shortname');
    }
    return result;
  }
}
