import { GlossaristModel } from './base.js';
import { LocalizedConcept } from './localized-concept.js';
import type { LocalizedConceptJson } from './localized-concept.js';
import { RelatedConcept } from './related-concept.js';
import type { RelatedConceptJson } from './related-concept.js';
import { PartitiveHyperedge } from './partitive-hyperedge.js';
import { AbstractHyperedge } from './abstract-hyperedge.js';
import type { AbstractHyperedgeJson } from './abstract-hyperedge.js';
import { HyperedgeRegistry, groupHyperedgesByWireKey } from './hyperedge-registry.js';
import type { HyperedgeClass } from './hyperedge-registry.js';
import { migrateHyperedgeToRelation } from '../migration/hyperedge-migrator.js';
import { ConceptReference } from './concept-reference.js';
import type { ConceptReferenceJson } from './concept-reference.js';
import { ConceptDate } from './concept-date.js';
import type { ConceptDateJson } from './concept-date.js';
import { ConceptSource } from './concept-source.js';
import type { ConceptSourceJson } from './concept-source.js';
import { FigureReference } from './non-verbal-references.js';
import { TableReference } from './non-verbal-references.js';
import { FormulaReference } from './non-verbal-references.js';
import { diffConcepts } from '../diff/concept-diff.js';

export interface ConceptJson {
  id?: string;
  termid?: string;
  term?: string | null;
  uri?: string | null;
  localizations?: Record<string, LocalizedConceptJson>;
  related?: ReadonlyArray<RelatedConceptJson | RelatedConcept>;
  relatedConcepts?: ReadonlyArray<RelatedConceptJson | RelatedConcept>;
  related_concepts?: ReadonlyArray<RelatedConceptJson | RelatedConcept>;
  relations?: ReadonlyArray<unknown>;
  domains?: ReadonlyArray<ConceptReferenceJson | ConceptReference>;
  groups?: ReadonlyArray<string | { id?: string; sectionId?: string } | ConceptReferenceJson>;
  sections?: ReadonlyArray<string | { id?: string; sectionId?: string }>;
  tags?: ReadonlyArray<string>;
  dates?: ReadonlyArray<ConceptDateJson | ConceptDate>;
  sources?: ReadonlyArray<ConceptSourceJson | ConceptSource>;
  figures?: ReadonlyArray<unknown>;
  tables?: ReadonlyArray<unknown>;
  formulas?: ReadonlyArray<unknown>;
  status?: string | null;
  schemaVersion?: string;
  schema_version?: string;
  raw?: unknown;
  [key: string]: unknown;
}

const CONCEPT_WIRE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  schemaVersion: 'schema_version',
});

type GroupOrSection = string | { id?: string; sectionId?: string };

export class Concept extends GlossaristModel {
  static get DIFF_FIELDS(): ReadonlyArray<string> {
    return Object.freeze(['status', 'term', 'uri', 'schemaVersion']);
  }

  static wireNameFor(field: string): string {
    return CONCEPT_WIRE_NAMES[field] ?? field;
  }

  readonly id: string;
  readonly term: string | null;
  readonly uri: string | null;
  private readonly _rawLocalizations: Record<string, LocalizedConceptJson>;
  private _cache: Record<string, LocalizedConcept> = {};

  readonly relatedConcepts: ReadonlyArray<RelatedConcept>;
  relations: ReadonlyArray<AbstractHyperedge>;
  readonly domains: ReadonlyArray<ConceptReference>;
  readonly groups: ReadonlyArray<string>;
  readonly sections: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
  readonly dates: ReadonlyArray<ConceptDate>;
  readonly sources: ReadonlyArray<ConceptSource>;
  private readonly _rawFigures: ReadonlyArray<unknown>;
  private readonly _rawTables: ReadonlyArray<unknown>;
  private readonly _rawFormulas: ReadonlyArray<unknown>;
  private _figures: ReadonlyArray<FigureReference> | null = null;
  private _tables: ReadonlyArray<TableReference> | null = null;
  private _formulas: ReadonlyArray<FormulaReference> | null = null;
  readonly status: string | null;
  readonly schemaVersion: string;
  readonly raw: unknown;

