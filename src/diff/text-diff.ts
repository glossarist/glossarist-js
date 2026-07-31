import { GlossaristModel } from '../models/base.js';

const HUNK_EQUAL = 'equal';
const HUNK_ADDED = 'added';
const HUNK_REMOVED = 'removed';

export type TextHunkType = typeof HUNK_EQUAL | typeof HUNK_ADDED | typeof HUNK_REMOVED;

const TOKEN_RE = /(\s+)|(\S+)/g;

export interface TextHunkJson {
  type: TextHunkType;
  text: string;
}

export class TextHunk extends GlossaristModel {
  readonly type: TextHunkType;
  readonly text: string;

  constructor(data: TextHunkJson = { type: HUNK_EQUAL, text: '' }) {
    super();
    if (![HUNK_EQUAL, HUNK_ADDED, HUNK_REMOVED].includes(data.type)) {
      throw new Error(`TextHunk type must be 'equal', 'added', or 'removed' (got ${data.type})`);
    }
    this.type = data.type;
    this.text = data.text ?? '';
  }

  override toJSON(): TextHunkJson {
    return { type: this.type, text: this.text };
  }

  static override fromJSON(data: TextHunkJson): TextHunk {
    return new TextHunk(data);
  }
}

export interface TextDiffJson {
  oldText?: string;
  old_text?: string;
  newText?: string;
  new_text?: string;
  hunks?: ReadonlyArray<TextHunkJson | TextHunk>;
}

export class TextDiff extends GlossaristModel {
  readonly oldText: string;
  readonly newText: string;
  private readonly _hunks: ReadonlyArray<TextHunk>;

  constructor(data: TextDiffJson = {}) {
    super();
    this.oldText = data.oldText ?? data.old_text ?? '';
    this.newText = data.newText ?? data.new_text ?? '';
    this._hunks = (data.hunks ?? []).map((h) =>
      h instanceof TextHunk ? h : new TextHunk(h),
    );
  }

  get hunks(): ReadonlyArray<TextHunk> {
    return this._hunks;
  }

  get hasChanges(): boolean {
    return this._hunks.some((h) => h.type !== HUNK_EQUAL);
  }

  get addedText(): string {
    return this._hunks
      .filter((h) => h.type === HUNK_ADDED)
      .map((h) => h.text)
      .join('');
  }

  get removedText(): string {
    return this._hunks
      .filter((h) => h.type === HUNK_REMOVED)
      .map((h) => h.text)
      .join('');
  }

  override toJSON(): TextDiffJson & { old_text: string; new_text: string; hunks: ReadonlyArray<TextHunkJson> } {
    return {
      old_text: this.oldText,
      new_text: this.newText,
      hunks: this._hunks.map((h) => h.toJSON()),
    };
  }

  static override fromJSON(data: TextDiffJson): TextDiff {
    return new TextDiff(data);
  }
}

export function diffText(oldText: string | null | undefined, newText: string | null | undefined): TextDiff {
  const oldStr = String(oldText ?? '');
  const newStr = String(newText ?? '');
  const oldTokens = tokenize(oldStr);
  const newTokens = tokenize(newStr);
  const hunks = lcsHunks(oldTokens, newTokens);
  return new TextDiff({ oldText: oldStr, newText: newStr, hunks });
}

function tokenize(text: string): string[] {
  if (text.length === 0) return [];
  return text.match(TOKEN_RE) ?? [];
}

function lcsHunks(a: string[], b: string[]): TextHunk[] {
  const n = a.length;
  const m = b.length;

  if (n === 0) return m === 0 ? [] : [new TextHunk({ type: HUNK_ADDED, text: b.join('') })];
  if (m === 0) return [new TextHunk({ type: HUNK_REMOVED, text: a.join('') })];

  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i]![j]! =
        a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]! + 1
          : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }

  const raw: Array<{ type: TextHunkType; text: string }> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      raw.push({ type: HUNK_EQUAL, text: a[i - 1]! });
      i--; j--;
    } else if ((dp[i - 1]![j] ?? 0) >= (dp[i]![j - 1] ?? 0)) {
      raw.push({ type: HUNK_REMOVED, text: a[i - 1]! });
      i--;
    } else {
      raw.push({ type: HUNK_ADDED, text: b[j - 1]! });
      j--;
    }
  }
  while (i > 0) {
    raw.push({ type: HUNK_REMOVED, text: a[i - 1]! });
    i--;
  }
  while (j > 0) {
    raw.push({ type: HUNK_ADDED, text: b[j - 1]! });
    j--;
  }
  raw.reverse();

  return coalesce(raw).map((h) => new TextHunk(h));
}

function coalesce(
  raw: ReadonlyArray<{ type: TextHunkType; text: string }>,
): Array<{ type: TextHunkType; text: string }> {
  const out: Array<{ type: TextHunkType; text: string }> = [];
  for (const r of raw) {
    const last = out[out.length - 1];
    if (last && last.type === r.type) {
      last.text += r.text;
    } else {
      out.push({ type: r.type, text: r.text });
    }
  }
  return out;
}
