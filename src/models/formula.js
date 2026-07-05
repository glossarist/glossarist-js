import { SharedNonVerbalEntity } from './shared-non-verbal-entity.js';
import { NonVerbalEntity } from './non-verbal-entity.js';

export class Formula extends SharedNonVerbalEntity {
  constructor(data = {}) {
    super(data);
    this.expression = data.expression ?? null;
    this.notation = data.notation ?? null;
  }

  rdfClass() {
    return 'Formula';
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.expression != null) obj.expression = this.expression;
    if (this.notation != null) obj.notation = this.notation;
    return obj;
  }

  static fromJSON(data) { return new Formula(data); }
}

NonVerbalEntity.register('formula', Formula);
