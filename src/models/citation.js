import { GlossaristModel } from './base.js';
import { Locality } from './locality.js';

export class Citation extends GlossaristModel {
  constructor(data) {
    super();
    if (typeof data === 'string') {
      this.text = data;
      this.source = null;
      this.ref = null;
      this.id = null;
      this.version = null;
      this.clause = null;
      this.link = null;
      this.original = null;
      this.locality = null;
      this.customLocality = null;
    } else {
      const d = data ?? {};
      this.text = d.text ?? null;
      this.source = d.source ?? null;
      this.ref = d.ref ?? null;
      this.id = d.id ?? null;
      this.version = d.version ?? null;
      this.clause = d.clause ?? null;
      this.link = d.link ?? null;
      this.original = d.original ?? null;
      this.locality = d.locality
        ? (d.locality instanceof Locality ? d.locality : new Locality(d.locality))
        : null;
      this.customLocality = d.custom_locality ?? d.customLocality ?? null;
    }
  }

  get isStructured() {
    return typeof this.source === 'object' && this.source !== null;
  }

  toString() {
    if (this.text) return this.text;
    if (this.ref) return this.ref;
    if (typeof this.source === 'string') return this.source;
    if (typeof this.source === 'object' && this.source !== null) return this.source.ref ?? '';
    return '';
  }

  toJSON() {
    const obj = {};
    if (this.text != null) obj.text = this.text;
    if (this.source != null) obj.source = this.source;
    if (this.ref != null) obj.ref = this.ref;
    if (this.id != null) obj.id = this.id;
    if (this.version != null) obj.version = this.version;
    if (this.clause != null) obj.clause = this.clause;
    if (this.link != null) obj.link = this.link;
    if (this.original != null) obj.original = this.original;
    if (this.locality != null) obj.locality = this.locality.toJSON();
    if (this.customLocality != null) obj.custom_locality = this.customLocality;
    return obj;
  }

  static fromJSON(data) {
    return new Citation(data);
  }
}
