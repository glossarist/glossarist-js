export class ValidationError {
  readonly path: string;
  readonly message: string;
  readonly severity: 'error' | 'warning';
  toString(): string;
}

export class ValidationRule {
  readonly name: string;
  readonly severity: 'error' | 'warning';
  validate(value: any, path: string): ValidationError[];
}

export class ConceptValidator {
  addRule(rule: ValidationRule): this;
  validate(concept: any): {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  };
}

export class RegisterValidator {
  validate(register: any): {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
  };
}

export function validateConcept(concept: any): {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

export function validateRegister(register: any): {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

export function createConceptValidator(): ConceptValidator;
