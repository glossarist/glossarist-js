import { GlossaristModel } from './base.js';

export class Locality extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.type = data.type ?? null;
    this.referenceFrom = data.reference_from ?? data.referenceFrom ?? null;
    this.referenceTo = data.reference_to ?? data.referenceTo ?? null;
  }

  toJSON() {
    const obj = {};
    if (this.type != null) obj.type = this.type;
    if (this.referenceFrom != null) obj.reference_from = this.referenceFrom;
    if (this.referenceTo != null) obj.reference_to = this.referenceTo;
    return obj;
  }

  static fromJSON(data) {
    return new Locality(data);
  }
}
