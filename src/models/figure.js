import { SharedNonVerbalEntity } from './shared-non-verbal-entity.js';
import { NonVerbalEntity } from './non-verbal-entity.js';

export class FigureImage {
  constructor(data = {}) {
    this.src = data.src ?? null;
    this.format = data.format ?? null;
    this.role = data.role ?? null;
    this.width = data.width ?? null;
    this.height = data.height ?? null;
    this.scale = data.scale ?? null;
  }

  toJSON() {
    const obj = {};
    if (this.src != null) obj.src = this.src;
    if (this.format != null) obj.format = this.format;
    if (this.role != null) obj.role = this.role;
    if (this.width != null) obj.width = this.width;
    if (this.height != null) obj.height = this.height;
    if (this.scale != null) obj.scale = this.scale;
    return obj;
  }

  static fromJSON(data) { return new FigureImage(data); }
}

export class Figure extends SharedNonVerbalEntity {
  constructor(data = {}) {
    super(data);
    this._rawImages = data.images ?? [];
    this._rawSubfigures = data.subfigures ?? [];
    this._images = null;
    this._subfigures = null;
  }

  get images() {
    return this._lazy('_images', '_rawImages',
      i => i instanceof FigureImage ? i : new FigureImage(i));
  }

  get subfigures() {
    return this._lazy('_subfigures', '_rawSubfigures',
      s => s instanceof Figure ? s : new Figure(s));
  }

  findById(targetId) {
    if (this.id === targetId) return this;
    for (const sub of this.subfigures) {
      const found = sub.findById(targetId);
      if (found) return found;
    }
    return null;
  }

  allIds() {
    const ids = this.id != null ? [this.id] : [];
    return [...ids, ...this.subfigures.flatMap(s => s.allIds())];
  }

  toJSON() {
    const obj = super.toJSON();
    this._serialize(obj, 'images', '_images', '_rawImages');
    this._serialize(obj, 'subfigures', '_subfigures', '_rawSubfigures');
    return obj;
  }

  static fromJSON(data) { return new Figure(data); }
}

NonVerbalEntity.register('figure', Figure);
