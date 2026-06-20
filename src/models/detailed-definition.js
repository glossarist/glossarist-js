import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

export class DetailedDefinition extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.content = data.content ?? '';
    this._rawSources = data.sources ?? [];
    this._rawExamples = data.examples ?? [];
    this._sources = null;
    this._examples = null;
  }

  get sources() {
    return this._lazy('_sources', '_rawSources',
      s => s instanceof Citation ? s : new Citation(s));
  }

  get examples() {
    return this._lazy('_examples', '_rawExamples',
      e => e instanceof DetailedDefinition ? e : new DetailedDefinition(e));
  }

  toJSON() {
    const obj = { content: this.content };
    this._serialize(obj, 'sources', '_sources', '_rawSources');
    this._serialize(obj, 'examples', '_examples', '_rawExamples');
    return obj;
  }

  static fromJSON(data) {
    return new DetailedDefinition(data);
  }
}
