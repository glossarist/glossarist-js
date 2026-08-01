import { GlossaristModel } from './base.js';
import { Section } from './section.js';
import type { SectionJson } from './section.js';
import { resolveColor } from './dataset-color.js';
import type { DatasetColor } from './dataset-color.js';
import type { LocalizedString } from './generic-member.js';

export const REGISTER_STATUSES: ReadonlyArray<string> = Object.freeze([
  'current',
  'superseded',
  'withdrawn',
  'draft',
]);

export interface RegisterJson {
  schema_version?: string;
  schemaVersion?: string;
  id?: string | null;
  name?: string | LocalizedString | null;
  ref?: string | null;
  refAliases?: ReadonlyArray<string>;
  ref_aliases?: ReadonlyArray<string>;
  year?: number | string | null;
  urn?: string | null;
  urnAliases?: ReadonlyArray<string>;
  urn_aliases?: ReadonlyArray<string>;
  status?: string | null;
  supersedes?: string | null;
  owner?: string | null;
  sourceRepo?: string | null;
  source_repo?: string | null;
  tags?: ReadonlyArray<string>;
  languages?: ReadonlyArray<string>;
  languageOrder?: ReadonlyArray<string>;
  language_order?: ReadonlyArray<string>;
  ordering?: string | null;
  logo?: Record<string, unknown> | null;
  color?: DatasetColor | null;
  description?: LocalizedString;
  about?: LocalizedString;
  provenance?: ReadonlyArray<Record<string, unknown>>;
  contributors?: ReadonlyArray<Record<string, unknown>>;
  sections?: ReadonlyArray<SectionJson | Section>;
  [key: string]: unknown;
}

export class Register extends GlossaristModel {
  readonly schemaVersion: string;
  readonly id: string | null;
  readonly name: string | LocalizedString | null;
  readonly ref: string | null;
  readonly refAliases: ReadonlyArray<string>;
  readonly year: number | string | null;
  readonly urn: string | null;
  readonly urnAliases: ReadonlyArray<string>;
  readonly status: string | null;
  readonly supersedes: string | null;
  readonly owner: string | null;
  readonly sourceRepo: string | null;
  readonly tags: ReadonlyArray<string>;
  readonly languages: ReadonlyArray<string>;
  readonly languageOrder: ReadonlyArray<string>;
  readonly ordering: string | null;
  readonly logo: Record<string, unknown> | null;
  readonly color: DatasetColor | null;
  readonly description: LocalizedString;
  readonly about: LocalizedString;
  readonly provenance: ReadonlyArray<Record<string, unknown>>;
  readonly contributors: ReadonlyArray<Record<string, unknown>>;
  readonly sections: ReadonlyArray<Section>;
  private readonly _raw: Record<string, unknown>;

  constructor(data: RegisterJson = {}) {
    super();
    this.schemaVersion = data.schema_version ?? data.schemaVersion ?? '3';
    this.id = data.id ?? null;
    this.name = (data.name as string | LocalizedString | null) ?? null;
    this.ref = data.ref ?? null;
    this.refAliases = data.refAliases ?? data.ref_aliases ?? [];
    this.year = (data.year as number | string | null) ?? null;
    this.urn = data.urn ?? null;
    this.urnAliases = data.urnAliases ?? data.urn_aliases ?? [];
    this.status = data.status ?? null;
    this.supersedes = data.supersedes ?? null;
    this.owner = data.owner ?? null;
    this.sourceRepo = data.sourceRepo ?? data.source_repo ?? null;
    this.tags = (data.tags as ReadonlyArray<string>) ?? [];
    this.languages = (data.languages as ReadonlyArray<string>) ?? [];
    this.languageOrder = data.languageOrder ?? data.language_order ?? [];
    this.ordering = data.ordering ?? null;
    this.logo = (data.logo as Record<string, unknown> | null) ?? null;
    this.color = (data.color as DatasetColor | null) ?? null;
    this.description = (data.description as LocalizedString) ?? {};
    this.about = (data.about as LocalizedString) ?? {};
    this.provenance = (data.provenance as ReadonlyArray<Record<string, unknown>>) ?? [];
    this.contributors = (data.contributors as ReadonlyArray<Record<string, unknown>>) ?? [];
    this.sections = (data.sections ?? []).map((s) =>
      s instanceof Section ? s : new Section(s as SectionJson),
    );
    this._raw = this._extractRaw(data);
  }

