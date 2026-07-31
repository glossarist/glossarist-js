import { GlossaristModel } from './base.js';

export interface LocalityJson {
  type?: string | null;
  reference_from?: string | null;
  referenceFrom?: string | null;
  reference_to?: string | null;
  referenceTo?: string | null;
}

export class Locality extends GlossaristModel {
  readonly type: string | null;
  readonly referenceFrom: string | null;
  readonly referenceTo: string | null;

  constructor(data: LocalityJson = {}) {
    super();
    this.type = data.type ?? null;
    this.referenceFrom = data.reference_from ?? data.referenceFrom ?? null;
    this.referenceTo = data.reference_to ?? data.referenceTo ?? null;
  }

  override toJSON(): LocalityJson {
    const obj: LocalityJson = {};
    if (this.type != null) obj.type = this.type;
    if (this.referenceFrom != null) obj.reference_from = this.referenceFrom;
    if (this.referenceTo != null) obj.reference_to = this.referenceTo;
    return obj;
  }

  static override fromJSON(data: LocalityJson): Locality {
    return new Locality(data);
  }
}