  constructor(data: ConceptJson = {}) {
    super();
    this.id = String(data.id ?? (data.termid as string | undefined) ?? '');
    this.term = data.term ?? null;
    this.uri = data.uri ?? null;
    this._rawLocalizations =
      (data.localizations as Record<string, LocalizedConceptJson>) ?? {};
    this._cache = {};

    this.relatedConcepts = _mapInstances(
      (data.relatedConcepts ?? data.related ?? data.related_concepts ?? []) as ReadonlyArray<RelatedConceptJson | RelatedConcept>,
      RelatedConcept,
    );
    this.relations = _resolveHyperedges(data);

    this.domains = _normalizeDomains(data.domains, data.groups);
    this.groups = Array.isArray(data.groups)
      ? (data.groups as ReadonlyArray<GroupOrSection>)
          .map((g) =>
            typeof g === 'string'
              ? g
              : (g as { id?: string; sectionId?: string })?.id ??
                (g as { sectionId?: string })?.sectionId ??
                null,
          )
          .filter((g): g is string => Boolean(g))
      : [];
    this.sections = Array.isArray(data.sections)
      ? (data.sections as ReadonlyArray<GroupOrSection>)
          .map((s) =>
            typeof s === 'string'
              ? s
              : (s as { id?: string; sectionId?: string })?.id ??
                (s as { sectionId?: string })?.sectionId ??
                null,
          )
          .filter((s): s is string => Boolean(s))
      : [];
    this.tags = Array.isArray(data.tags) ? [...data.tags] : [];
    this.dates = _mapInstances(
      (data.dates ?? []) as ReadonlyArray<ConceptDateJson | ConceptDate>,
      ConceptDate,
    );
    this.sources = _mapInstances(
      (data.sources ?? []) as ReadonlyArray<ConceptSourceJson | ConceptSource>,
      ConceptSource,
    );
    this._rawFigures = data.figures ?? [];
    this._rawTables = data.tables ?? [];
    this._rawFormulas = data.formulas ?? [];
    this.status = data.status ?? null;
    this.schemaVersion = data.schemaVersion ?? data.schema_version ?? '3';
    this.raw = data.raw ?? null;
  }

  get termid(): string { return this.id; }

  get languages(): string[] {
    return Object.keys(this._rawLocalizations);
  }

  get languageCodes(): string[] {
    return this.languages;
  }

  localization(lang: string): LocalizedConcept | undefined {
    if (!(lang in this._rawLocalizations)) return undefined;
    if (!this._cache[lang]) {
      const raw = this._rawLocalizations[lang];
      this._cache[lang] = new LocalizedConcept({ ...raw, language_code: lang });
    }
    return this._cache[lang];
  }

  diff(other: Concept, language: string = 'eng'): unknown {
    return diffConcepts(this, other, language);
  }

  primaryDesignation(lang: string): unknown {
    return (
      (this.localization(lang) as { primaryDesignation?: unknown } | undefined)
        ?.primaryDesignation ?? null
    );
  }

  definition(lang: string): unknown {
    return (
      (this.localization(lang) as { primaryDefinition?: unknown } | undefined)
        ?.primaryDefinition ?? null
    );
  }

  setLocalization(lang: string, lc: LocalizedConcept | LocalizedConceptJson): this {
    if (lc instanceof LocalizedConcept) {
      this._cache[lang] = lc;
      const json = lc.toJSON() as LocalizedConceptJson & { language_code?: string };
      delete json.language_code;
      this._rawLocalizations[lang] = json;
    } else {
      this._rawLocalizations[lang] = lc;
      delete this._cache[lang];
    }
    return this;
  }

  hasLocalization(lang: string): boolean {
    return lang in this._rawLocalizations;
  }

  findSourceById(id: string): ConceptSource | null {
    if (typeof id !== 'string' || id.length === 0) return null;
    for (const source of this.sources) {
      if (source.id === id) return source;
    }
    for (const lang of this.languages) {
      const lc = this.localization(lang);
      if (!lc) continue;
      const lcSources = (
        lc as { sources?: ReadonlyArray<{ id?: string | null }> }
      ).sources ?? [];
      for (const source of lcSources) {
        if (source.id === id) return source as unknown as ConceptSource;
      }
      const lcTerms = (
        lc as {
          terms?: ReadonlyArray<{
            sources?: ReadonlyArray<{ id?: string | null }>;
          }>;
        }
      ).terms ?? [];
      for (const designation of lcTerms) {
        for (const source of designation.sources ?? []) {
          if (source.id === id) return source as unknown as ConceptSource;
        }
      }
    }
    return null;
  }

  get figures(): ReadonlyArray<FigureReference> {
    return this._lazy<FigureReference>(
      '_figures',
      '_rawFigures',
      (r) => FigureReference.fromJSON(r as never),
    );
  }

