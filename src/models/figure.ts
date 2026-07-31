import { SharedNonVerbalEntity } from './shared-non-verbal-entity.js';
import type { SharedNonVerbalEntityJson } from './shared-non-verbal-entity.js';
import { NonVerbalEntity } from './non-verbal-entity.js';

export interface FigureImageJson {
  src?: string | null;
  format?: string | null;
  role?: string | null;
  width?: number | string | null;
  height?: number | string | null;
  scale?: number | string | null;
}

export class FigureImage {
  readonly src: string | null;
  readonly format: string | null;
  readonly role: string | null;
  readonly width: number | string | null;
  readonly height: number | string | null;
  readonly scale: number | string | null;

  constructor(data: FigureImageJson = {}) {
    this.src = data.src ?? null;
    this.format = data.format ?? null;
    this.role = data.role ?? null;
    this.width = data.width ?? null;
    this.height = data.height ?? null;
    this.scale = data.scale ?? null;
  }

  toJSON(): FigureImageJson {
    const obj: FigureImageJson = {};
    if (this.src != null) obj.src = this.src;
    if (this.format != null) obj.format = this.format;
    if (this.role != null) obj.role = this.role;
    if (this.width != null) obj.width = this.width;
    if (this.height != null) obj.height = this.height;
    if (this.scale != null) obj.scale = this.scale;
    return obj;
  }

  static fromJSON(data: FigureImageJson): FigureImage {
    return new FigureImage(data);
  }
}

export interface FigureJson extends SharedNonVerbalEntityJson {
  images?: ReadonlyArray<FigureImageJson>;
  subfigures?: ReadonlyArray<FigureJson | Figure>;
}

export class Figure extends SharedNonVerbalEntity {
  protected readonly _rawImages: ReadonlyArray<FigureImageJson | FigureImage>;
  protected readonly _rawSubfigures: ReadonlyArray<FigureJson | Figure>;
  protected _images: ReadonlyArray<FigureImage> | null = null;
  protected _subfigures: ReadonlyArray<Figure> | null = null;

  constructor(data: FigureJson = {}) {
    super(data);
    this._rawImages = data.images ?? [];
    this._rawSubfigures = data.subfigures ?? [];
  }

  override rdfClass(): string {
    return 'Figure';
  }

  get images(): ReadonlyArray<FigureImage> {
    return this._lazy<FigureImage>(
      '_images',
      '_rawImages',
      (i) => (i instanceof FigureImage ? i : new FigureImage(i as FigureImageJson)),
    );
  }

  get subfigures(): ReadonlyArray<Figure> {
    return this._lazy<Figure>(
      '_subfigures',
      '_rawSubfigures',
      (s) => (s instanceof Figure ? s : new Figure(s as FigureJson)),
    );
  }

  override findById(targetId: string): this | null {
    if (this.id === targetId) return this;
    for (const sub of this.subfigures) {
      const found = sub.findById(targetId);
      if (found) return found as this;
    }
    return null;
  }

  override allIds(): string[] {
    const ids = this.id != null ? [this.id] : [];
    return [...ids, ...this.subfigures.flatMap((s) => s.allIds())];
  }

  override toJSON(): FigureJson {
    const obj = super.toJSON() as FigureJson;
    this._serialize(obj as unknown as Record<string, unknown>, 'images', '_images', '_rawImages');
    this._serialize(obj as unknown as Record<string, unknown>, 'subfigures', '_subfigures', '_rawSubfigures');
    return obj;
  }

  static override fromJSON(data: FigureJson): Figure {
    return new Figure(data);
  }
}

NonVerbalEntity.register('figure', Figure);
