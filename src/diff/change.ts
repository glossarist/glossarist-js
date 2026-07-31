import { GlossaristModel } from '../models/base.js';
import { TextDiff } from './text-diff.js';
import type { TextDiffJson } from './text-diff.js';

export const CHANGE_ADDED = 'added';
export const CHANGE_REMOVED = 'removed';
export const CHANGE_CHANGED = 'changed';
export const CHANGE_MATCHED = 'matched';

export type ChangeType = 'added' | 'removed' | 'changed' | 'matched';

export interface ChangeJson {
  type: ChangeType;
  path?: string | null;
  value?: unknown;
  old_value?: unknown;
  oldValue?: unknown;
  new_value?: unknown;
  newValue?: unknown;
  text_diff?: TextDiffJson;
  textDiff?: TextDiffJson;
}

function serializeValue(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof GlossaristModel) return v.toJSON();
  if (Array.isArray(v)) return v.map(serializeValue);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = serializeValue(val);
    }
    return out;
  }
  return v;
}

export class Change extends GlossaristModel {
  readonly path: string | null;

  constructor(data: Pick<ChangeJson, 'path'> = {}) {
    super();
    this.path = data.path ?? null;
  }

  get type(): ChangeType {
    throw new Error(`${this.constructor.name} must override type getter`);
  }

  static override fromJSON(data: ChangeJson): Change {
    return deserializeChange(data);
  }
}

export class Added extends Change {
  readonly value: unknown;

  constructor(data: Pick<ChangeJson, 'path' | 'value'> = {}) {
    super(data);
    this.value = data.value ?? null;
  }

  override get type(): ChangeType { return CHANGE_ADDED; }

  override toJSON(): ChangeJson {
    const obj: ChangeJson = { type: CHANGE_ADDED };
    if (this.path != null) obj.path = this.path;
    obj.value = serializeValue(this.value);
    return obj;
  }

  static override fromJSON(data: ChangeJson): Added {
    return new Added(data as Pick<ChangeJson, 'path' | 'value'>);
  }
}

export class Removed extends Change {
  readonly value: unknown;

  constructor(data: Pick<ChangeJson, 'path' | 'value'> = {}) {
    super(data);
    this.value = data.value ?? null;
  }

  override get type(): ChangeType { return CHANGE_REMOVED; }

  override toJSON(): ChangeJson {
    const obj: ChangeJson = { type: CHANGE_REMOVED };
    if (this.path != null) obj.path = this.path;
    obj.value = serializeValue(this.value);
    return obj;
  }

  static override fromJSON(data: ChangeJson): Removed {
    return new Removed(data as Pick<ChangeJson, 'path' | 'value'>);
  }
}

export interface ChangedConstructorData {
  path?: string | null;
  oldValue?: unknown;
  old_value?: unknown;
  newValue?: unknown;
  new_value?: unknown;
  textDiff?: TextDiff | TextDiffJson;
  text_diff?: TextDiffJson;
}

export class Changed extends Change {
  readonly oldValue: unknown;
  readonly newValue: unknown;
  private readonly _textDiff: TextDiff | null;

  constructor(data: ChangedConstructorData = {}) {
    super(data as Pick<ChangeJson, 'path'>);
    this.oldValue = data.oldValue ?? data.old_value ?? null;
    this.newValue = data.newValue ?? data.new_value ?? null;
    const td = data.textDiff ?? data.text_diff;
    this._textDiff = td instanceof TextDiff ? td : td ? TextDiff.fromJSON(td) : null;
  }

  override get type(): ChangeType { return CHANGE_CHANGED; }

  get textDiff(): TextDiff | null {
    return this._textDiff;
  }

  override toJSON(): ChangeJson {
    const obj: ChangeJson = { type: CHANGE_CHANGED };
    if (this.path != null) obj.path = this.path;
    obj.old_value = serializeValue(this.oldValue);
    obj.new_value = serializeValue(this.newValue);
    if (this._textDiff) obj.text_diff = this._textDiff.toJSON() as TextDiffJson;
    return obj;
  }

  static override fromJSON(data: ChangeJson): Changed {
    return new Changed(data as Required<Pick<ChangeJson, never>>);
  }
}

// Matched is for set-membership records that exist in both sides of a
// comparison but have no directionality — used by ConceptCollectionDiff.
export class Matched extends Change {
  readonly value: unknown;

  constructor(data: Pick<ChangeJson, 'path' | 'value'> = {}) {
    super(data);
    this.value = data.value ?? null;
  }

  override get type(): ChangeType { return CHANGE_MATCHED; }

  override toJSON(): ChangeJson {
    const obj: ChangeJson = { type: CHANGE_MATCHED };
    if (this.path != null) obj.path = this.path;
    obj.value = serializeValue(this.value);
    return obj;
  }

  static override fromJSON(data: ChangeJson): Matched {
    return new Matched(data as Pick<ChangeJson, 'path' | 'value'>);
  }
}

export function deserializeChange(data: ChangeJson): Change {
  switch (data?.type) {
    case CHANGE_ADDED: return Added.fromJSON(data);
    case CHANGE_REMOVED: return Removed.fromJSON(data);
    case CHANGE_CHANGED: return Changed.fromJSON(data);
    case CHANGE_MATCHED: return Matched.fromJSON(data);
    default:
      throw new Error(`Unknown change type: ${(data as { type?: string })?.type}`);
  }
}
