import { GlossaristModel } from '../models/base.js';
import { Added, Removed, Changed, deserializeChange } from './change.js';
import type { ChangeJson, ChangedConstructorData } from './change.js';
import { diffText } from './text-diff.js';
import { identityOf } from './identity.js';

export interface ListDiffJson {
  added?: ReadonlyArray<ChangeJson | Added>;
  removed?: ReadonlyArray<ChangeJson | Removed>;
  changed?: ReadonlyArray<ChangeJson | Changed>;
}

interface ListDiffOptions {
  identityKey?: (item: unknown) => string;
  textKey?: ((item: unknown) => string | null) | null;
}

export class ListDiff extends GlossaristModel {
  private readonly _added: ReadonlyArray<Added>;
  private readonly _removed: ReadonlyArray<Removed>;
  private readonly _changed: ReadonlyArray<Changed>;

  constructor(data: ListDiffJson = {}) {
    super();
    this._added = (data.added ?? []).map((c) =>
      c instanceof Added ? c : Added.fromJSON(c),
    ) as ReadonlyArray<Added>;
    this._removed = (data.removed ?? []).map((c) =>
      c instanceof Removed ? c : Removed.fromJSON(c),
    ) as ReadonlyArray<Removed>;
    this._changed = (data.changed ?? []).map((c) => {
      if (c instanceof Changed) return c;
      return deserializeChange(c) as Changed;
    }) as ReadonlyArray<Changed>;
  }

  get added(): ReadonlyArray<Added> { return this._added; }
  get removed(): ReadonlyArray<Removed> { return this._removed; }
  get changed(): ReadonlyArray<Changed> { return this._changed; }

  get hasChanges(): boolean {
    return this._added.length > 0 || this._removed.length > 0 || this._changed.length > 0;
  }

  get count(): number {
    return this._added.length + this._removed.length + this._changed.length;
  }

  *entries(): Generator<Added | Removed | Changed> {
    yield* this._added;
    yield* this._removed;
    yield* this._changed;
  }

  override toJSON(): ListDiffJson {
    return {
      added: this._added.map((c) => c.toJSON()),
      removed: this._removed.map((c) => c.toJSON()),
      changed: this._changed.map((c) => c.toJSON()),
    };
  }

  static override fromJSON(data: ListDiffJson): ListDiff {
    return new ListDiff(data);
  }
}

/**
 * Diff two ordered lists using LCS alignment.
 */
export function diffList(
  oldList: ReadonlyArray<unknown> = [],
  newList: ReadonlyArray<unknown> = [],
  options: ListDiffOptions = {},
): ListDiff {
  const identityKey = options.identityKey ?? defaultIdentityKey;
  const textKey = options.textKey ?? null;

  const oldArr = [...oldList];
  const newArr = [...newList];

  const oldKeys = oldArr.map(identityKey);
  const newKeys = newArr.map(identityKey);

  const dp = lcsTable(oldKeys, newKeys);
  const ops = backtrackOps(dp, oldKeys, newKeys);

  const added: Added[] = [];
  const removed: Removed[] = [];
  const changed: Changed[] = [];

  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!;
    if (op.type === 'equal') continue;

    if (op.type === 'remove' && k + 1 < ops.length && ops[k + 1]!.type === 'add') {
      const next = ops[k + 1]!;
      changed.push(buildChanged(oldArr[op.i]!, newArr[next.j]!, textKey));
      k++;
    } else if (op.type === 'add' && k + 1 < ops.length && ops[k + 1]!.type === 'remove') {
      const next = ops[k + 1]!;
      changed.push(buildChanged(oldArr[next.i]!, newArr[op.j]!, textKey));
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
 */
export function diffSet(
  oldList: ReadonlyArray<unknown> = [],
  newList: ReadonlyArray<unknown> = [],
  options: ListDiffOptions = {},
): ListDiff {
  const identityKey = options.identityKey ?? defaultIdentityKey;
  const textKey = options.textKey ?? null;

  const oldMap = new Map<string, unknown>();
  for (const item of oldList) {
    oldMap.set(identityKey(item), item);
  }

  const seenKeys = new Set<string>();
  const added: Added[] = [];
  const changed: Changed[] = [];

  for (const item of newList) {
    const key = identityKey(item);
    seenKeys.add(key);
    if (oldMap.has(key)) {
      const oldItem = oldMap.get(key);
      if (oldItem !== undefined && !itemsEqual(oldItem, item)) {
        changed.push(buildChanged(oldItem, item, textKey));
      }
    } else {
      added.push(new Added({ value: item }));
    }
  }

  const removed: Removed[] = [];
  for (const item of oldList) {
    if (!seenKeys.has(identityKey(item))) {
      removed.push(new Removed({ value: item }));
    }
  }

  return new ListDiff({ added, removed, changed });
}

function buildChanged(
  oldItem: unknown,
  newItem: unknown,
  textKey: ((item: unknown) => string | null) | null,
): Changed {
  const opts: ChangedConstructorData = {
    oldValue: oldItem,
    newValue: newItem,
  };
  if (textKey) {
    const oldText = textKey(oldItem);
    const newText = textKey(newItem);
    if (oldText != null || newText != null) {
      opts.textDiff = diffText(oldText ?? '', newText ?? '');
    }
  }
  return new Changed(opts);
}

function itemsEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof GlossaristModel && b instanceof GlossaristModel) {
    return a.equals(b as never);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

function defaultIdentityKey(item: unknown): string {
  return identityOf(item);
}

type Op = { type: 'equal' | 'add' | 'remove'; i: number; j: number };

function lcsTable(aKeys: string[], bKeys: string[]): Uint32Array[] {
  const m = aKeys.length;
  const n = bKeys.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j]! =
        aKeys[i - 1] === bKeys[j - 1]
          ? dp[i - 1]![j - 1]! + 1
          : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  return dp;
}

function backtrackOps(dp: Uint32Array[], aKeys: string[], bKeys: string[]): Op[] {
  const ops: Op[] = [];
  let i = aKeys.length;
  let j = bKeys.length;
  while (i > 0 && j > 0) {
    if (aKeys[i - 1] === bKeys[j - 1]) {
      ops.push({ type: 'equal', i: i - 1, j: j - 1 });
      i--; j--;
    } else if ((dp[i - 1]![j] ?? 0) >= (dp[i]![j - 1] ?? 0)) {
      ops.push({ type: 'remove', i: i - 1, j });
      i--;
    } else {
      ops.push({ type: 'add', i, j: j - 1 });
      j--;
    }
  }
  while (i > 0) {
    ops.push({ type: 'remove', i: i - 1, j });
    i--;
  }
  while (j > 0) {
    ops.push({ type: 'add', i, j: j - 1 });
    j--;
  }
  ops.reverse();
  return ops;
}
