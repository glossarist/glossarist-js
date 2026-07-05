import { SharedNonVerbalEntity } from './shared-non-verbal-entity.js';
import { NonVerbalEntity } from './non-verbal-entity.js';

export class Table extends SharedNonVerbalEntity {
  constructor(data = {}) {
    super(data);
    this.content = data.content ?? null;
    this.format = data.format ?? null;
  }

  rdfClass() {
    return 'Table';
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.content != null) obj.content = this.content;
    if (this.format != null) obj.format = this.format;
    return obj;
  }

  static fromJSON(data) { return new Table(data); }
}

NonVerbalEntity.register('table', Table);
