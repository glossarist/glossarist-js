import { GlossaristModel } from './base.js';

/**
 * Wire shape for ConceptRef. All three fields are optional on input
 * (any one is enough to identify a concept; usually source+id pair).
 * `text` is a free-form fallback for references that have no
 * machine-readable source.
 */
export interface ConceptRefJson {
  source?: string | null;
  id?: string | null;
  text?: string | null;
}

/**
 * ConceptRef — a reference to a concept by (source, id) pair, or by
 * free-form text when no machine-readable source exists.
 *
 * Identity: `${source ?? ''}|${id ?? ''}`. Two refs with the same
 * (source, id) are equal regardless of `text`.
 */
export class ConceptRef extends GlossaristModel {
  readonly source: string | null;
  readonly id: string | null;
  readonly text: string | null;

  constructor(data: ConceptRefJson = {}) {
    super();
    this.source = data.source ?? null;
    this.id = data.id ?? null;
    this.text = data.text ?? null;
  }

  override toString(): string {
    const parts: string[] = [];
    if (this.source) parts.push(this.source);
    if (this.id) parts.push(this.id);
    const base = parts.join(' ');
    if (this.text && base) return `${base} (${this.text})`;
    if (this.text) return this.text;
    return base;
  }

  override toJSON(): ConceptRefJson {
    const obj: ConceptRefJson = {};
    if (this.source != null) obj.source = this.source;
    if (this.id != null) obj.id = this.id;
    if (this.text != null) obj.text = this.text;
    return obj;
  }

  override identity(): string {
    return `${this.source ?? ''}|${this.id ?? ''}`;
  }

  static override fromJSON(data: ConceptRefJson): ConceptRef {
    return new ConceptRef(data);
  }

  /** Convenience constructor for the common `(source, id)` form. */
  static fromPair(source: string, id: string): ConceptRef {
    return new ConceptRef({ source, id });
  }
}
