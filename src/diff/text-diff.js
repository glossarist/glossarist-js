import { GlossaristModel } from '../models/base.js';

const HUNK_EQUAL = 'equal';
const HUNK_ADDED = 'added';
const HUNK_REMOVED = 'removed';

const TOKEN_RE = /(\s+)|(\S+)/g;

export class TextHunk extends GlossaristModel {
  constructor(data = {}) {
    super();
    if (![HUNK_EQUAL, HUNK_ADDED, HUNK_REMOVED].includes(data.type)) {
      throw new Error(`TextHunk type must be 'equal', 'added', or 'removed' (got ${data.type})`);
    }
    this.type = data.type;
    this.text = data.text ?? '';
  }

  toJSON() {
    return { type: this.type, text: this.text };
  }

  static fromJSON(data) {
    return new TextHunk(data);
  }
}

export class TextDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.oldText = data.oldText ?? data.old_text ?? '';
    this.newText = data.newText ?? data.new_text ?? '';
    this._hunks = (data.hunks ?? []).map(h => h instanceof TextHunk ? h : new TextHunk(h));
  }

  get hunks() {
    return this._hunks;
  }

  get hasChanges() {
    return this._hunks.some(h => h.type !== HUNK_EQUAL);
  }

  get addedText() {
    return this._hunks.filter(h => h.type === HUNK_ADDED).map(h => h.text).join('');
  }

  get removedText() {
    return this._hunks.filter(h => h.type === HUNK_REMOVED).map(h => h.text).join('');
  }

  toJSON() {
    return {
      old_text: this.oldText,
      new_text: this.newText,
      hunks: this._hunks.map(h => h.toJSON()),
    };
  }

  static fromJSON(data) {
    return new TextDiff(data);
  }
}

export function diffText(oldText, newText) {
  const oldStr = String(oldText ?? '');
  const newStr = String(newText ?? '');
  const oldTokens = tokenize(oldStr);
  const newTokens = tokenize(newStr);
  const hunks = lcsHunks(oldTokens, newTokens);
  return new TextDiff({ oldText: oldStr, newText: newStr, hunks });
}

function tokenize(text) {
  if (text.length === 0) return [];
  return text.match(TOKEN_RE) ?? [];
}

function lcsHunks(a, b) {
  const n = a.length;
  const m = b.length;

  if (n === 0) return m === 0 ? [] : [new TextHunk({ type: HUNK_ADDED, text: b.join('') })];
  if (m === 0) return [new TextHunk({ type: HUNK_REMOVED, text: a.join('') })];

  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const raw = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      raw.push({ type: HUNK_EQUAL, text: a[i - 1] });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      raw.push({ type: HUNK_REMOVED, text: a[i - 1] });
      i--;
    } else {
      raw.push({ type: HUNK_ADDED, text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) { raw.push({ type: HUNK_REMOVED, text: a[i - 1] }); i--; }
  while (j > 0) { raw.push({ type: HUNK_ADDED, text: b[j - 1] }); j--; }
  raw.reverse();

  return coalesce(raw).map(h => new TextHunk(h));
}

function coalesce(raw) {
  const out = [];
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
