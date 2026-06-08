import { GlossaristModel } from './base.js';

export class ConceptRef extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.source = data.source ?? null;
    this.id = data.id ?? null;
    this.text = data.text ?? null;
  }

  toString() {
    const parts = [];
    if (this.source) parts.push(this.source);
    if (this.id) parts.push(this.id);
    const base = parts.join(' ');
    if (this.text && base) return `${base} (${this.text})`;
    if (this.text) return this.text;
    return base;
  }

  toJSON() {
    const obj = {};
    if (this.source != null) obj.source = this.source;
    if (this.id != null) obj.id = this.id;
    if (this.text != null) obj.text = this.text;
    return obj;
  }

  static fromJSON(data) {
    return new ConceptRef(data);
  }
}
