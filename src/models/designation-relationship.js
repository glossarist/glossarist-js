import { GlossaristModel } from './base.js';

export const DESIGNATION_RELATIONSHIP_TYPES = Object.freeze([
  // TBX (ISO 30042) / ISO 12620 term-level relationships
  'abbreviated_form_for', 'short_form_for',
]);

export class DesignationRelationship extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.type = data.type ?? null;
    this.content = data.content ?? null;
    this.target = data.target ?? null;
  }

  toJSON() {
    const obj = {};
    if (this.type != null) obj.type = this.type;
    if (this.content != null) obj.content = this.content;
    if (this.target != null) obj.target = this.target;
    return obj;
  }

  static fromJSON(data) {
    return new DesignationRelationship(data);
  }
}
