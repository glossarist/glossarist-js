import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

export const RELATIONSHIP_TYPES = Object.freeze([
  'supersedes', 'superseded_by', 'extends', 'extended_by',
  'narrower', 'broader', 'equivalent', 'compare', 'contrast',
  'derived', 'deprecated', 'related',
]);

export class RelatedConcept extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.type = data.type ?? 'related';
    this.content = data.content ?? null;
    this.ref = data.ref
      ? (data.ref instanceof Citation ? data.ref : new Citation(data.ref))
      : null;
  }

  toJSON() {
    const obj = { type: this.type };
    if (this.content != null) obj.content = this.content;
    if (this.ref != null) obj.ref = this.ref.toJSON();
    return obj;
  }

  static fromJSON(data) {
    return new RelatedConcept(data);
  }
}
