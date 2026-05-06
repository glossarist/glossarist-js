import { GlossaristModel } from './base.js';

export class Citation extends GlossaristModel {
  constructor(data) {
    super();
    if (typeof data === 'string') {
      this.source = data;
      this.ref = null;
      this.id = null;
      this.version = null;
      this.clause = null;
      this.link = null;
    } else {
      const d = data ?? {};
      this.source = d.source ?? null;
      this.ref = d.ref ?? null;
      this.id = d.id ?? null;
      this.version = d.version ?? null;
      this.clause = d.clause ?? null;
      this.link = d.link ?? null;
    }
  }

  get isStructured() {
    return typeof this.source === 'object' && this.source !== null;
  }

  toString() {
    if (this.ref) return this.ref;
    if (typeof this.source === 'string') return this.source;
    if (typeof this.source === 'object' && this.source !== null) return this.source.ref ?? '';
    return '';
  }

  toJSON() {
    const obj = {};
    if (this.source != null) obj.source = this.source;
    if (this.ref != null) obj.ref = this.ref;
    if (this.id != null) obj.id = this.id;
    if (this.version != null) obj.version = this.version;
    if (this.clause != null) obj.clause = this.clause;
    if (this.link != null) obj.link = this.link;
    return obj;
  }

  static fromJSON(data) {
    return new Citation(data);
  }
}
