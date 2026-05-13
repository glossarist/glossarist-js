import { GlossaristModel } from './base.js';

export class ConceptReference extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.conceptId = data.concept_id ?? data.conceptId ?? null;
    this.refType = data.ref_type ?? data.refType ?? null;
    this.source = data.source ?? null;
    this.urn = data.urn ?? null;
  }

  get isLocal() {
    return this.urn == null && this.source == null;
  }

  get isExternal() {
    return !this.isLocal;
  }

  static domain(conceptId) {
    return new ConceptReference({ concept_id: conceptId, ref_type: 'domain' });
  }

  toJSON() {
    const obj = {};
    if (this.conceptId != null) obj.concept_id = this.conceptId;
    if (this.refType != null) obj.ref_type = this.refType;
    if (this.source != null) obj.source = this.source;
    if (this.urn != null) obj.urn = this.urn;
    return obj;
  }

  static fromJSON(data) {
    return new ConceptReference(data);
  }
}
