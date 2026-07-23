import { GlossaristModel } from '../models/base.js';
import { TextDiff } from './text-diff.js';

export const CHANGE_ADDED = 'added';
export const CHANGE_REMOVED = 'removed';
export const CHANGE_CHANGED = 'changed';
export const CHANGE_MATCHED = 'matched';

function serializeValue(v) {
  if (v == null) return null;
  if (v instanceof GlossaristModel) return v.toJSON();
  if (Array.isArray(v)) return v.map(serializeValue);
  if (typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = serializeValue(val);
    return out;
  }
  return v;
}

export class Change extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.path = data.path ?? null;
  }

  get type() {
    throw new Error(`${this.constructor.name} must override type getter`);
  }

  static fromJSON(data) {
    return deserializeChange(data);
  }
}

export class Added extends Change {
  constructor(data = {}) {
    super(data);
    this.value = data.value ?? null;
  }

  get type() { return CHANGE_ADDED; }

  toJSON() {
    const obj = { type: CHANGE_ADDED };
    if (this.path != null) obj.path = this.path;
    obj.value = serializeValue(this.value);
    return obj;
  }

  static fromJSON(data) {
    return new Added(data);
  }
}

export class Removed extends Change {
  constructor(data = {}) {
    super(data);
    this.value = data.value ?? null;
  }

  get type() { return CHANGE_REMOVED; }

  toJSON() {
    const obj = { type: CHANGE_REMOVED };
    if (this.path != null) obj.path = this.path;
    obj.value = serializeValue(this.value);
    return obj;
  }

  static fromJSON(data) {
    return new Removed(data);
  }
}

export class Changed extends Change {
  constructor(data = {}) {
    super(data);
    this.oldValue = data.oldValue ?? data.old_value ?? null;
    this.newValue = data.newValue ?? data.new_value ?? null;
    this._textDiff = data.textDiff ?? (data.text_diff ? TextDiff.fromJSON(data.text_diff) : null);
  }

  get type() { return CHANGE_CHANGED; }

  get textDiff() {
    return this._textDiff;
  }

  toJSON() {
    const obj = { type: CHANGE_CHANGED };
    if (this.path != null) obj.path = this.path;
    obj.old_value = serializeValue(this.oldValue);
    obj.new_value = serializeValue(this.newValue);
    if (this._textDiff) obj.text_diff = this._textDiff.toJSON();
    return obj;
  }

  static fromJSON(data) {
    return new Changed(data);
  }
}

// Matched is for set-membership records that exist in both sides of a
// comparison but have no directionality — used by ConceptCollectionDiff
// to track which concepts were paired by id, distinct from those that
// were genuinely Added or Removed. Distinct from Added because the data
// has a different semantic meaning; conflating them caused type drift
// in round 1 (TODO.hyperedges-v2/08).
export class Matched extends Change {
  constructor(data = {}) {
    super(data);
    this.value = data.value ?? null;
  }

  get type() { return CHANGE_MATCHED; }

  toJSON() {
    const obj = { type: CHANGE_MATCHED };
    if (this.path != null) obj.path = this.path;
    obj.value = serializeValue(this.value);
    return obj;
  }

  static fromJSON(data) {
    return new Matched(data);
  }
}

export function deserializeChange(data) {
  switch (data?.type) {
    case CHANGE_ADDED: return Added.fromJSON(data);
    case CHANGE_REMOVED: return Removed.fromJSON(data);
    case CHANGE_CHANGED: return Changed.fromJSON(data);
    case CHANGE_MATCHED: return Matched.fromJSON(data);
    default:
      throw new Error(`Unknown change type: ${data?.type}`);
  }
}
