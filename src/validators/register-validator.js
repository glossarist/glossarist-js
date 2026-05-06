import { ValidationError } from './validation-error.js';

export class RegisterValidator {
  validate(register) {
    const errors = [];
    if (!register || typeof register !== 'object') {
      errors.push(new ValidationError('', 'Register must be a non-null object'));
      return { valid: false, errors, warnings: [] };
    }
    if (!register.schema_version) {
      errors.push(new ValidationError('schema_version', 'Register must have a schema_version', 'warning'));
    }
    if (!register.shortname) {
      errors.push(new ValidationError('shortname', 'Register should have a shortname', 'warning'));
    }
    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning'),
    };
  }
}
