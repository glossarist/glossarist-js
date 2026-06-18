import { NonVerbalEntity } from './non-verbal-entity.js';

export class SharedNonVerbalEntity extends NonVerbalEntity {
  constructor(data = {}) {
    super(data);
    this.id = data.id ?? null;
    this.identifier = data.identifier ?? null;
  }

  findById(targetId) {
    return this.id === targetId ? this : null;
  }

  allIds() {
    return this.id != null ? [this.id] : [];
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.id != null) obj.id = this.id;
    if (this.identifier != null) obj.identifier = this.identifier;
    return obj;
  }

  static fromJSON(data) {
    return SharedNonVerbalEntity.fromData(data);
  }
}
