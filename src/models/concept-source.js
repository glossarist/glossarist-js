import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

export class ConceptSource extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.id = data.id ?? null;
    this.status = data.status ?? null;
    this.type = data.type ?? null;
    this.origin = data.origin
      ? (data.origin instanceof Citation ? data.origin : new Citation(data.origin))
      : null;
    this.modification = data.modification ?? null;
    this.sourced_from = (data.sourced_from ?? []).map(
      c => c instanceof Citation ? c : new Citation(c)
    );
  }

  toJSON() {
    const obj = {};
    if (this.id != null) obj.id = this.id;
    if (this.status != null) obj.status = this.status;
    if (this.type != null) obj.type = this.type;
    if (this.origin != null) obj.origin = this.origin.toJSON();
    if (this.modification != null) obj.modification = this.modification;
    if (this.sourced_from.length > 0) obj.sourced_from = this.sourced_from.map(c => c.toJSON());
    return obj;
  }

  static fromJSON(data) {
    return new ConceptSource(data);
  }
}
