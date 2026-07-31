import { GlossaristModel } from './base.js';

export const DESIGNATION_RELATIONSHIP_TYPES: ReadonlyArray<string> = Object.freeze([
  // TBX (ISO 30042) / ISO 12620 term-level relationships
  'abbreviated_form_for', 'short_form_for',
]);

export type DesignationRelationshipType = string;

export interface DesignationRelationshipJson {
  type?: DesignationRelationshipType | null;
  content?: string | null;
  target?: string | null;
}

export class DesignationRelationship extends GlossaristModel {
  readonly type: DesignationRelationshipType | null;
  readonly content: string | null;
  readonly target: string | null;

  constructor(data: DesignationRelationshipJson = {}) {
    super();
    this.type = data.type ?? null;
    this.content = data.content ?? null;
    this.target = data.target ?? null;
  }

  override toJSON(): DesignationRelationshipJson {
    const obj: DesignationRelationshipJson = {};
    if (this.type != null) obj.type = this.type;
    if (this.content != null) obj.content = this.content;
    if (this.target != null) obj.target = this.target;
    return obj;
  }

  static override fromJSON(data: DesignationRelationshipJson): DesignationRelationship {
    return new DesignationRelationship(data);
  }
}
