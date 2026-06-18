import { GlossaristModel } from './base.js';

export class BibliographyEntry extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.id = data.id ?? null;
    this.reference = data.reference ?? null;
    this.title = data.title ?? null;
    this.link = data.link ?? null;
    this.type = data.type ?? null;
  }

  toJSON() {
    const obj = {};
    if (this.id != null) obj.id = this.id;
    if (this.reference != null) obj.reference = this.reference;
    if (this.title != null) obj.title = this.title;
    if (this.link != null) obj.link = this.link;
    if (this.type != null) obj.type = this.type;
    return obj;
  }

  static fromJSON(data) {
    return new BibliographyEntry(data);
  }
}
