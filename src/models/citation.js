import { GlossaristModel } from './base.js';
import { Locality } from './locality.js';

export class Citation extends GlossaristModel {
  constructor(data = {}) {
    super();
    const d = data ?? {};

    this.ref = d.ref
      ? (d.ref instanceof Citation.Ref ? d.ref : new Citation.Ref(d.ref))
      : null;

    this.locality = d.locality
      ? (d.locality instanceof Locality ? d.locality : new Locality(d.locality))
      : null;
    this.link = d.link ?? null;
    this.original = d.original ?? null;
    this.customLocality = d.custom_locality ?? d.customLocality ?? null;
  }

  toString() {
    if (this.ref) return this.ref.toString();
    return '';
  }

  toJSON() {
    const obj = {};
    if (this.ref != null) obj.ref = this.ref.toJSON();
    if (this.locality != null) obj.locality = this.locality.toJSON();
    if (this.link != null) obj.link = this.link;
    if (this.original != null) obj.original = this.original;
    if (this.customLocality != null) obj.custom_locality = this.customLocality;
    return obj;
  }

  static fromJSON(data) {
    return new Citation(data);
  }
}

Citation.Ref = class Ref extends GlossaristModel {
  constructor(data = {}) {
    super();
    const d = data ?? {};
    this.source = d.source ?? null;
    this.id = d.id ?? null;
    this.version = d.version ?? null;
  }

  toString() {
    const parts = [];
    if (this.source) parts.push(this.source);
    if (this.id) parts.push(this.id);
    return parts.join(' ');
  }

  toJSON() {
    const obj = {};
    if (this.source != null) obj.source = this.source;
    if (this.id != null) obj.id = this.id;
    if (this.version != null) obj.version = this.version;
    return obj;
  }

  static fromJSON(data) {
    return new Citation.Ref(data);
  }
};
