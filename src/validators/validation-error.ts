export class ValidationError {
  readonly path: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';

  constructor(path: string, message: string, severity: 'error' | 'warning' = 'error') {
    this.path = path;
    this.message = message;
    this.severity = severity;
  }

  toString(): string {
    return `[${this.severity.toUpperCase()}] ${this.path}: ${this.message}`;
  }

  toJSON(): { path: string; message: string; severity: string } {
    return { path: this.path, message: this.message, severity: this.severity };
  }
}
