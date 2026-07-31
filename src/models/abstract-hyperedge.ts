// AbstractHyperedge — shared base for directed 1→N hyperedges
// (PartitiveHyperedge, GenericHyperedge, SequentialHyperedge, future
// AssociativeHyperedge, etc.).
//
// Carries the common shape:
//   - comprehensive: ConceptRef
//   - members: 2+ MECE dimensioned concept refs (≥2 per ISO 704)
//   - completeness: complete | partial
//   - criterion: localized subdivision criterion (ISO 12620)
//   - sources / notes / status: administrative metadata
//
// See docs/design/abstract-hyperedge.md (concept-model repo).

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import type { ConceptRefJson } from './concept-ref.js';
import { DEFAULT_COMPLETENESS, isValidCompleteness } from './completeness.js';
import type { Completeness } from './completeness.js';
import type { HyperedgeMember } from './hyperedge-member.js';
import type { LocalizedString } from './generic-member.js';

export interface AbstractHyperedgeJson {
  comprehensive: ConceptRefJson;
  members: ReadonlyArray<unknown>;
  completeness: Completeness;
  criterion?: LocalizedString;
  sources?: ReadonlyArray<unknown>;
  notes?: Record<string, unknown> | null;
  status?: string | null;
  /** PartitiveHyperedge wire alias (only present on PartitiveHyperedge JSON). */
  partitives?: ReadonlyArray<unknown>;
}

export type CriterionInput = string | LocalizedString | null | undefined;

export abstract class AbstractHyperedge extends GlossaristModel {
  readonly comprehensive: ConceptRef;
  readonly members: ReadonlyArray<HyperedgeMember>;
  readonly completeness: Completeness;
  readonly criterion: LocalizedString | null;
  readonly sources: ReadonlyArray<unknown>;
  readonly notes: Record<string, unknown> | null;
  readonly status: string | null;

  constructor(
    data: AbstractHyperedgeJson = {
      comprehensive: {},
      members: [],
      completeness: 'complete',
    },
  ) {
    super();
    this.comprehensive = _ensureComprehensive(data.comprehensive);
    this.members = _ensureMembers(
      data.members,
      this.constructor.name,
    ) as ReadonlyArray<HyperedgeMember>;
    this.completeness = _resolveCompleteness(data.completeness);
    this.criterion = _normalizeCriterion(data.criterion);
    this.sources = Array.isArray(data.sources) ? [...data.sources] : [];
    this.notes = (data.notes as Record<string, unknown> | null) ?? null;
    this.status = data.status ?? null;

    _assertNoSelfLoop(this.comprehensive, this.members);
  }

  get isComplete(): boolean { return this.completeness === 'complete'; }
  get isPartial(): boolean { return this.completeness === 'partial'; }
  get isCoordinate(): boolean { return this.members.length >= 2; }

  hasCriterion(): boolean { return this.criterion != null; }

  override identity(): string {
    const Ctor = this.constructor as unknown as { identityOf: (v: unknown) => string };
    return Ctor.identityOf(this);
  }

  override toJSON(): AbstractHyperedgeJson {
    const obj: AbstractHyperedgeJson = {
      comprehensive: this.comprehensive.toJSON(),
      members: this.members.map((m) => m.toJSON()),
      completeness: this.completeness,
    };
    if (this.criterion != null) obj.criterion = { ...this.criterion };
    if (this.sources.length > 0) obj.sources = [...this.sources];
    if (this.notes != null) obj.notes = { ...this.notes };
    if (this.status != null) obj.status = this.status;
    return obj;
  }
}

function _ensureComprehensive(
  value: ConceptRefJson | ConceptRef | null | undefined,
): ConceptRef {
  const ref = value instanceof ConceptRef ? value : new ConceptRef(value ?? {});
  if (!ref.source && !ref.id && !ref.text) {
    throw new Error(
      'AbstractHyperedge.comprehensive must be a non-empty ConceptReference ' +
      '(source, id, or text required)',
    );
  }
  return ref;
}

function _ensureMembers(
  values: ReadonlyArray<unknown> | null | undefined,
  typeName: string,
): ReadonlyArray<unknown> {
  if (!Array.isArray(values)) {
    throw new Error(
      `${typeName}.members must be an array (got ${values === null ? 'null' : typeof values})`,
    );
  }
  if (values.length < 2) {
    throw new Error(
      `${typeName} requires ≥2 partitives (ISO 704); got ${values.length}`,
    );
  }
  return values;
}

function _resolveCompleteness(
  value: Completeness | null | undefined,
): Completeness {
  const c = value ?? DEFAULT_COMPLETENESS;
  if (!isValidCompleteness(c)) {
    throw new Error(
      `completeness has invalid value ${JSON.stringify(value)}`,
    );
  }
  return c;
}

function _normalizeCriterion(value: CriterionInput): LocalizedString | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    return value.length > 0 ? { default: value } : null;
  }
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

function _assertNoSelfLoop(
  comprehensive: ConceptRef,
  members: ReadonlyArray<{ ref?: { source?: string | null; id?: string | null } }>,
): void {
  const cKey = `${comprehensive.source ?? ''}:${comprehensive.id ?? ''}`;
  for (const m of members) {
    const ref = m.ref;
    const pKey = `${ref?.source ?? ''}:${ref?.id ?? ''}`;
    if (pKey === cKey && (ref?.source || ref?.id)) {
      throw new Error(
        'Relation.members cannot include the comprehensive (no self-loops)',
      );
    }
  }
}
