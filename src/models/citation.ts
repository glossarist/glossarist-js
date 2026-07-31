import { GlossaristModel } from './base.js';
import { Locality } from './locality.js';
import type { LocalityJson } from './locality.js';

export interface CitationRefJson {
  source?: string | null;
  id?: string | null;
  version?: string | null;
}

export interface CitationJson {
  ref?: CitationRefJson | CitationRef | null;
  locality?: LocalityJson | Locality | null;
  link?: string | null;
  original?: string | null;
  custom_locality?: string | null;
  customLocality?: string | null;
}

export class CitationRef extends GlossaristModel {
  readonly source: string | null;
  readonly id: string | null;
  readonly version: string | null;

  constructor(data: CitationRefJson = {}) {
    super();
    this.source = data.source ?? null;
    this.id = data.id ?? null;
    this.version = data.version ?? null;
  }

  override toString(): string {
    const parts: string[] = [];
    if (this.source) parts.push(this.source);
    if (this.id) parts.push(this.id);
    return parts.join(' ');
  }

  override toJSON(): CitationRefJson {
    const obj: CitationRefJson = {};
    if (this.source != null) obj.source = this.source;
    if (this.id != null) obj.id = this.id;
    if (this.version != null) obj.version = this.version;
    return obj;
  }

  static override fromJSON(data: CitationRefJson): CitationRef {
    return new CitationRef(data);
  }
}

export class Citation extends GlossaristModel {
  /** Backward-compat alias for {@link CitationRef}. Original codebase
   *  exposed the Ref class via `Citation.Ref`; keep that working. */
  static readonly Ref = CitationRef;

  readonly ref: CitationRef | null;
  readonly locality: Locality | null;
  readonly link: string | null;
  readonly original: string | null;
  readonly customLocality: string | null;

  constructor(data: CitationJson | null = {}) {
    super();
    const d = data ?? {};
    this.ref = d.ref
      ? d.ref instanceof CitationRef
        ? d.ref
        : new CitationRef(d.ref)
      : null;
    this.locality = d.locality
      ? d.locality instanceof Locality
        ? d.locality
        : new Locality(d.locality)
      : null;
    this.link = d.link ?? null;
    this.original = d.original ?? null;
    this.customLocality = d.custom_locality ?? d.customLocality ?? null;
  }

  override toString(): string {
    return this.ref ? this.ref.toString() : '';
  }

  override toJSON(): CitationJson {
    const obj: CitationJson = {};
    if (this.ref != null) obj.ref = this.ref.toJSON();
    if (this.locality != null) obj.locality = this.locality.toJSON();
    if (this.link != null) obj.link = this.link;
    if (this.original != null) obj.original = this.original;
    if (this.customLocality != null) obj.custom_locality = this.customLocality;
    return obj;
  }

  static override fromJSON(data: CitationJson): Citation {
    return new Citation(data);
  }
}
