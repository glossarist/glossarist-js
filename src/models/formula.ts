import { SharedNonVerbalEntity } from './shared-non-verbal-entity.js';
import type { SharedNonVerbalEntityJson } from './shared-non-verbal-entity.js';
import { NonVerbalEntity } from './non-verbal-entity.js';

export interface FormulaJson extends SharedNonVerbalEntityJson {
  expression?: string | null;
  notation?: string | null;
}

export class Formula extends SharedNonVerbalEntity {
  readonly expression: string | null;
  readonly notation: string | null;

  constructor(data: FormulaJson = {}) {
    super(data);
    this.expression = data.expression ?? null;
    this.notation = data.notation ?? null;
  }

  override rdfClass(): string {
    return 'Formula';
  }

  override toJSON(): FormulaJson {
    const obj = super.toJSON() as FormulaJson;
    if (this.expression != null) obj.expression = this.expression;
    if (this.notation != null) obj.notation = this.notation;
    return obj;
  }

  static override fromJSON(data: FormulaJson): Formula {
    return new Formula(data);
  }
}

NonVerbalEntity.register('formula', Formula);
