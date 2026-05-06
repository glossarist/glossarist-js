import { ValidationError } from './validation-error.js';

export class ValidationRule {
  constructor(name, severity = 'error') {
    this.name = name;
    this.severity = severity;
  }

  validate(_value, _path) {
    throw new Error(`${this.constructor.name} must implement validate()`);
  }

  error(path, message) {
    return [new ValidationError(path, message, this.severity)];
  }
}
