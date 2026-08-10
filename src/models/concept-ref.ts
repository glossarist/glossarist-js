import { GlossaristModel } from './base.js';

/**
 * Wire shape for ConceptRef.
 *
 * Four mutually exclusive forms:
 *   1. {source, id}       — resolved reference to a concept
 *   2. {text}             — text-only inline form (label)
 *   3. {text, external}   — external concept (defined elsewhere)
 *   4. {ellipsis}         — ellipsis marker ("further members exist")
 *
 * `external` is mutually exclusive with source/id (external concepts
 * don't have a machine-readable handle in this dataset).
 * `ellipsis` is mutually exclusive with everything else.
 */
export interface ConceptRefJson {
  source?: string | null;
  id?: string | null;
  text?: string | null;
  external?: boolean;
  ellipsis?: boolean;
}

/**
 * ConceptRef — a reference to a concept.
 *
 * Identity: for resolved refs, `${source}|${id}`. For external refs,
 * `ext:${text}`. For ellipsis, `ellipsis` (a single sentinel identity
 * shared by all ellipsis members within the same hyperedge). For
 * text-only, `text:${text}`.
 */
export class ConceptRef extends GlossaristModel {
  readonly source: string | null;
  readonly id: string | null;
  readonly text: string | null;
  readonly external: boolean;
  readonly ellipsis: boolean;

  constructor(data: ConceptRefJson = {}) {
    super();
    this.source = data.source ?? null;
    this.id = data.id ?? null;
    this.text = data.text ?? null;
    this.external = data.external === true;
    this.ellipsis = data.ellipsis === true;

    _validateConceptRef(this);
  }

  get isResolved(): boolean {
    return this.source != null && this.id != null;
  }

  get isExternal(): boolean {
    return this.external === true;
  }

  get isEllipsis(): boolean {
    return this.ellipsis === true;
  }

  get isTextOnly(): boolean {
    return this.text != null && !this.isResolved && !this.isExternal;
  }

  override toString(): string {
    if (this.ellipsis) return '...';
    const parts: string[] = [];
    if (this.source) parts.push(this.source);
    if (this.id) parts.push(this.id);
    const base = parts.join(' ');
    if (this.text && base) return `${base} (${this.text})`;
    if (this.text) return this.text;
    return base;
  }

  override toJSON(): ConceptRefJson {
    if (this.ellipsis) return { ellipsis: true };
    const obj: ConceptRefJson = {};
    if (this.source != null) obj.source = this.source;
    if (this.id != null) obj.id = this.id;
    if (this.text != null) obj.text = this.text;
    if (this.external) obj.external = true;
    return obj;
  }

  override identity(): string {
    if (this.ellipsis) return 'ellipsis';
    if (this.external) return `ext:${this.text ?? ''}`;
    if (this.isResolved) return `${this.source ?? ''}|${this.id ?? ''}`;
    return `text:${this.text ?? ''}`;
  }

  static override fromJSON(data: ConceptRefJson): ConceptRef {
    return new ConceptRef(data);
  }

  /** Convenience constructor for the common `(source, id)` form. */
  static fromPair(source: string, id: string): ConceptRef {
    return new ConceptRef({ source, id });
  }

  /** Convenience constructor for the external form. */
  static external(text: string): ConceptRef {
    return new ConceptRef({ text, external: true });
  }

  /** Convenience constructor for the ellipsis sentinel. */
  static ellipsis(): ConceptRef {
    return new ConceptRef({ ellipsis: true });
  }
}

function _validateConceptRef(ref: ConceptRef): void {
  if (ref.ellipsis && (ref.source || ref.id || ref.text || ref.external)) {
    throw new Error(
      'ConceptRef: ellipsis is mutually exclusive with all other fields',
    );
  }
  if (ref.external && (ref.source || ref.id)) {
    throw new Error(
      'ConceptRef: external is mutually exclusive with source/id',
    );
  }
  if (!ref.source && !ref.id && !ref.text && !ref.ellipsis) {
    throw new Error(
      'ConceptRef must have (source,id), text, or ellipsis',
    );
  }
}
