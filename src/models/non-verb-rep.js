import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

export class NonVerbRep extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.image = data.image ?? null;
    this.table = data.table ?? null;
    this.formula = data.formula ?? null;
    this.sources = (data.sources ?? []).map(
      s => s instanceof Citation ? s : new Citation(s)
    );
  }

  toJSON() {
    const obj = {};
    if (this.image != null) obj.image = this.image;
    if (this.table != null) obj.table = this.table;
    if (this.formula != null) obj.formula = this.formula;
    if (this.sources.length > 0) obj.sources = this.sources.map(s => s.toJSON());
    return obj;
  }

  static fromJSON(data) {
    return new NonVerbRep(data);
  }
}
