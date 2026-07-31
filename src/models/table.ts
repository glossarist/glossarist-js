import { SharedNonVerbalEntity } from './shared-non-verbal-entity.js';
import type { SharedNonVerbalEntityJson } from './shared-non-verbal-entity.js';
import { NonVerbalEntity } from './non-verbal-entity.js';

export interface TableJson extends SharedNonVerbalEntityJson {
  content?: string | null;
  format?: string | null;
}

export class Table extends SharedNonVerbalEntity {
  readonly content: string | null;
  readonly format: string | null;

  constructor(data: TableJson = {}) {
    super(data);
    this.content = data.content ?? null;
    this.format = data.format ?? null;
  }

  override rdfClass(): string {
    return 'Table';
  }

  override toJSON(): TableJson {
    const obj = super.toJSON() as TableJson;
    if (this.content != null) obj.content = this.content;
    if (this.format != null) obj.format = this.format;
    return obj;
  }

  static override fromJSON(data: TableJson): Table {
    return new Table(data);
  }
}

NonVerbalEntity.register('table', Table);
