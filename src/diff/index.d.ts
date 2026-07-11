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

export type ChangeType = typeof CHANGE_ADDED | typeof CHANGE_REMOVED | typeof CHANGE_CHANGED;

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

export class MetadataDiff extends GlossaristModel {
  readonly changes: Record<string, Changed>;
  readonly hasChanges: boolean;
  walk(prefix?: string): Generator<DiffWalkEntry, void, unknown>;
  toJSON(): Record<string, ReturnType<Changed['toJSON']>>;
  static fromJSON(data: Record<string, unknown>): MetadataDiff;
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
  walk(): Generator<DiffWalkEntry, void, unknown>;
  toJSON(): Record<string, unknown>;
  static fromJSON(data: Record<string, unknown>): LocalizedConceptDiff;
}

export class ConceptDiff extends GlossaristModel {
  readonly oldId: string | null;
  readonly newId: string | null;
  readonly localizations: Record<string, LocalizedConceptDiff>;
  readonly hasChanges: boolean;
  readonly languages: string[];
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
