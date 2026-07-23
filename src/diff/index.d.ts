import type { GlossaristModel } from '../models/base';

// ── Text diff ──────────────────────────────────────────────────────────

export type HunkType = 'equal' | 'added' | 'removed';

export class TextHunk extends GlossaristModel {
  readonly type: HunkType;
  readonly text: string;
  toJSON(): { type: HunkType; text: string };
  static fromJSON(data: { type: HunkType; text: string }): TextHunk;
}

export class TextDiff extends GlossaristModel {
  readonly oldText: string;
  readonly newText: string;
  readonly hunks: TextHunk[];
  readonly hasChanges: boolean;
  readonly addedText: string;
  readonly removedText: string;
  toJSON(): { old_text: string; new_text: string; hunks: Array<{ type: HunkType; text: string }> };
  static fromJSON(data: Record<string, unknown>): TextDiff;
}

export function diffText(oldText: string | null | undefined, newText: string | null | undefined): TextDiff;

// ── Change types ───────────────────────────────────────────────────────

export const CHANGE_ADDED: 'added';
export const CHANGE_REMOVED: 'removed';
export const CHANGE_CHANGED: 'changed';
export const CHANGE_MATCHED: 'matched';

export type ChangeType =
  | typeof CHANGE_ADDED
  | typeof CHANGE_REMOVED
  | typeof CHANGE_CHANGED
  | typeof CHANGE_MATCHED;

export class Change extends GlossaristModel {
  readonly type: ChangeType;
  readonly path: string | null;
}

export class Added extends Change {
  readonly type: 'added';
  readonly value: unknown;
  toJSON(): { type: 'added'; path?: string; value: unknown };
  static fromJSON(data: Record<string, unknown>): Added;
}

export class Removed extends Change {
  readonly type: 'removed';
  readonly value: unknown;
  toJSON(): { type: 'removed'; path?: string; value: unknown };
  static fromJSON(data: Record<string, unknown>): Removed;
}

export class Changed extends Change {
  readonly type: 'changed';
  readonly oldValue: unknown;
  readonly newValue: unknown;
  readonly textDiff: TextDiff | null;
  toJSON(): {
    type: 'changed';
    path?: string;
    old_value: unknown;
    new_value: unknown;
    text_diff?: ReturnType<TextDiff['toJSON']>;
  };
  static fromJSON(data: Record<string, unknown>): Changed;
}

export class Matched extends Change {
  readonly type: 'matched';
  readonly value: unknown;
  toJSON(): { type: 'matched'; path?: string; value: unknown };
  static fromJSON(data: Record<string, unknown>): Matched;
}

export function deserializeChange(data: Record<string, unknown>): Change;

// ── List diff ──────────────────────────────────────────────────────────

export interface DiffListOptions {
  identityKey?: (item: any) => string;
  textKey?: (item: any) => string | null;
}

export class ListDiff extends GlossaristModel {
  readonly added: Added[];
  readonly removed: Removed[];
  readonly changed: Changed[];
  readonly hasChanges: boolean;
  readonly count: number;
  entries(): Generator<Change, void, unknown>;
  toJSON(): {
    added: ReturnType<Added['toJSON']>[];
    removed: ReturnType<Removed['toJSON']>[];
    changed: ReturnType<Changed['toJSON']>[];
  };
  static fromJSON(data: Record<string, unknown>): ListDiff;
}

export function diffList(oldList: unknown[], newList: unknown[], options?: DiffListOptions): ListDiff;
export function diffSet(oldList: unknown[], newList: unknown[], options: DiffListOptions): ListDiff;

// ── Concept diff ───────────────────────────────────────────────────────

export interface DiffWalkEntry {
  path: string;
  change: Change;
}

export interface ConceptDiffWalkEntry extends DiffWalkEntry {
  language: string;
}

export class DiffStats extends GlossaristModel {
  readonly added: number;
  readonly removed: number;
  readonly changed: number;
  readonly total: number;
  toJSON(): { added: number; removed: number; changed: number };
  static fromJSON(data: Record<string, unknown>): DiffStats;
}

