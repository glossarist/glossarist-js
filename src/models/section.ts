import { GlossaristModel } from './base.js';
import type { LocalizedString } from './generic-member.js';

export const ORDERING_METHODS: ReadonlyArray<string> = Object.freeze([
  'systematic',
  'mixed',
  'alphabetical',
]);

export type OrderingMethod = string;

export interface SectionJson {
  id?: string | null;
  names?: LocalizedString;
  ordering?: OrderingMethod | null;
  children?: ReadonlyArray<SectionJson | Section>;
}

export class Section extends GlossaristModel {
  readonly id: string | null;
  readonly names: LocalizedString;
  readonly ordering: OrderingMethod | null;
  readonly children: ReadonlyArray<Section>;

  constructor(data: SectionJson = {}) {
    super();
    this.id = data.id ?? null;
    this.names = (data.names as LocalizedString) ?? {};
    this.ordering = data.ordering ?? null;
    this.children = (data.children ?? []).map((c) =>
      c instanceof Section ? c : new Section(c as SectionJson),
    );
  }

  name(lang: string): string | null {
    return this.names[lang] ?? this.names['eng'] ?? null;
  }

  descendantById(id: string): Section | null {
    for (const child of this.children) {
      if (child.id === id) return child;
      const found = child.descendantById(id);
      if (found) return found;
    }
    return null;
  }

  override toJSON(): SectionJson {
    const obj: SectionJson = { id: this.id };
    if (Object.keys(this.names).length > 0) obj.names = { ...this.names };
    if (this.ordering != null) obj.ordering = this.ordering;
    if (this.children.length > 0) {
      obj.children = this.children.map((c) => c.toJSON());
    }
    return obj;
  }

  static override fromJSON(data: SectionJson): Section {
    return new Section(data);
  }
}
