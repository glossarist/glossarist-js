import { ValidationResult } from './validation-result.js';

interface RegisterLike {
  schema_version?: string;
  shortname?: string;
}

export class RegisterValidator {
  validate(register: RegisterLike | null | undefined) {
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
