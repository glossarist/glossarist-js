import { GlossaristModel } from './base.js';

export type GrammarGender = 'm' | 'f' | 'n' | 'c' | string;
export type GrammarNumber = 'singular' | 'dual' | 'plural' | string;
export type GrammarPartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adj'
  | 'adverb'
  | 'preposition'
  | 'participle'
  | string;

export const GRAMMAR_GENDERS: ReadonlyArray<string> = Object.freeze([
  'm', 'f', 'n', 'c',
]);
export const GRAMMAR_NUMBERS: ReadonlyArray<string> = Object.freeze([
  'singular', 'dual', 'plural',
]);
export const GRAMMAR_PARTS_OF_SPEECH: ReadonlyArray<string> = Object.freeze([
  'noun', 'verb', 'adj', 'adverb', 'preposition', 'participle',
]);

export interface GrammarInfoJson {
  gender?: GrammarGender | null;
  number?: GrammarNumber | null;
  part_of_speech?: GrammarPartOfSpeech | null;
  partOfSpeech?: GrammarPartOfSpeech | null;
  noun?: boolean;
  verb?: boolean;
  adj?: boolean;
  adverb?: boolean;
  preposition?: boolean;
  participle?: boolean;
}

export class GrammarInfo extends GlossaristModel {
  readonly gender: GrammarGender | null;
  readonly number: GrammarNumber | null;
  readonly partOfSpeech: GrammarPartOfSpeech | null;
  readonly noun: boolean;
  readonly verb: boolean;
  readonly adj: boolean;
  readonly adverb: boolean;
  readonly preposition: boolean;
  readonly participle: boolean;

  constructor(data: GrammarInfoJson = {}) {
    super();
    this.gender = data.gender ?? null;
    this.number = data.number ?? null;
    this.partOfSpeech = data.part_of_speech ?? data.partOfSpeech ?? null;
    this.noun = data.noun ?? false;
    this.verb = data.verb ?? false;
    this.adj = data.adj ?? false;
    this.adverb = data.adverb ?? false;
    this.preposition = data.preposition ?? false;
    this.participle = data.participle ?? false;
  }

  override toJSON(): GrammarInfoJson {
    const obj: GrammarInfoJson = {};
    if (this.gender != null) obj.gender = this.gender;
    if (this.number != null) obj.number = this.number;
    if (this.partOfSpeech != null) obj.part_of_speech = this.partOfSpeech;
    if (this.noun) obj.noun = true;
    if (this.verb) obj.verb = true;
    if (this.adj) obj.adj = true;
    if (this.adverb) obj.adverb = true;
    if (this.preposition) obj.preposition = true;
    if (this.participle) obj.participle = true;
    return obj;
  }

  static override fromJSON(data: GrammarInfoJson): GrammarInfo {
    return new GrammarInfo(data);
  }
}
