import { GlossaristModel } from './base.js';

export const DATE_TYPES = Object.freeze([
  'accepted', 'amended', 'retired',
]);

export class ConceptDate extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.date = data.date ?? null;
    this.type = data.type ?? null;
  }

  get parsedDate() {
    return this.date ? new Date(this.date) : null;
  }

  static identityOf(value) {
    return value?.type ?? '';
  }

  identity() {
    return ConceptDate.identityOf(this);
  }

  toJSON() {
    const obj = {};
    if (this.date != null) obj.date = this.date;
    if (this.type != null) obj.type = this.type;
    return obj;
  }

  static fromJSON(data) {
    return new ConceptDate(data);
  }
}
