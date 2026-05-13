export class GlossaristModel {
  toJSON(): Record<string, unknown>;
  static fromJSON(data: Record<string, unknown>): GlossaristModel;
  equals(other: GlossaristModel): boolean;
  clone(): GlossaristModel;
}

export class Concept extends GlossaristModel {
  readonly id: string;
  readonly term: string | null;
  readonly termid: string;
  readonly languages: string[];
  readonly localizations: Record<string, any>;
  readonly raw: Record<string, unknown> | null;
  readonly relatedConcepts: RelatedConcept[];
  readonly domains: ConceptReference[];
  readonly dates: ConceptDate[];
  readonly sources: ConceptSource[];
  readonly status: string | null;

  localization(lang: string): LocalizedConcept | undefined;
  primaryDesignation(lang: string): string | null;
  definition(lang: string): string | null;
  setLocalization(lang: string, lc: LocalizedConcept | Record<string, unknown>): this;
  hasLocalization(lang: string): boolean;
  static fromJSON(data: Record<string, unknown>): Concept;
}

export class LocalizedConcept extends GlossaristModel {
  readonly languageCode: string | null;
  readonly terms: Designation[];
  readonly definitions: DetailedDefinition[];
  readonly definition: DetailedDefinition[];
  readonly notes: { content: string }[];
  readonly examples: { content: string }[];
  readonly sources: ConceptSource[];
  readonly entryStatus: string | null;
  readonly domain: string | null;
  readonly primaryDesignation: string | null;
  readonly primaryDefinition: string | null;
  static fromJSON(data: Record<string, unknown>): LocalizedConcept;
}

export class Designation extends GlossaristModel {
  readonly designation: string;
  readonly type: string;
  readonly normativeStatus: string | null;
  static register(type: string, cls: typeof Designation): void;
  static fromData(data: Record<string, unknown>): Designation;
  static fromJSON(data: Record<string, unknown>): Designation;
}

export class Expression extends Designation {
  readonly gender: string | null;
  readonly plurality: string | null;
  readonly partOfSpeech: string | null;
  readonly geographicalArea: string | null;
}

export class Abbreviation extends Designation {}
export class Symbol extends Designation {
  readonly international: string | null;
}
export class GraphicalSymbol extends Designation {
  readonly image: string | null;
}

export class Citation extends GlossaristModel {
  readonly source: string | Record<string, unknown> | null;
  readonly ref: string | null;
  readonly id: string | null;
  readonly version: string | null;
  readonly clause: string | null;
  readonly link: string | null;
  readonly isStructured: boolean;
  toString(): string;
}

export class ConceptSource extends GlossaristModel {
  readonly status: string | null;
  readonly type: string | null;
  readonly origin: Citation | null;
  readonly modification: string | null;
}

export const RELATIONSHIP_TYPES: readonly string[];
export class RelatedConcept extends GlossaristModel {
  readonly type: string;
  readonly content: string | null;
  readonly ref: Citation | null;
}

export class ConceptReference extends GlossaristModel {
  readonly conceptId: string | null;
  readonly refType: string | null;
  readonly source: string | null;
  readonly urn: string | null;
  readonly isLocal: boolean;
  readonly isExternal: boolean;
  static domain(conceptId: string): ConceptReference;
  static fromJSON(data: Record<string, unknown>): ConceptReference;
}

export const DATE_TYPES: readonly string[];
export class ConceptDate extends GlossaristModel {
  readonly date: string | null;
  readonly type: string | null;
  readonly parsedDate: Date | null;
}

export class DetailedDefinition extends GlossaristModel {
  readonly content: string;
  readonly sources: Citation[];
}

export class NonVerbRep extends GlossaristModel {
  readonly image: string | null;
  readonly table: string | null;
  readonly formula: string | null;
  readonly sources: Citation[];
}

export class GcrStatistics extends GlossaristModel {
  readonly totalConcepts: number;
  readonly conceptsWithDefinitions: number;
  readonly conceptsByStatus: Record<string, number>;
  readonly total_concepts: number;
  readonly concepts_with_definitions: number;
  readonly concepts_by_status: Record<string, number>;
  static fromConcepts(concepts: Concept[]): GcrStatistics;
  static fromJSON(data: Record<string, unknown>): GcrStatistics;
}

export class GcrMetadata extends GlossaristModel {
  readonly shortname: string | null;
  readonly version: string | null;
  readonly title: string | null;
  readonly description: string | null;
  readonly owner: string | null;
  readonly tags: string[];
  readonly conceptCount: number;
  readonly languages: string[];
  readonly createdAt: string | null;
  readonly glossaristVersion: string | null;
  readonly schemaVersion: string;
  readonly homepage: string | null;
  readonly repository: string | null;
  readonly license: string | null;
  readonly uriPrefix: string | null;
  readonly conceptUriTemplate: string | null;
  readonly compiledFormats: string[];
  readonly statistics: GcrStatistics | null;
  readonly concept_count: number;
  readonly created_at: string | null;
  readonly glossarist_version: string | null;
  readonly schema_version: string;
  readonly compiled_formats: string[];
  static fromYaml(yamlString: string): GcrMetadata;
  static fromJSON(data: Record<string, unknown>): GcrMetadata;
}
