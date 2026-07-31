import { ValidationError } from './validation-error.js';

export class ValidationResult {
  private readonly _issues: ValidationError[] = [];

  constructor() {}

  get valid(): boolean {
    return this._issues.filter(e => e.severity === 'error').length === 0;
  }

  get errors(): ReadonlyArray<ValidationError> {
    return this._issues.filter(e => e.severity === 'error');
  }

  get warnings(): ReadonlyArray<ValidationError> {
    return this._issues.filter(e => e.severity === 'warning');
  }

  addError(path: string, message?: string): this {
    if (message === undefined) {
      this._issues.push(new ValidationError('', path, 'error'));
    } else {
      this._issues.push(new ValidationError(path, message, 'error'));
    }
    return this;
  }

  addWarning(path: string, message?: string): this {
    if (message === undefined) {
      this._issues.push(new ValidationError('', path, 'warning'));
    } else {
      this._issues.push(new ValidationError(path, message, 'warning'));
    }
    return this;
  }

  merge(other: ValidationResult): this {
    if (other instanceof ValidationResult) {
      for (const issue of other._issues) this._issues.push(issue);
    }
    return this;
  }

  toJSON(): { valid: boolean; errors: unknown[]; warnings: unknown[] } {
    return {
      valid: this.valid,
      errors: this.errors.map(e => typeof e.toJSON === 'function' ? e.toJSON() : e),
      warnings: this.warnings.map(e => typeof e.toJSON === 'function' ? e.toJSON() : e),
    };
  }
}
