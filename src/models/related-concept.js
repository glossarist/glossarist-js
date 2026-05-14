import { GlossaristModel } from './base.js';

export const RELATIONSHIP_TYPES = Object.freeze([
  // Lifecycle
  'deprecates', 'supersedes', 'superseded_by',
  // Hierarchical (SKOS)
  'broader', 'narrower',
  // ISO 25964 generic
  'broader_generic', 'narrower_generic',
  // ISO 25964 partitive
  'broader_partitive', 'narrower_partitive',
  // ISO 25964 instantial
  'broader_instantial', 'narrower_instantial',
  // SKOS mapping
  'equivalent', 'close_match', 'broad_match', 'narrow_match', 'related_match',
  // Associative (SKOS)
  'see', 'related_concept', 'related_concept_broader', 'related_concept_narrower',
  // Comparative
  'compare', 'contrast',
  // Spatiotemporal
  'sequentially_related', 'spatially_related', 'temporally_related',
  // Lexical
  'homograph', 'false_friend',
  // Designation-level
  'abbreviated_form_for', 'short_form_for',
]);

export class RelatedConcept extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.type = data.type ?? 'see';
    this.content = data.content ?? null;
    this.ref = data.ref ?? null;
  }

  toJSON() {
    const obj = { type: this.type };
    if (this.content != null) obj.content = this.content;
    if (this.ref != null) obj.ref = this.ref;
    return obj;
  }

  static fromJSON(data) {
    return new RelatedConcept(data);
  }
}
