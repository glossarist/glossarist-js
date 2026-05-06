import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

export class DetailedDefinition extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.content = data.content ?? '';
    this.sources = (data.sources ?? []).map(
      s => s instanceof Citation ? s : new Citation(s)
    );
  }

  toJSON() {
    const obj = { content: this.content };
    if (this.sources.length > 0) {
      obj.sources = this.sources.map(s => s.toJSON());
    }
    return obj;
  }

  static fromJSON(data) {
    return new DetailedDefinition(data);
  }
}
