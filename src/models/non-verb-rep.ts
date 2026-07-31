import { NonVerbalEntity } from './non-verbal-entity.js';
import type { NonVerbalEntityJson } from './non-verbal-entity.js';
import { FigureImage } from './figure.js';
import type { FigureImageJson } from './figure.js';

export const NON_VERBAL_TYPES: ReadonlyArray<string> = Object.freeze([
  'image', 'table', 'formula',
]);

export interface NonVerbRepJson extends NonVerbalEntityJson {
  type?: string | null;
  images?: ReadonlyArray<FigureImageJson | FigureImage>;
}

export class NonVerbRep extends NonVerbalEntity {
  readonly type: string | null;
  protected readonly _rawImages: ReadonlyArray<FigureImageJson | FigureImage>;
  protected _images: ReadonlyArray<FigureImage> | null = null;

  constructor(data: NonVerbRepJson = {}) {
    super(data);
    this.type = data.type ?? null;
    this._rawImages = data.images ?? [];
  }

  override rdfClass(): string {
    return 'NonVerbalRepresentation';
  }

  get images(): ReadonlyArray<FigureImage> {
    return this._lazy<FigureImage>(
      '_images',
      '_rawImages',
      (i) => (i instanceof FigureImage ? i : new FigureImage(i as FigureImageJson)),
    );
  }

  override toJSON(): NonVerbRepJson {
    const obj = super.toJSON() as NonVerbRepJson;
    if (this.type != null) obj.type = this.type;
    this._serialize(obj as unknown as Record<string, unknown>, 'images', '_images', '_rawImages');
    return obj;
  }

  static override fromJSON(data: NonVerbRepJson): NonVerbRep {
    return new NonVerbRep(data);
  }
}