export class MetadataDiff extends GlossaristModel {
  readonly changes: Record<string, Changed>;
  readonly hasChanges: boolean;
  readonly count: number;
  walk(section?: string): Generator<DiffWalkEntry, void, unknown>;
  toJSON(): Record<string, ReturnType<Changed['toJSON']>>;
  static fromJSON(data: Record<string, unknown>): MetadataDiff;
}

export class ConceptLevelDiff extends GlossaristModel {
  readonly sources: ListDiff;
  readonly dates: ListDiff;
  readonly relatedConcepts: ListDiff;
  readonly partitiveHyperedges: ListDiff;
  readonly groups: ListDiff;
  readonly sections: ListDiff;
  readonly tags: ListDiff;
  readonly metadata: MetadataDiff;
  readonly hasChanges: boolean;
  walk(): Generator<DiffWalkEntry, void, unknown>;
  toJSON(): Record<string, unknown>;
  static fromJSON(data: Record<string, unknown>): ConceptLevelDiff;
}

export class LocalizedConceptDiff extends GlossaristModel {
  readonly languageCode: string | null;
  readonly designations: ListDiff;
  readonly definitions: ListDiff;
  readonly notes: ListDiff;
  readonly examples: ListDiff;
  readonly sources: ListDiff;
  readonly dates: ListDiff;
  readonly related: ListDiff;
  readonly metadata: MetadataDiff;
  readonly hasChanges: boolean;
  readonly stats: DiffStats;
  readonly similarity: number;
  readonly totalItems: number;
  walk(prefix?: string): Generator<DiffWalkEntry, void, unknown>;
  toJSON(): Record<string, unknown>;
  static fromJSON(data: Record<string, unknown>): LocalizedConceptDiff;
}

export class ConceptDiff extends GlossaristModel {
  readonly oldId: string | null;
  readonly newId: string | null;
  readonly concept: ConceptLevelDiff;
  readonly languages: ListDiff;
  readonly localizations: Record<string, LocalizedConceptDiff>;
  readonly hasChanges: boolean;
  readonly localizationLanguages: string[];
  readonly stats: DiffStats;
  readonly similarity: number;
  readonly totalItems: number;
  localization(lang: string): LocalizedConceptDiff | null;
  walk(): Generator<ConceptDiffWalkEntry, void, unknown>;
  toJSON(): Record<string, unknown>;
  static fromJSON(data: Record<string, unknown>): ConceptDiff;
}

export function diffConcepts(
  oldConcept: any | null,
  newConcept: any | null,
  language?: string,
): ConceptDiff;

export function diffLocalizedConcepts(
  oldLoc: any | null,
  newLoc: any | null,
): LocalizedConceptDiff;

// ── Collection diff ────────────────────────────────────────────────────

export class ConceptCollectionDiff extends GlossaristModel {
  readonly oldCount: number;
  readonly newCount: number;
  readonly matched: Matched[];
  readonly added: Added[];
  readonly removed: Removed[];
  readonly conceptDiffs: Record<string, ConceptDiff>;
  readonly changedIds: string[];
  readonly hasChanges: boolean;
  readonly stats: DiffStats;
  readonly similarity: number;
  conceptDiff(id: string): ConceptDiff | null;
  walk(): Generator<ConceptDiffWalkEntry, void, unknown>;
  toJSON(): Record<string, unknown>;
  static fromJSON(data: Record<string, unknown>): ConceptCollectionDiff;
}

export function diffConceptCollections(
  oldCollection: any | null,
  newCollection: any | null,
  options?: { language?: string; skipUnchanged?: boolean },
): ConceptCollectionDiff;

// ── Rendering ──────────────────────────────────────────────────────────

export interface RenderOptions {
  colors?: boolean;
  showUnchanged?: boolean;
}

export function renderConceptDiff(diff: ConceptDiff, options?: RenderOptions): string;
export function renderCollectionDiff(diff: ConceptCollectionDiff, options?: RenderOptions): string;
export function renderTextDiff(textDiff: TextDiff | Record<string, unknown>, options?: RenderOptions): string;

// ── Patching ───────────────────────────────────────────────────────────

export function applyDiff<T extends { toJSON(): Record<string, unknown> }>(
  oldConcept: T,
  diff: ConceptDiff,
): T;

export function reverseDiff(diff: ConceptDiff): ConceptDiff;
