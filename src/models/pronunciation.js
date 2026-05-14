import { GlossaristModel } from './base.js';

export class Pronunciation extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.content = data.content ?? null;
    this.language = data.language ?? null;
    this.script = data.script ?? null;
    this.system = data.system ?? null;
    this.country = data.country ?? null;
  }

  toJSON() {
    const obj = {};
    if (this.content != null) obj.content = this.content;
    if (this.language != null) obj.language = this.language;
    if (this.script != null) obj.script = this.script;
    if (this.system != null) obj.system = this.system;
    if (this.country != null) obj.country = this.country;
    return obj;
  }

  static fromJSON(data) {
    return new Pronunciation(data);
  }
}
