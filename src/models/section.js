import { GlossaristModel } from './base.js';

export const ORDERING_METHODS = Object.freeze([
  'systematic',
  'mixed',
  'alphabetical',
]);

export class Section extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.id = data.id ?? null;
    this.names = data.names ?? {};
    this.ordering = data.ordering ?? null;
    this.children = (data.children ?? []).map(c =>
      c instanceof Section ? c : new Section(c)
    );
  }

  name(lang) {
    return this.names[lang] ?? this.names.eng ?? null;
  }

  descendantById(id) {
    for (const child of this.children) {
      if (child.id === id) return child;
      const found = child.descendantById(id);
      if (found) return found;
    }
    return null;
  }

  toJSON() {
    const obj = { id: this.id };
    if (Object.keys(this.names).length > 0) obj.names = { ...this.names };
    if (this.ordering != null) obj.ordering = this.ordering;
    if (this.children.length > 0) obj.children = this.children.map(c => c.toJSON());
    return obj;
  }

  static fromJSON(data) {
    return new Section(data);
  }
}
