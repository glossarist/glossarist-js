import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

/**
 * Local Citation wire-shape alias. Until `citation.ts` lands (Phase
 * 2b), Citation is untyped JS; this alias gives the cross-references
 * a typed shape without forcing the conversion order. When
 * `citation.ts` exports its own `CitationJson`, replace this with
 * `import type { CitationJson } from './citation.js'`.
 */
export interface CitationJson {
  ref?: { source?: string | null; id?: string | null; text?: string | null } | null;
}

export interface ConceptSourceJson {
  id?: string | null;
  status?: string | null;
  type?: string | null;
  origin?: CitationJson | Citation | null;
  modification?: string | null;
  sourcedFrom?: ReadonlyArray<CitationJson | Citation> | null;
  sourced_from?: ReadonlyArray<CitationJson | Citation> | null;
}

export class ConceptSource extends GlossaristModel {
  readonly id: string | null;
  readonly status: string | null;
  readonly type: string | null;
  readonly origin: Citation | null;
  readonly modification: string | null;
  readonly sourcedFrom: ReadonlyArray<Citation>;

  constructor(data: ConceptSourceJson = {}) {
    super();
    this.id = data.id ?? null;
    this.status = data.status ?? null;
    this.type = data.type ?? null;
    this.origin = data.origin
      ? data.origin instanceof Citation
        ? data.origin
        : new Citation(data.origin)
      : null;
    this.modification = data.modification ?? null;
    const sourcedRaw = data.sourcedFrom ?? data.sourced_from ?? [];
    this.sourcedFrom = sourcedRaw.map((c) =>
      c instanceof Citation ? c : new Citation(c),
    );
  }

  /**
   * Backward-compat alias for callers using the snake_case JS field
   * name. Prefer `.sourcedFrom` going forward; the wire name remains
   * `sourced_from` (see toJSON).
   */
  get sourced_from(): ReadonlyArray<Citation> {
    return this.sourcedFrom;
  }

  override toJSON(): ConceptSourceJson {
    const obj: ConceptSourceJson = {};
    if (this.id != null) obj.id = this.id;
    if (this.status != null) obj.status = this.status;
    if (this.type != null) obj.type = this.type;
    if (this.origin != null) obj.origin = this.origin.toJSON();
    if (this.modification != null) obj.modification = this.modification;
    if (this.sourcedFrom.length > 0) {
      obj.sourced_from = this.sourcedFrom.map((c) => c.toJSON());
    }
    return obj;
  }

  static identityOf(
    value: {
      type?: string | null;
      origin?: CitationJson | Citation | { ref?: { source?: string; id?: string } | null } | null;
    } | null | undefined,
  ): string {
    const v = value ?? {};
    const origin = v.origin as CitationJson | Citation | { ref?: { source?: string; id?: string } | null } | null | undefined;
    const ref =
      origin instanceof Citation
        ? origin.ref
        : origin && typeof origin === 'object'
          ? (origin as { ref?: { source?: string; id?: string } | null }).ref
          : null;
    return `${v.type ?? ''}|${ref?.source ?? ''}|${ref?.id ?? ''}`;
  }

  override identity(): string {
    return ConceptSource.identityOf(this);
  }

  static override fromJSON(data: ConceptSourceJson): ConceptSource {
    return new ConceptSource(data);
  }
}
