// External concept detection utilities.
//
// ISO 704:2022 diagrams distinguish "external concepts" — concepts
// referenced from this dataset but defined elsewhere. They are rendered
// with parentheses: `(precision condition of measurement)` instead of
// `precision condition of measurement`.
//
// External detection requires concept resolution (looking up the
// referenced concept's status), which is a consumer concern. These
// utilities take a `ConceptStore` abstraction so the model layer stays
// pure — the caller decides how to resolve refs (in-memory map, async
// fetch, etc.).
//
// Per TODO 14 (external-concepts-ellipsis-rendering).

import type { ConceptRef } from '../models/concept-ref.js';

/** Minimal concept shape these utilities need. */
export interface ExternalConceptLike {
  status?: string | null;
  related?: ReadonlyArray<{ type?: string }>;
}

/** Lookup interface the caller provides. */
export interface ConceptStore {
  lookup(
    ref: ConceptRef | RefShape | null | undefined,
  ): ExternalConceptLike | null | undefined;
}

interface RefShape {
  source?: string | null;
  id?: string | null;
  text?: string | null;
}

interface MemberLike {
  ref?: ConceptRef | RefShape | null;
}

interface HyperedgeLike {
  comprehensive?: ConceptRef | RefShape | null;
  members?: ReadonlyArray<MemberLike>;
  partitives?: ReadonlyArray<MemberLike>;
}

const PROVIDED_BY_TYPES = new Set(['provided_by', 'provides']);

export function isExternalConcept(
  concept: ExternalConceptLike | null | undefined,
): boolean {
  return concept?.status === 'external';
}

export function isExternalMember(
  member: MemberLike | null | undefined,
  store: ConceptStore,
): boolean {
  if (!member) return false;
  return isExternalConcept(store.lookup(member.ref ?? null));
}

export function isExternalComprehensive(
  hyperedge: HyperedgeLike,
  store: ConceptStore,
): boolean {
  if (!hyperedge?.comprehensive) return false;
  return isExternalConcept(store.lookup(hyperedge.comprehensive));
}

export function getExternalMembers(
  hyperedge: HyperedgeLike,
  store: ConceptStore,
): MemberLike[] {
  const members = hyperedge?.members ?? hyperedge?.partitives ?? [];
  return members.filter(m => isExternalMember(m, store));
}

export function hasProvidedBy(
  concept: ExternalConceptLike | null | undefined,
): boolean {
  return !!concept?.related?.some(r => r.type != null && PROVIDED_BY_TYPES.has(r.type));
}

/**
 * True if any external concept (comprehensive or member) lacks a
 * `provided_by` edge — the decomposition dangles because there's no
 * way to reach the providing dataset.
 */
export function hasDanglingExternal(
  hyperedge: HyperedgeLike,
  store: ConceptStore,
): boolean {
  const refs: ReadonlyArray<ConceptRef | RefShape | null> = [
    hyperedge?.comprehensive ?? null,
    ...(hyperedge?.members ?? hyperedge?.partitives ?? []).map(m => m?.ref ?? null),
  ];
  for (const ref of refs) {
    const concept = store.lookup(ref);
    if (!isExternalConcept(concept)) continue;
    if (!hasProvidedBy(concept)) return true;
  }
  return false;
}
