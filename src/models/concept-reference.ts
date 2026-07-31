import { GlossaristModel } from './base.js';

export interface ConceptReferenceJson {
  concept_id?: string | null;
  conceptId?: string | null;
  ref_type?: string | null;
  refType?: string | null;
  source?: string | null;
  urn?: string | null;
}

export class ConceptReference extends GlossaristModel {
  readonly conceptId: string | null;
  readonly refType: string | null;
  readonly source: string | null;
  readonly urn: string | null;

  constructor(data: ConceptReferenceJson = {}) {
    super();
    this.conceptId = data.concept_id ?? data.conceptId ?? null;
    this.refType = data.ref_type ?? data.refType ?? null;
    this.source = data.source ?? null;
    this.urn = data.urn ?? null;
  }

  get isLocal(): boolean {
    return this.urn == null && this.source == null;
  }

  get isExternal(): boolean {
    return !this.isLocal;
  }

  static domain(conceptId: string): ConceptReference {
    return new ConceptReference({ concept_id: conceptId, ref_type: 'domain' });
  }

  override toJSON(): ConceptReferenceJson {
    const obj: ConceptReferenceJson = {};
    if (this.conceptId != null) obj.concept_id = this.conceptId;
    if (this.refType != null) obj.ref_type = this.refType;
    if (this.source != null) obj.source = this.source;
    if (this.urn != null) obj.urn = this.urn;
    return obj;
  }

  static override fromJSON(data: ConceptReferenceJson): ConceptReference {
    return new ConceptReference(data);
  }
}
