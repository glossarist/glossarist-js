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

export function createConceptValidator(): import('./concept-validator').ConceptValidator;
