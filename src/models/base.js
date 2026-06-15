export class GlossaristModel {
  toJSON() {
    throw new Error(`${this.constructor.name} must implement toJSON()`);
  }

  static fromJSON() {
    throw new Error(`${this.name} must implement fromJSON()`);
  }

  equals(other) {
    if (!(other instanceof this.constructor)) return false;
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
  }

  clone() {
    return this.constructor.fromJSON(JSON.parse(JSON.stringify(this.toJSON())));
  }

  _lazy(cacheKey, rawKey, wrapFn) {
    if (this[cacheKey] === null) {
      this[cacheKey] = this[rawKey].map(wrapFn);
    }
    return this[cacheKey];
  }

  _serialize(obj, jsonKey, cacheKey, rawKey) {
    const items = this[cacheKey] ?? (this[rawKey].length > 0 ? this[rawKey] : []);
    if (items.length > 0) {
      obj[jsonKey] = items.map(i => (i instanceof GlossaristModel) ? i.toJSON() : i);
    }
  }
}
