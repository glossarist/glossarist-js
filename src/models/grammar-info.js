import { GlossaristModel } from './base.js';

export class GrammarInfo extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.gender = data.gender ?? null;
    this.number = data.number ?? null;
    this.noun = data.noun ?? false;
    this.verb = data.verb ?? false;
    this.adj = data.adj ?? false;
    this.adverb = data.adverb ?? false;
    this.preposition = data.preposition ?? false;
    this.participle = data.participle ?? false;
  }

  toJSON() {
    const obj = {};
    if (this.gender != null) obj.gender = this.gender;
    if (this.number != null) obj.number = this.number;
    if (this.noun) obj.noun = true;
    if (this.verb) obj.verb = true;
    if (this.adj) obj.adj = true;
    if (this.adverb) obj.adverb = true;
    if (this.preposition) obj.preposition = true;
    if (this.participle) obj.participle = true;
    return obj;
  }

  static fromJSON(data) {
    return new GrammarInfo(data);
  }
}
