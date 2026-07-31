import { GlossaristModel } from './base.js';

export interface PronunciationJson {
  content?: string | null;
  language?: string | null;
  script?: string | null;
  system?: string | null;
  country?: string | null;
}

export class Pronunciation extends GlossaristModel {
  readonly content: string | null;
  readonly language: string | null;
  readonly script: string | null;
  readonly system: string | null;
  readonly country: string | null;

  constructor(data: PronunciationJson = {}) {
    super();
    this.content = data.content ?? null;
    this.language = data.language ?? null;
    this.script = data.script ?? null;
    this.system = data.system ?? null;
    this.country = data.country ?? null;
  }

  override toJSON(): PronunciationJson {
    const obj: PronunciationJson = {};
    if (this.content != null) obj.content = this.content;
    if (this.language != null) obj.language = this.language;
    if (this.script != null) obj.script = this.script;
    if (this.system != null) obj.system = this.system;
    if (this.country != null) obj.country = this.country;
    return obj;
  }

  static override fromJSON(data: PronunciationJson): Pronunciation {
    return new Pronunciation(data);
  }
}
