export class ValidationError {
  constructor(path, message, severity = 'error') {
    this.path = path;
    this.message = message;
    this.severity = severity;
  }

  toString() {
    return `[${this.severity.toUpperCase()}] ${this.path}: ${this.message}`;
  }

  toJSON() {
    return { path: this.path, message: this.message, severity: this.severity };
  }
}
