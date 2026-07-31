import { NonVerbalEntity } from './non-verbal-entity.js';
import type { NonVerbalEntityJson } from './non-verbal-entity.js';

export interface SharedNonVerbalEntityJson extends NonVerbalEntityJson {
  id?: string | null;
  identifier?: string | null;
}

export class SharedNonVerbalEntity extends NonVerbalEntity {
  readonly id: string | null;
  readonly identifier: string | null;

  constructor(data: SharedNonVerbalEntityJson = {}) {
    super(data);
    this.id = data.id ?? null;
    this.identifier = data.identifier ?? null;
  }

  override findById(targetId: string): this | null {
    return this.id === targetId ? this : null;
  }
  override allIds(): string[] {
    return this.id != null ? [this.id] : [];
  }

  override toJSON(): SharedNonVerbalEntityJson {
    const obj = super.toJSON() as SharedNonVerbalEntityJson;
    if (this.id != null) obj.id = this.id;
    if (this.identifier != null) obj.identifier = this.identifier;
    return obj;
  }

  static override fromJSON(data: SharedNonVerbalEntityJson): SharedNonVerbalEntity {
    return SharedNonVerbalEntity.fromData(data);
  }
}
