import type { ValidationResult } from './validation-result.js';

export abstract class ValidationRule {
  readonly name: string;
  readonly severity: 'error' | 'warning';

  constructor(name: string, severity: 'error' | 'warning' = 'error') {
    this.name = name;
    this.severity = severity;
  }

  abstract validate(concept: unknown, path: string, result: ValidationResult): void;

  addIssue(result: ValidationResult, path: string, message: string): void {
    if (this.severity === 'warning') {
      result.addWarning(path, message);
    } else {
      result.addError(path, message);
    }
  }
}
