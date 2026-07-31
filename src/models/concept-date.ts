import { GlossaristModel } from './base.js';

export type ConceptDateType = 'accepted' | 'amended' | 'retired' | string;

export const DATE_TYPES: ReadonlyArray<string> = Object.freeze([
  'accepted',
  'amended',
  'retired',
]);

export interface ConceptDateJson {
  date?: string | null;
  type?: ConceptDateType | null;
}

export class ConceptDate extends GlossaristModel {
  readonly date: string | null;
  readonly type: ConceptDateType | null;

  constructor(data: ConceptDateJson = {}) {
    super();
    this.date = data.date ?? null;
    this.type = data.type ?? null;
  }

  get parsedDate(): Date | null {
    return this.date ? new Date(this.date) : null;
  }

  static identityOf(value: { type?: ConceptDateType | null } | null | undefined): string {
    return value?.type ?? '';
  }

  override identity(): string {
    return ConceptDate.identityOf(this);
  }

  override toJSON(): ConceptDateJson {
    const obj: ConceptDateJson = {};
    if (this.date != null) obj.date = this.date;
    if (this.type != null) obj.type = this.type;
    return obj;
  }

  static override fromJSON(data: ConceptDateJson): ConceptDate {
    return new ConceptDate(data);
  }
}
