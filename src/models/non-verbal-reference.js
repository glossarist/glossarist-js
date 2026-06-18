import { RegistrableModel } from './registrable.js';

export class NonVerbalReference extends RegistrableModel {
  constructor(data = {}) {
    super();
    this.entityId = data.entityId ?? data.entity_id ?? data.ref ?? data.id ?? null;
    this.display = data.display ?? null;
  }

  get dedupKey() {
    return [this.constructor.name, this.entityId];
  }

  toJSON() {
    if (this.display != null) {
      return { ref: this.entityId, display: this.display };
    }
    return this.entityId;
  }

  static fromJSON(data) {
    if (data instanceof NonVerbalReference) return data;
    if (typeof data === 'string') {
      return new NonVerbalReference({ entityId: data });
    }
    const entityId = data.entityId ?? data.entity_id ?? data.ref ?? data.id ?? null;
    const display = data.display ?? null;
    const type = data.type;
    if (type && this._registry().has(type)) {
      const Cls = this._registry().get(type);
      return new Cls({ entityId, display });
    }
    return new NonVerbalReference({ entityId, display });
  }
}