  private _extractRaw(data: RegisterJson): Record<string, unknown> {
    const known = new Set([
      'schema_version', 'schemaVersion',
      'id', 'name', 'ref', 'refAliases', 'ref_aliases',
      'year', 'urn', 'urnAliases', 'urn_aliases',
      'status', 'supersedes', 'owner',
      'sourceRepo', 'source_repo', 'tags',
      'languages', 'languageOrder', 'language_order',
      'ordering', 'logo', 'color', 'description', 'about',
      'provenance', 'contributors', 'sections',
    ]);
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!known.has(k)) extra[k] = v;
    }
    return extra;
  }

  sectionById(id: string): Section | null {
    for (const section of this.sections) {
      if (section.id === id) return section;
      const found = section.descendantById(id);
      if (found) return found;
    }
    return null;
  }

  /**
   * Walks the section tree upward from `sectionId`, returning the
   * ancestor chain in immediate-parent-first order. The returned array
   * does NOT include sectionId itself. Returns [] when sectionId is
   * unknown or is a top-level section.
   */
  sectionAncestorIds(sectionId: string | null | undefined): string[] {
    if (!sectionId) return [];
    for (const root of this.sections) {
      const chain = _ancestorChain(root, sectionId);
      if (chain) return chain;
    }
    return [];
  }

  /**
   * Returns the closure of `sectionId`: the section plus all of its
   * ancestors. Concept-section membership tests should intersect the
   * concept's section list with this closure.
   */
  sectionClosure(sectionId: string | null | undefined): string[] {
    return sectionId ? [sectionId, ...this.sectionAncestorIds(sectionId)] : [];
  }

  /**
   * Walks the section tree DOWNWARD from `sectionId`, returning all
   * descendant section IDs in pre-order.
   */
  sectionDescendantIds(sectionId: string | null | undefined): string[] {
    if (!sectionId) return [];
    const section = this.sectionById(sectionId);
    if (!section) return [];
    const out: string[] = [];
    for (const child of section.children) {
      if (child.id) out.push(child.id);
      out.push(...this.sectionDescendantIds(child.id));
    }
    return out;
  }

  sectionDescendantClosure(sectionId: string | null | undefined): string[] {
    return sectionId ? [sectionId, ...this.sectionDescendantIds(sectionId)] : [];
  }

  /**
   * Returns all section IDs the concept belongs to: the concept's own
   * sections plus every ancestor of each.
   */
  conceptSectionIds(concept: { sections?: unknown; groups?: unknown }): string[] {
    const own = conceptSectionIdList(concept);
    if (own.length === 0) return [];
    const closure = new Set<string>();
    for (const id of own) {
      for (const ancestor of this.sectionClosure(id)) closure.add(ancestor);
    }
    return [...closure];
  }

  sectionName(sectionId: string, lang: string): string | null {
    const section = this.sectionById(sectionId);
    return section ? section.name(lang) : null;
  }

  /**
   * Localized display name. Returns the best-matching name string for
   * the requested language, falling back to English, then to the first
   * available language, then to null.
   */
  displayName(lang: string): string | null {
    if (this.name == null) return null;
    if (typeof this.name === 'string') return this.name;
    if (typeof this.name === 'object') {
      return (
        this.name[lang] ??
        this.name['eng'] ??
        (Object.values(this.name)[0] as string | undefined) ??
        null
      );
    }
    return null;
  }

  resolvedColor(mode: 'light' | 'dark'): string | null {
    return resolveColor(this.color, mode);
  }

  override toJSON(): RegisterJson {
    const obj: any = { ...this._raw, schema_version: this.schemaVersion } as RegisterJson;
    if (this.id != null) obj.id = this.id;
    if (this.name != null) obj.name = this.name;
    if (this.ref != null) obj.ref = this.ref;
    if (this.refAliases.length > 0) obj.refAliases = [...this.refAliases];
    if (this.year != null) obj.year = this.year;
    if (this.urn != null) obj.urn = this.urn;
    if (this.urnAliases.length > 0) obj.urnAliases = [...this.urnAliases];
    if (this.status != null) obj.status = this.status;
    if (this.supersedes != null) obj.supersedes = this.supersedes;
    if (this.owner != null) obj.owner = this.owner;
    if (this.sourceRepo != null) obj.sourceRepo = this.sourceRepo;
    if (this.tags.length > 0) obj.tags = [...this.tags];
    if (this.languages.length > 0) obj.languages = [...this.languages];
    if (this.languageOrder.length > 0) obj.languageOrder = [...this.languageOrder];
    if (this.ordering != null) obj.ordering = this.ordering;
    if (this.logo != null) obj.logo = { ...this.logo };
    if (this.color != null) {
      obj.color =
        typeof this.color === 'object' && this.color !== null
          ? { ...this.color }
          : this.color;
    }
    if (Object.keys(this.description).length > 0) obj.description = { ...this.description };
    if (Object.keys(this.about).length > 0) obj.about = { ...this.about };
    if (this.provenance.length > 0) obj.provenance = this.provenance.map((p) => ({ ...p }));
    if (this.contributors.length > 0) obj.contributors = this.contributors.map((c) => ({ ...c }));
    if (this.sections.length > 0) obj.sections = this.sections.map((s) => s.toJSON());
    return obj;
  }

  static override fromJSON(data: RegisterJson): Register {
    const instance = new Register(data);
    const snakeToCamel = (k: string): string =>
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    return new Proxy(instance, {
      get(target: Register, prop: string | symbol): unknown {
        if (typeof prop === 'string') {
          if (prop in target) return (target as unknown as Record<string, unknown>)[prop];
          if (prop in target._raw) return target._raw[prop];
          const camel = snakeToCamel(prop);
          if (camel in target) return (target as unknown as Record<string, unknown>)[camel];
        }
        return undefined;
      },
    });
  }
}

