import { GlossaristModel } from './base.js';
import { ConceptSource } from './concept-source.js';

export class NonVerbRep extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.type = data.type ?? null;
    this.ref = data.ref ?? null;
    this.text = data.text ?? null;
    this.sources = (data.sources ?? []).map(
      s => s instanceof ConceptSource ? s : new ConceptSource(s)
    );
  }

  toJSON() {
    const obj = {};
    if (this.type != null) obj.type = this.type;
    if (this.ref != null) obj.ref = this.ref;
    if (this.text != null) obj.text = this.text;
    if (this.sources.length > 0) obj.sources = this.sources.map(s => s.toJSON());
    return obj;
  }

  static fromJSON(data) {
    return new NonVerbRep(data);
  }
}