  get tables(): ReadonlyArray<TableReference> {
    return this._lazy<TableReference>(
      '_tables',
      '_rawTables',
      (r) => TableReference.fromJSON(r as never),
    );
  }

  get formulas(): ReadonlyArray<FormulaReference> {
    return this._lazy<FormulaReference>(
      '_formulas',
      '_rawFormulas',
      (r) => FormulaReference.fromJSON(r as never),
    );
  }

  *walkTexts(): Generator<{ text: string; source: string; language?: string }> {
    for (const lang of this.languages) {
      const lc = this.localization(lang);
      if (!lc) continue;
      const walker = (
        lc as {
          walkTexts?: (
            p: string,
          ) => Generator<{ text: string; source: string }>;
        }
      ).walkTexts;
      if (typeof walker === 'function') {
        yield* walker.call(lc, `localizations.${lang}`);
      }
    }
  }

  override toJSON(): ConceptJson {
    const obj: ConceptJson = { id: this.id };
    if (this.term != null) obj.term = this.term;
    if (this.uri != null) obj.uri = this.uri;

    if (Object.keys(this._rawLocalizations).length > 0) {
      obj.localizations = {};
      const loc = obj.localizations;
      for (const lang of this.languages) {
        const lc = this.localization(lang);
        if (lc) {
          const json = lc.toJSON() as LocalizedConceptJson & {
            language_code?: string;
          };
          delete json.language_code;
          loc[lang] = json;
        }
      }
    } else {
      obj.localizations = {};
    }

    if (this.relatedConcepts.length > 0) {
      obj.related = this.relatedConcepts.map((rc) => rc.toJSON());
    }
    const grouped = groupHyperedgesByWireKey(this.relations);
    for (const [wireKey, rels] of Object.entries(grouped)) {
      if (rels.length > 0) obj[wireKey] = rels.map((r) => r.toJSON());
    }
    if (this.domains.length > 0) {
      obj.domains = this.domains.map((d) => d.toJSON());
    }
    if (this.tags.length > 0) {
      obj.tags = [...this.tags];
    }
    if (this.dates.length > 0) {
      obj.dates = this.dates.map((d) => d.toJSON());
    }
    if (this.sources.length > 0) {
      obj.sources = this.sources.map((s) => s.toJSON());
    }
    this._serialize(obj as unknown as Record<string, unknown>, 'figures', '_figures', '_rawFigures');
    this._serialize(obj as unknown as Record<string, unknown>, 'tables', '_tables', '_rawTables');
    this._serialize(obj as unknown as Record<string, unknown>, 'formulas', '_formulas', '_rawFormulas');
    if (this.status != null) obj.status = this.status;
    obj.schema_version = this.schemaVersion;
    return obj;
  }

  static override fromJSON(data: ConceptJson): Concept {
    return new Concept(data);
  }
}

function _mapInstances<T, J>(
  arr: ReadonlyArray<T | J>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Cls: new (...args: any[]) => T,
): ReadonlyArray<T> {
  return arr.map((item) => (item instanceof Cls ? item : new Cls(item))) as ReadonlyArray<T>;
}

type HyperedgeInput =
  | AbstractHyperedge
  | (AbstractHyperedgeJson & { type?: string })
  | { type: string; [key: string]: unknown }
  | { toJSON(): unknown };

function _resolveHyperedges(data: ConceptJson): ReadonlyArray<AbstractHyperedge> {
  _assertNoAmbiguousInput(data);

  const relations = data.relations as ReadonlyArray<HyperedgeInput> | undefined;
  if (Array.isArray(relations)) {
    const out: AbstractHyperedge[] = [];
    for (const r of relations) {
      const coerced = _coerceHyperedge(r);
      if (coerced) out.push(coerced);
    }
    return _dedupeOrThrow(out);
  }

  const out: AbstractHyperedge[] = [];

  for (const cls of HyperedgeRegistry.allClasses()) {
    const arr = data[cls.wireKey] as ReadonlyArray<HyperedgeInput> | undefined;
    const camelArr = data[_camelCase(cls.wireKey)] as
      | ReadonlyArray<HyperedgeInput>
      | undefined;
    const source = arr ?? camelArr;
    if (!Array.isArray(source)) continue;
    for (const r of source) {
      const coerced = _coerceHyperedge(r, cls);
      if (coerced) out.push(coerced);
    }
  }

  for (const cls of HyperedgeRegistry.allClasses()) {
    for (const v1Key of cls.v1WireKeys ?? []) {
      const camelV1 = _camelCase(v1Key);
      const arr = data[v1Key] as
        | ReadonlyArray<Record<string, unknown>>
        | undefined;
      const camelArr = data[camelV1] as
        | ReadonlyArray<Record<string, unknown>>
        | undefined;
      const source = arr ?? camelArr;
      if (!Array.isArray(source)) continue;
      for (const h of source) {
        const migrated = _migrateV1Hash(cls, v1Key, h);
        if (migrated) {
          const Ctor = cls as unknown as new (data: unknown) => AbstractHyperedge;
          out.push(new Ctor(migrated));
        }
      }
    }
  }

  return _dedupeOrThrow(out);
}