/**
 * Recursive walk: returns the ancestor chain of `targetId` within the
 * subtree rooted at `section`, or null if targetId is not in this
 * subtree.
 */
function _ancestorChain(
  section: Section,
  targetId: string,
  ancestors: string[] = [],
): string[] | null {
  if (section.id === targetId) return [...ancestors].reverse();
  for (const child of section.children) {
    const childId = child.id;
    if (childId == null) continue;
    const nextAncestors = section.id != null ? [...ancestors, section.id] : [...ancestors];
    const found = _ancestorChain(child, targetId, nextAncestors);
    if (found) return found;
  }
  return null;
}

/**
 * Returns the list of section IDs a concept claims membership in.
 * Concepts may carry section IDs via either `sections` (preferred) or
 * `groups` (legacy). Each entry may be a string or an object with an
 * `id` field; both forms are flattened to a string list.
 */
function conceptSectionIdList(concept: { sections?: unknown; groups?: unknown }): string[] {
  if (!concept) return [];
  const fromSections = concept.sections
    ? _flattenSectionIds(concept.sections)
    : [];
  const fromGroups = concept.groups ? _flattenSectionIds(concept.groups) : [];
  return [...fromSections, ...fromGroups];
}

function _flattenSectionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      out.push(entry);
    } else if (entry && typeof entry === 'object') {
      const e = entry as { id?: string; sectionId?: string; ref?: { id?: string } };
      const id = e.id ?? e.sectionId ?? e.ref?.id;
      if (id) out.push(String(id));
    }
  }
  return out;
}
