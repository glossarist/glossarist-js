import { GlossaristModel } from '../models/base.js';
import { Added, Removed, Changed, deserializeChange } from './change.js';
import { diffText } from './text-diff.js';

export class ListDiff extends GlossaristModel {
  constructor(data = {}) {
    super();
    this._added = (data.added ?? []).map(c => c instanceof Added ? c : Added.fromJSON(c));
    this._removed = (data.removed ?? []).map(c => c instanceof Removed ? c : Removed.fromJSON(c));
    this._changed = (data.changed ?? []).map(c => {
      if (c instanceof Changed) return c;
      return deserializeChange(c);
    });
  }

  get added() { return this._added; }
  get removed() { return this._removed; }
  get changed() { return this._changed; }

  get hasChanges() {
    return this._added.length > 0 || this._removed.length > 0 || this._changed.length > 0;
  }

  get count() {
    return this._added.length + this._removed.length + this._changed.length;
  }

  *entries() {
    yield* this._added;
    yield* this._removed;
    yield* this._changed;
  }

  toJSON() {
    return {
      added: this._added.map(c => c.toJSON()),
      removed: this._removed.map(c => c.toJSON()),
      changed: this._changed.map(c => c.toJSON()),
    };
  }

  static fromJSON(data) {
    return new ListDiff(data);
  }
}

/**
 * Diff two ordered lists using LCS alignment.
 *
 * - Items present in both (by identityKey) at the same relative position
 *   are "unchanged" and omitted from the result.
 * - Items only in the old list are "removed".
 * - Items only in the new list are "added".
 * - When an adjacent removed+added pair is detected at the same edit
 *   position, they are merged into a single "changed" entry. If both
 *   items expose text via textKey, a word-level TextDiff is attached.
 *
 * @param {Array} oldList
 * @param {Array} newList
 * @param {Object} [options]
 * @param {(item: any) => string} [options.identityKey] - equality key for matching items across lists
 * @param {(item: any) => string|null} [options.textKey] - extracts text content for word-level diff on changed items
 * @returns {ListDiff}
 */
export function diffList(oldList = [], newList = [], options = {}) {
  const identityKey = options.identityKey ?? defaultIdentityKey;
  const textKey = options.textKey ?? null;

  const oldArr = [...oldList];
  const newArr = [...newList];

  const oldKeys = oldArr.map(identityKey);
  const newKeys = newArr.map(identityKey);

  const dp = lcsTable(oldKeys, newKeys);
  const ops = backtrackOps(dp, oldKeys, newKeys);

  const added = [];
  const removed = [];
  const changed = [];

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.type === 'equal') continue;

    if (op.type === 'remove' && k + 1 < ops.length && ops[k + 1].type === 'add') {
      const next = ops[k + 1];
      const oldItem = oldArr[op.i];
      const newItem = newArr[next.j];
      changed.push(buildChanged(oldItem, newItem, textKey));
      k++;
    } else if (op.type === 'add' && k + 1 < ops.length && ops[k + 1].type === 'remove') {
      const next = ops[k + 1];
      const oldItem = oldArr[next.i];
      const newItem = newArr[op.j];
      changed.push(buildChanged(oldItem, newItem, textKey));
      k++;
    } else if (op.type === 'remove') {
      removed.push(new Removed({ value: oldArr[op.i] }));
    } else if (op.type === 'add') {
      added.push(new Added({ value: newArr[op.j] }));
    }
  }

  return new ListDiff({ added, removed, changed });
}

/**
 * Diff two unordered collections by identity key (set-based).
 *
 * - Items matched by identityKey in both lists are compared for full
 *   equality; if they differ → "changed".
 * - Items only in the old list are "removed".
 * - Items only in the new list are "added".
 *
 * Use this for collections where order does not carry meaning (e.g.
 * designations matched by term text, sources matched by ref, dates
 * matched by type).
 *
 * @param {Array} oldList
 * @param {Array} newList
 * @param {Object} options
 * @param {(item: any) => string} options.identityKey - key that identifies the same item across lists
 * @param {(item: any) => string|null} [options.textKey] - extracts text for word-level diff on changed items
 * @returns {ListDiff}
 */
export function diffSet(oldList = [], newList = [], options = {}) {
  const identityKey = options.identityKey ?? defaultIdentityKey;
  const textKey = options.textKey ?? null;

  const oldMap = new Map();
  for (const item of oldList) {
    oldMap.set(identityKey(item), item);
  }

  const seenKeys = new Set();
  const added = [];
  const changed = [];

  for (const item of newList) {
    const key = identityKey(item);
    seenKeys.add(key);
    if (oldMap.has(key)) {
      const oldItem = oldMap.get(key);
      if (!itemsEqual(oldItem, item)) {
        changed.push(buildChanged(oldItem, item, textKey));
      }
    } else {
      added.push(new Added({ value: item }));
    }
  }

  const removed = [];
  for (const item of oldList) {
    if (!seenKeys.has(identityKey(item))) {
      removed.push(new Removed({ value: item }));
    }
  }

  return new ListDiff({ added, removed, changed });
}

function buildChanged(oldItem, newItem, textKey) {
  const opts = { oldValue: oldItem, newValue: newItem };
  if (textKey) {
    const oldText = textKey(oldItem);
    const newText = textKey(newItem);
    if (oldText != null || newText != null) {
      opts.textDiff = diffText(oldText ?? '', newText ?? '');
    }
  }
  return new Changed(opts);
}

function itemsEqual(a, b) {
  if (a === b) return true;
  if (a instanceof GlossaristModel && b instanceof GlossaristModel) {
    return a.equals(b);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function defaultIdentityKey(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (item instanceof GlossaristModel) {
    return JSON.stringify(item.toJSON());
  }
  return JSON.stringify(item);
}

function lcsTable(aKeys, bKeys) {
  const m = aKeys.length;
  const n = bKeys.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aKeys[i - 1] === bKeys[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function backtrackOps(dp, aKeys, bKeys) {
  const ops = [];
  let i = aKeys.length;
  let j = bKeys.length;
  while (i > 0 && j > 0) {
    if (aKeys[i - 1] === bKeys[j - 1]) {
      ops.push({ type: 'equal', i: i - 1, j: j - 1 });
      i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      ops.push({ type: 'remove', i: i - 1, j });
      i--;
    } else {
      ops.push({ type: 'add', i, j: j - 1 });
      j--;
    }
  }
  while (i > 0) { ops.push({ type: 'remove', i: i - 1, j }); i--; }
  while (j > 0) { ops.push({ type: 'add', i, j: j - 1 }); j--; }
  ops.reverse();
  return ops;
}
