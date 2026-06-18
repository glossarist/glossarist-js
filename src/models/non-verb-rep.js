import { NonVerbalEntity } from './non-verbal-entity.js';
import { FigureImage } from './figure.js';

export const NON_VERBAL_TYPES = Object.freeze(['image', 'table', 'formula']);

export class NonVerbRep extends NonVerbalEntity {
  constructor(data = {}) {
    super(data);
    this.type = data.type ?? null;
    this._rawImages = data.images ?? [];
    this._images = null;
  }

  get images() {
    return this._lazy('_images', '_rawImages',
      i => i instanceof FigureImage ? i : new FigureImage(i));
  }

  toJSON() {
    const obj = super.toJSON();
    if (this.type != null) obj.type = this.type;
    this._serialize(obj, 'images', '_images', '_rawImages');
    return obj;
  }

  static fromJSON(data) {
    return new NonVerbRep(data);
  }
}
