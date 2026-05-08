export class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  get valid() {
    return this.errors.length === 0;
  }

  addError(message) {
    this.errors.push(message);
    return this;
  }

  addWarning(message) {
    this.warnings.push(message);
    return this;
  }

  merge(other) {
    for (const e of other.errors) this.errors.push(e);
    for (const w of other.warnings) this.warnings.push(w);
    return this;
  }

  toJSON() {
    return {
      valid: this.valid,
      errors: [...this.errors],
      warnings: [...this.warnings],
    };
  }
}
