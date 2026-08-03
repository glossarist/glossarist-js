import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import type { ConceptRefJson } from './concept-ref.js';
import type { LocalizedString } from './generic-member.js';

export const RELATIONSHIP_TYPES: ReadonlyArray<string> = Object.freeze([
  // Lifecycle (ISO 10241-1)
  'deprecates', 'deprecated_by', 'supersedes', 'superseded_by',
  'replaces', 'replaced_by', 'invalidates', 'invalidated_by',
  'retires', 'retired_by',
  // Hierarchical (SKOS)
  'broader', 'narrower',
  // ISO 25964 generic
  'broader_generic', 'narrower_generic',
  // ISO 25964 partitive
  'broader_partitive', 'narrower_partitive',
  // ISO 25964 instantial
  'broader_instantial', 'narrower_instantial',
  // ISO 19135 concept-to-concept
  'has_concept', 'is_concept_of', 'instance_of', 'has_instance',
  'has_definition', 'definition_of', 'has_part', 'is_part_of',
  'inherits', 'inherited_by',
  // ISO 19135 versioning
  'has_version', 'version_of', 'current_version', 'current_version_of',
  // SKOS mapping
  'equivalent', 'close_match', 'broad_match', 'narrow_match', 'related_match',
  // Associative (ISO 10241-1 / ISO 25964)
  'see', 'related_concept', 'related_concept_broader', 'related_concept_narrower',
  'references',
  // ExternalConcept resolution (Glossarist extension). Direction: real
  // concept `provides` substance for an external concept; external concept
  // `provided_by` real concept. Stored on the ExternalConcept.
  'provides', 'provided_by',
  // Comparative (ISO 10241-1)
  'compare', 'contrast',
  // Spatiotemporal (ISO 25964 / TBX)
  'sequentially_related_concept', 'spatially_related_concept', 'temporally_related_concept',
  // Lexical (ISO 12620 / TBX)
  'homograph', 'false_friend',
]);

export type RelationshipType = string;

export interface RelatedConceptJson {
  type?: RelationshipType;
  content?: LocalizedString | string | null;
  ref?: ConceptRefJson | ConceptRef | null;
  /** Resolved concept URI for cross-dataset relations (e.g. supersedes links). */
  target?: string | null;
}

export class RelatedConcept extends GlossaristModel {
  readonly type: RelationshipType;
  readonly content: LocalizedString | null;
  readonly ref: ConceptRef | null;
  readonly target: string | null;

  constructor(data: RelatedConceptJson = {}) {
    super();
    this.type = data.type ?? 'see';
    this.content = _normalizeContent(data.content);
    this.ref = data.ref
      ? data.ref instanceof ConceptRef
        ? data.ref
        : new ConceptRef(data.ref)
      : null;
    this.target = data.target ?? null;
  }

  /**
   * Convenience reader: returns the first available string value from
   * the localized hash, or null if absent.
   */
  get contentString(): string | null {
    if (!this.content) return null;
    const values = Object.values(this.content);
    return values.length > 0 ? (values[0] ?? null) : null;
  }

  override toJSON(): RelatedConceptJson {
    const obj: RelatedConceptJson = { type: this.type };
    if (this.content != null) obj.content = this.content;
    if (this.ref != null) obj.ref = this.ref.toJSON();
    if (this.target != null) obj.target = this.target;
    return obj;
  }

  static identityOf(
    value: {
      type?: string;
      ref?: { source?: string | null; id?: string | null } | null;
    } | null | undefined,
  ): string {
    const v = value ?? {};
    const ref = v.ref;
    return `${v.type ?? ''}|${ref?.source ?? ''}|${ref?.id ?? ''}`;
  }

  override identity(): string {
    return RelatedConcept.identityOf(this);
  }

  static override fromJSON(data: RelatedConceptJson): RelatedConcept {
    return new RelatedConcept(data);
  }
}

function _normalizeContent(
  value: LocalizedString | string | null | undefined,
): LocalizedString | null {
  if (value == null) return null;
  if (typeof value === 'string') return { default: value };
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(
      ([, v]) => typeof v === 'string',
    );
    return entries.length > 0
      ? (Object.fromEntries(entries) as LocalizedString)
      : null;
  }
  return null;
}
