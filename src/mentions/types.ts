// Spec-compliant inline mention types.
// Per docs/design/inline-mentions-implementation-guide.md

export type TargetType =
  | 'urn'
  | 'dataset_qualified'
  | 'entity_id'
  | 'url'
  | 'path';

export interface UrnTarget {
  type: 'urn';
  urn: string;
}

export interface DatasetQualifiedTarget {
  type: 'dataset_qualified';
  dataset: string;
  id: string;
}

export interface EntityIdTarget {
  type: 'entity_id';
  id: string;
}

export interface UrlTarget {
  type: 'url';
  url: string;
}

export interface PathTarget {
  type: 'path';
  path: string;
}

export type Target =
  | UrnTarget
  | DatasetQualifiedTarget
  | EntityIdTarget
  | UrlTarget
  | PathTarget;

export type MentionKind =
  | 'concept'
  | 'cite'
  | 'fig'
  | 'table'
  | 'formula'
  | 'bib'
  | 'link'
  | 'image';

export interface Mention {
  kind: MentionKind;
  target: Target;
  label: string | null;
  raw: string;
  start: number;
  end: number;
}

export interface TextSegment {
  kind: 'text';
  content: string;
}

export type Segment = Mention | TextSegment;

export class InvalidMentionError extends Error {
  readonly raw: string;
  readonly reason: string;
  readonly position: number;

  constructor(raw: string, reason: string, position: number) {
    super(`Invalid mention at position ${position}: ${reason}`);
    this.name = 'InvalidMentionError';
    this.raw = raw;
    this.reason = reason;
    this.position = position;
  }
}

// ── Resolution types ──────────────────────────────────────────────────

export interface ResolvedMention {
  status: 'resolved' | 'external' | 'external_image' | 'local_image' | 'unresolved';
  kind: MentionKind;
  label: string | null;
  concept?: unknown;
  source?: unknown;
  entity?: unknown;
  entry?: unknown;
  url?: string;
  path?: string;
  target?: Target;
}

export interface ResolutionContext {
  concept?: { sources?: ReadonlyArray<unknown> };
  datasetName?: string;
  resolveConcept?: (ref: { dataset: string; id: string } | { urn: string }) => unknown | null;
  resolveEntity?: (kind: 'fig' | 'table' | 'formula', id: string) => unknown | null;
  resolveBibEntry?: (id: string) => unknown | null;
}
