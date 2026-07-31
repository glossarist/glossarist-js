import * as yaml from 'js-yaml';
import { GlossaristModel } from './base.js';
import { GcrStatistics } from './gcr-statistics.js';
import type { GcrStatisticsJson } from './gcr-statistics.js';

export interface GcrMetadataJson {
  shortname?: string | null;
  version?: string | null;
  title?: string | null;
  description?: string | null;
  owner?: string | null;
  tags?: ReadonlyArray<string>;
  concept_count?: number;
  conceptCount?: number;
  languages?: ReadonlyArray<string>;
  created_at?: string | null;
  createdAt?: string | null;
  glossarist_version?: string | null;
  glossaristVersion?: string | null;
  schema_version?: string;
  schemaVersion?: string;
  homepage?: string | null;
  repository?: string | null;
  license?: string | null;
  uri_prefix?: string | null;
  uriPrefix?: string | null;
  concept_uri_template?: string | null;
  conceptUriTemplate?: string | null;
  compiled_formats?: ReadonlyArray<string>;
  compiledFormats?: ReadonlyArray<string>;
  statistics?: GcrStatisticsJson | GcrStatistics | null;
}

export class GcrMetadata extends GlossaristModel {
  readonly shortname: string | null;
  readonly version: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly owner: string | null;
  readonly tags: ReadonlyArray<string>;
  readonly conceptCount: number;
  readonly languages: ReadonlyArray<string>;
  readonly createdAt: string | null;
  readonly glossaristVersion: string | null;
  readonly schemaVersion: string;
  readonly homepage: string | null;
  readonly repository: string | null;
  readonly license: string | null;
  readonly uriPrefix: string | null;
  readonly conceptUriTemplate: string | null;
  readonly compiledFormats: ReadonlyArray<string>;
  readonly statistics: GcrStatistics | null;

  constructor(data: GcrMetadataJson = {}) {
    super();
    this.shortname = data.shortname ?? null;
    this.version = data.version ?? null;
    this.title = data.title ?? null;
    this.description = data.description ?? null;
    this.owner = data.owner ?? null;
    this.tags = (data.tags as ReadonlyArray<string>) ?? [];
    this.conceptCount = data.concept_count ?? data.conceptCount ?? 0;
    this.languages = (data.languages as ReadonlyArray<string>) ?? [];
    this.createdAt = data.created_at ?? data.createdAt ?? null;
    this.glossaristVersion = data.glossarist_version ?? data.glossaristVersion ?? null;
    this.schemaVersion = data.schema_version ?? data.schemaVersion ?? '1';
    this.homepage = data.homepage ?? null;
    this.repository = data.repository ?? null;
    this.license = data.license ?? null;
    this.uriPrefix = data.uri_prefix ?? data.uriPrefix ?? null;
    this.conceptUriTemplate = data.concept_uri_template ?? data.conceptUriTemplate ?? null;
    this.compiledFormats = data.compiled_formats ?? data.compiledFormats ?? [];
    this.statistics = data.statistics
      ? data.statistics instanceof GcrStatistics
        ? data.statistics
        : new GcrStatistics(data.statistics as GcrStatisticsJson)
      : null;
  }

  get concept_count(): number { return this.conceptCount; }
  get created_at(): string | null { return this.createdAt; }
  get glossarist_version(): string | null { return this.glossaristVersion; }
  get schema_version(): string { return this.schemaVersion; }
  get uri_prefix(): string | null { return this.uriPrefix; }
  get concept_uri_template(): string | null { return this.conceptUriTemplate; }
  get compiled_formats(): ReadonlyArray<string> { return this.compiledFormats; }

  override toJSON(): GcrMetadataJson {
    const obj: GcrMetadataJson = {};
    if (this.shortname != null) obj.shortname = this.shortname;
    if (this.version != null) obj.version = this.version;
    if (this.title != null) obj.title = this.title;
    if (this.description != null) obj.description = this.description;
    if (this.owner != null) obj.owner = this.owner;
    if (this.tags.length > 0) obj.tags = [...this.tags];
    if (this.conceptCount > 0) obj.concept_count = this.conceptCount;
    if (this.languages.length > 0) obj.languages = [...this.languages];
    if (this.createdAt != null) obj.created_at = this.createdAt;
    if (this.glossaristVersion != null) obj.glossarist_version = this.glossaristVersion;
    if (this.schemaVersion != null) obj.schema_version = this.schemaVersion;
    if (this.homepage != null) obj.homepage = this.homepage;
    if (this.repository != null) obj.repository = this.repository;
    if (this.license != null) obj.license = this.license;
    if (this.uriPrefix != null) obj.uri_prefix = this.uriPrefix;
    if (this.conceptUriTemplate != null) obj.concept_uri_template = this.conceptUriTemplate;
    if (this.compiledFormats.length > 0) obj.compiled_formats = [...this.compiledFormats];
    if (this.statistics != null) obj.statistics = this.statistics.toJSON();
    return obj;
  }

  static override fromJSON(data: GcrMetadataJson): GcrMetadata {
    return new GcrMetadata(data);
  }

  static fromYaml(yamlString: string): GcrMetadata {
    return new GcrMetadata(yaml.load(yamlString) as GcrMetadataJson);
  }
}
