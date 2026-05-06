import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

export class ConceptSource extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.status = data.status ?? null;
    this.type = data.type ?? null;
    this.origin = data.origin
      ? (data.origin instanceof Citation ? data.origin : new Citation(data.origin))
      : null;
    this.modification = data.modification ?? null;
  }

  toJSON() {
    const obj = {};
    if (this.status != null) obj.status = this.status;
    if (this.type != null) obj.type = this.type;
    if (this.origin != null) obj.origin = this.origin.toJSON();
    if (this.modification != null) obj.modification = this.modification;
    return obj;
  }

  static fromJSON(data) {
    return new ConceptSource(data);
  }
}
