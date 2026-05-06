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
}
