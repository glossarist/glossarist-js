import { GlossaristModel } from './base.js';
import { Section } from './section.js';

export const REGISTER_STATUSES = Object.freeze([
  'current',
  'superseded',
  'withdrawn',
  'draft',
]);

export class Register extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.schemaVersion = data.schema_version ?? data.schemaVersion ?? '3';
    this.id = data.id ?? null;
    this.ref = data.ref ?? null;
    this.refAliases = data.refAliases ?? data.ref_aliases ?? [];
    this.year = data.year ?? null;
    this.urn = data.urn ?? null;
    this.urnAliases = data.urnAliases ?? data.urn_aliases ?? [];
    this.status = data.status ?? null;
    this.supersedes = data.supersedes ?? null;
    this.owner = data.owner ?? null;
    this.sourceRepo = data.sourceRepo ?? data.source_repo ?? null;
    this.tags = data.tags ?? [];
    this.languages = data.languages ?? [];
    this.languageOrder = data.languageOrder ?? data.language_order ?? [];
    this.ordering = data.ordering ?? null;
    this.logo = data.logo ?? null;
    this.description = data.description ?? {};
    this.about = data.about ?? {};
    this.provenance = data.provenance ?? [];
    this.contributors = data.contributors ?? [];
    this.sections = (data.sections ?? []).map(s =>
      s instanceof Section ? s : new Section(s)
    );
    this._raw = this._extractRaw(data);
  }

  _extractRaw(data) {
    const known = new Set([
      'schema_version', 'schemaVersion',
      'id', 'ref', 'refAliases', 'ref_aliases',
      'year', 'urn', 'urnAliases', 'urn_aliases',
      'status', 'supersedes', 'owner',
      'sourceRepo', 'source_repo', 'tags',
      'languages', 'languageOrder', 'language_order',
      'ordering', 'logo', 'description', 'about',
      'provenance', 'contributors', 'sections',
    ]);
    const extra = {};
    for (const [k, v] of Object.entries(data)) {
      if (!known.has(k)) extra[k] = v;
    }
    return extra;
  }

  sectionById(id) {
    for (const section of this.sections) {
      if (section.id === id) return section;
      const found = section.descendantById(id);
      if (found) return found;
    }
    return null;
  }

  sectionName(sectionId, lang) {
    const section = this.sectionById(sectionId);
    return section ? section.name(lang) : null;
  }

  toJSON() {
    const obj = { ...this._raw, schema_version: this.schemaVersion };
    if (this.id != null) obj.id = this.id;
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
    if (Object.keys(this.description).length > 0) obj.description = { ...this.description };
    if (Object.keys(this.about).length > 0) obj.about = { ...this.about };
    if (this.provenance.length > 0) obj.provenance = this.provenance.map(p => ({ ...p }));
    if (this.contributors.length > 0) obj.contributors = this.contributors.map(c => ({ ...c }));
    if (this.sections.length > 0) obj.sections = this.sections.map(s => s.toJSON());
    return obj;
  }

  static fromJSON(data) {
    const instance = new Register(data);
    const snakeToCamel = k => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    return new Proxy(instance, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop in target._raw) return target._raw[prop];
        const camel = snakeToCamel(prop);
        if (camel in target) return target[camel];
        return undefined;
      },
    });
  }
}
