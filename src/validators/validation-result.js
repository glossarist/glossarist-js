import { ValidationError } from './validation-error.js';

export class ValidationResult {
  constructor() {
    this._issues = [];
  }

  get valid() {
    return this._issues.filter(e => e.severity === 'error').length === 0;
  }

  get errors() {
    return this._issues.filter(e => e.severity === 'error');
  }

  get warnings() {
    return this._issues.filter(e => e.severity === 'warning');
  }

  addError(pathOrMessage, message) {
    if (message === undefined) {
      this._issues.push(new ValidationError('', pathOrMessage, 'error'));
    } else {
      this._issues.push(new ValidationError(pathOrMessage, message, 'error'));
    }
    return this;
  }

  addWarning(pathOrMessage, message) {
    if (message === undefined) {
      this._issues.push(new ValidationError('', pathOrMessage, 'warning'));
    } else {
      this._issues.push(new ValidationError(pathOrMessage, message, 'warning'));
    }
    return this;
  }

  merge(other) {
    if (other instanceof ValidationResult) {
      for (const issue of other._issues) this._issues.push(issue);
    }
    return this;
  }

  toJSON() {
    return {
      valid: this.valid,
      errors: this.errors.map(e => e.toJSON ? e.toJSON() : e),
      warnings: this.warnings.map(e => e.toJSON ? e.toJSON() : e),
    };
  }
}
