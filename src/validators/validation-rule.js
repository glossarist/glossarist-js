export class ValidationRule {
  constructor(name, severity = 'error') {
    this.name = name;
    this.severity = severity;
  }

  validate(_value, _path, _result) {
    throw new Error(`${this.constructor.name} must implement validate()`);
  }

  addIssue(result, path, message) {
    if (this.severity === 'warning') {
      result.addWarning(path, message);
    } else {
      result.addError(path, message);
    }
  }
}
