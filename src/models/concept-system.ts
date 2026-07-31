// ConceptSystem — first-class concept system entity per ISO 12620 A.7.
//
// Promotes the previously-implicit concept system (domains + tags +
// relation graph) to an explicit first-class entity. Per-file at
// `concept-systems/<id>.yaml`.
//
// See docs/design/concept-systems.md (concept-model repo).

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  CONCEPT_SYSTEM_TYPE,
  CONCEPT_SYSTEM_TYPE_VALUES,
  isValidConceptSystemType,
} from './concept-system-type.js';
import type { LocalizedString } from './generic-member.js';

export interface ConceptSystemJson {
  id: string;
  name: LocalizedString;
  type: string;
  domain?: string | null;
  purpose?: LocalizedString | null;
  members: ReadonlyArray<unknown>;
  hyperedges?: ReadonlyArray<unknown>;
  rootConcepts?: ReadonlyArray<unknown>;
  sources?: ReadonlyArray<unknown>;
  status?: string | null;
}

export type ConceptSystemType = string;

export class ConceptSystem extends GlossaristModel {
  readonly id: string;
  readonly name: LocalizedString;
  readonly type: ConceptSystemType;
  readonly domain: string | null;
  readonly purpose: LocalizedString | null;
  readonly members: ReadonlyArray<ConceptRef>;
  readonly hyperedges: ReadonlyArray<unknown>;
  readonly rootConcepts: ReadonlyArray<ConceptRef>;
  readonly sources: ReadonlyArray<unknown>;
  readonly status: string | null;

  constructor(data: Partial<ConceptSystemJson> = {}) {
    super();
    this.id = _ensureNonEmptyString(data.id, 'id');
    this.name = _ensureName(data.name);
    this.type = _resolveType(data.type);
    this.domain = data.domain ?? null;
    this.purpose = data.purpose ?? null;
    this.members = _ensureMembers(data.members);
    this.hyperedges = Array.isArray(data.hyperedges) ? [...data.hyperedges] : [];
    this.rootConcepts = Array.isArray(data.rootConcepts)
      ? data.rootConcepts.map((c) =>
          c instanceof ConceptRef ? c : new ConceptRef(c as { source?: string; id?: string; text?: string }),
        )
      : [];
    this.sources = Array.isArray(data.sources) ? [...data.sources] : [];
    this.status = data.status ?? null;
  }

  get isGeneric(): boolean     { return this.type === CONCEPT_SYSTEM_TYPE.GENERIC; }
  get isPartitive(): boolean   { return this.type === CONCEPT_SYSTEM_TYPE.PARTITIVE; }
  get isSequential(): boolean  { return this.type === CONCEPT_SYSTEM_TYPE.SEQUENTIAL; }
  get isAssociative(): boolean { return this.type === CONCEPT_SYSTEM_TYPE.ASSOCIATIVE; }
  get isMixed(): boolean       { return this.type === CONCEPT_SYSTEM_TYPE.MIXED; }

  hasHyperedge(edgeId: string): boolean {
    return (this.hyperedges as ReadonlyArray<string>).includes(edgeId);
  }

  hasMember(refOrUri: string | { source?: string | null; id?: string | null } | null | undefined): boolean {
    const uri = typeof refOrUri === 'string' ? refOrUri : _refUri(refOrUri);
    return this.members.some((m) => _refUri(m) === uri);
  }

  override identity(): string {
    return this.id;
  }

  override toJSON(): ConceptSystemJson {
    const obj: ConceptSystemJson = {
      id: this.id,
      name: { ...this.name },
      type: this.type,
      members: this.members.map((m) => m.toJSON()),
    };
    if (this.domain != null) obj.domain = this.domain;
    if (this.purpose != null) obj.purpose = { ...this.purpose };
    if (this.hyperedges.length > 0) obj.hyperedges = [...this.hyperedges];
    if (this.rootConcepts.length > 0) obj.rootConcepts = this.rootConcepts.map((c) => c.toJSON());
    if (this.sources.length > 0) obj.sources = [...this.sources];
    if (this.status != null) obj.status = this.status;
    return obj;
  }

  static override fromJSON(data: ConceptSystemJson): ConceptSystem {
    return new ConceptSystem(data);
  }
}

function _ensureNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`ConceptSystem#${fieldName} must be a non-empty string`);
  }
  return value;
}

function _ensureName(value: LocalizedString | null | undefined): LocalizedString {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('ConceptSystem#name must be a localized object (e.g. { eng: "..." })');
  }
  return { ...value };
}

function _resolveType(value: unknown): ConceptSystemType {
  if (value == null) {
    throw new Error(
      'ConceptSystem#type is required; one of ' +
      CONCEPT_SYSTEM_TYPE_VALUES.join(', '),
    );
  }
  if (!isValidConceptSystemType(value)) {
    throw new Error(
      `ConceptSystem#type ${JSON.stringify(value)} invalid; ` +
      `must be one of: ${CONCEPT_SYSTEM_TYPE_VALUES.join(', ')}`,
    );
  }
  return value;
}

function _ensureMembers(values: ReadonlyArray<unknown> | null | undefined): ReadonlyArray<ConceptRef> {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('ConceptSystem#members must be a non-empty array');
  }
  return values.map((v) =>
    v instanceof ConceptRef
      ? v
      : new ConceptRef(v as { source?: string; id?: string; text?: string }),
  );
}

function _refUri(
  ref: { ref?: { source?: string | null; id?: string | null } | null; source?: string | null; id?: string | null } | null | undefined,
): string {
  const inner = ref?.ref ?? ref ?? {};
  return `${inner.source ?? ''}:${inner.id ?? ''}`;
}

export default ConceptSystem;
