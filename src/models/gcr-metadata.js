import yaml from 'js-yaml';
import { GlossaristModel } from './base.js';
import { GcrStatistics } from './gcr-statistics.js';

export class GcrMetadata extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.shortname = data.shortname ?? null;
    this.version = data.version ?? null;
    this.title = data.title ?? null;
    this.description = data.description ?? null;
    this.owner = data.owner ?? null;
    this.tags = data.tags ?? [];
    this.conceptCount = data.concept_count ?? data.conceptCount ?? 0;
    this.languages = data.languages ?? [];
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
      ? (data.statistics instanceof GcrStatistics ? data.statistics : new GcrStatistics(data.statistics))
      : null;
  }

  get concept_count() { return this.conceptCount; }
  get created_at() { return this.createdAt; }
  get glossarist_version() { return this.glossaristVersion; }
  get schema_version() { return this.schemaVersion; }
  get uri_prefix() { return this.uriPrefix; }
  get concept_uri_template() { return this.conceptUriTemplate; }
  get compiled_formats() { return this.compiledFormats; }

  toJSON() {
    const obj = {};
    if (this.shortname != null) obj.shortname = this.shortname;
    if (this.version != null) obj.version = this.version;
    if (this.title != null) obj.title = this.title;
    if (this.description != null) obj.description = this.description;
    if (this.owner != null) obj.owner = this.owner;
    if (this.tags.length > 0) obj.tags = this.tags;
    if (this.conceptCount > 0) obj.concept_count = this.conceptCount;
    if (this.languages.length > 0) obj.languages = this.languages;
    if (this.createdAt != null) obj.created_at = this.createdAt;
    if (this.glossaristVersion != null) obj.glossarist_version = this.glossaristVersion;
    if (this.schemaVersion != null) obj.schema_version = this.schemaVersion;
    if (this.homepage != null) obj.homepage = this.homepage;
    if (this.repository != null) obj.repository = this.repository;
    if (this.license != null) obj.license = this.license;
    if (this.uriPrefix != null) obj.uri_prefix = this.uriPrefix;
    if (this.conceptUriTemplate != null) obj.concept_uri_template = this.conceptUriTemplate;
    if (this.compiledFormats.length > 0) obj.compiled_formats = this.compiledFormats;
    if (this.statistics != null) obj.statistics = this.statistics.toJSON();
    return obj;
  }

  static fromJSON(data) {
    return new GcrMetadata(data);
  }

  static fromYaml(yamlString) {
    return new GcrMetadata(yaml.load(yamlString));
  }
}
