import { GlossaristModel } from './base.js';
import { Citation } from './citation.js';

export class ConceptSource extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.id = data.id ?? null;
    this.status = data.status ?? null;
    this.type = data.type ?? null;
    this.origin = data.origin
      ? (data.origin instanceof Citation ? data.origin : new Citation(data.origin))
      : null;
    this.modification = data.modification ?? null;
    this.sourcedFrom = (data.sourcedFrom ?? data.sourced_from ?? []).map(
      c => c instanceof Citation ? c : new Citation(c)
    );
  }

  // Backward-compat alias for callers using the snake_case JS field name.
  // Prefer `.sourcedFrom` going forward; the wire name remains
  // `sourced_from` (see toJSON).
  get sourced_from() {
    return this.sourcedFrom;
  }

  toJSON() {
    const obj = {};
    if (this.id != null) obj.id = this.id;
    if (this.status != null) obj.status = this.status;
    if (this.type != null) obj.type = this.type;
    if (this.origin != null) obj.origin = this.origin.toJSON();
    if (this.modification != null) obj.modification = this.modification;
    if (this.sourcedFrom.length > 0) {
      obj.sourced_from = this.sourcedFrom.map(c => c.toJSON());
    }
    return obj;
  }

  static identityOf(value) {
    const v = value ?? {};
    const ref = v?.origin?.ref ?? (v?.origin instanceof Citation ? v.origin.ref : null);
    return `${v.type ?? ''}|${ref?.source ?? ''}|${ref?.id ?? ''}`;
  }

  identity() {
    return ConceptSource.identityOf(this);
  }

  static fromJSON(data) {
    return new ConceptSource(data);
  }
}