function _assertNoAmbiguousInput(data: ConceptJson): void {
  if (!Array.isArray(data.relations)) return;
  const typedKeys: string[] = [];
  for (const cls of HyperedgeRegistry.allClasses()) {
    if (Array.isArray(data[cls.wireKey])) typedKeys.push(cls.wireKey);
    const camelWire = _camelCase(cls.wireKey);
    if (camelWire !== cls.wireKey && Array.isArray(data[camelWire])) {
      typedKeys.push(camelWire);
    }
    for (const v1 of cls.v1WireKeys ?? []) {
      if (Array.isArray(data[v1])) typedKeys.push(v1);
      const camelV1 = _camelCase(v1);
      if (camelV1 !== v1 && Array.isArray(data[camelV1])) typedKeys.push(camelV1);
    }
  }
  if (typedKeys.length > 0) {
    throw new Error(
      `Concept input is ambiguous: pass either 'relations' (unified) ` +
        `or typed wire keys (${typedKeys.join(', ')}), not both.`,
    );
  }
}

function _dedupeOrThrow(
  relations: ReadonlyArray<AbstractHyperedge>,
): ReadonlyArray<AbstractHyperedge> {
  const seen = new Map<string, AbstractHyperedge>();
  for (const r of relations) {
    const id = _hyperedgeIdentity(r);
    if (seen.has(id)) {
      throw new Error(
        `Concept input has duplicate hyperedge (identity=${id}). ` +
          `Passing the same relation twice is a bug.`,
      );
    }
    seen.set(id, r);
  }
  return relations;
}

function _hyperedgeIdentity(r: AbstractHyperedge | null | undefined): string {
  if (r == null) return '';
  const Cls = r.constructor as {
    name: string;
    identityOf?: (v: unknown) => string;
  };
  if (typeof Cls?.identityOf === 'function') {
    return `${Cls.name}::${Cls.identityOf(r)}`;
  }
  return String(r);
}

function _coerceHyperedge(
  value: HyperedgeInput | null | undefined,
  fallbackClass?: HyperedgeClass,
): AbstractHyperedge | null {
  if (value == null) return null;
  if (value instanceof AbstractHyperedge) return value;

  const hash =
    typeof (value as { toJSON?: () => unknown }).toJSON === 'function'
      ? ((value as { toJSON: () => unknown }).toJSON() as Record<string, unknown>)
      : (value as Record<string, unknown>);
  const cls = _classForHash(hash) ?? fallbackClass;
  if (!cls) return null;
  const Ctor = cls as unknown as new (data: unknown) => AbstractHyperedge;
  return new Ctor(hash);
}

function _classForHash(hash: unknown): HyperedgeClass | null {
  if (!hash || typeof hash !== 'object') return null;
  const type = (hash as { type?: unknown }).type;
  if (typeof type !== 'string') return null;
  return HyperedgeRegistry.forTypeTag(type);
}

function _migrateV1Hash(
  cls: HyperedgeClass,
  v1Key: string,
  hash: Record<string, unknown>,
): Record<string, unknown> | null {
  if (cls === PartitiveHyperedge && v1Key === 'partitive_hyperedges') {
    return migrateHyperedgeToRelation(hash) as unknown as Record<string, unknown>;
  }
  return null;
}

function _camelCase(s: string): string {
  if (typeof s !== 'string' || !s.includes('_')) return s;
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function _normalizeDomains(
  domains: ReadonlyArray<ConceptReferenceJson | ConceptReference> | null | undefined,
  groups: ReadonlyArray<unknown> | null | undefined,
): ReadonlyArray<ConceptReference> {
  if (domains) {
    return domains.map((d) =>
      d instanceof ConceptReference
        ? d
        : new ConceptReference(d as ConceptReferenceJson),
    );
  }
  if (groups) {
    return groups.map((g) =>
      typeof g === 'string'
        ? ConceptReference.domain(g)
        : new ConceptReference(g as ConceptReferenceJson),
    );
  }
  return [];
}
