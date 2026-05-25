import { GlossaristModel } from './base.js';

export class ConceptRef extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.source = data.source ?? null;
    this.id = data.id ?? null;
  }

  toString() {
    if (this.source && this.id) return `${this.source} ${this.id}`;
    return this.source ?? this.id ?? '';
  }

  toJSON() {
    const obj = {};
    if (this.source != null) obj.source = this.source;
    if (this.id != null) obj.id = this.id;
    return obj;
  }

  static fromJSON(data) {
    return new ConceptRef(data);
  }
}
