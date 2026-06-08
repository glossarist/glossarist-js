export const ORDERING_METHODS: readonly string[];
export class Section extends GlossaristModel {
  readonly id: string | null;
  readonly names: Record<string, string>;
  readonly ordering: string | null;
  readonly children: Section[];
  name(lang: string): string | null;
  descendantById(id: string): Section | null;
  static fromJSON(data: Record<string, unknown>): Section;
}

export const REGISTER_STATUSES: readonly string[];
export class Register extends GlossaristModel {
  readonly schemaVersion: string;
  readonly id: string | null;
  readonly ref: string | null;
  readonly refAliases: string[];
  readonly year: number | null;
  readonly urn: string | null;
  readonly urnAliases: string[];
  readonly status: string | null;
  readonly supersedes: string | null;
  readonly owner: string | null;
  readonly sourceRepo: string | null;
  readonly tags: string[];
  readonly languages: string[];
  readonly languageOrder: string[];
  readonly ordering: string | null;
  readonly logo: { path?: string; alt?: string } | null;
  readonly description: Record<string, string>;
  readonly about: Record<string, string>;
  readonly provenance: Record<string, unknown>[];
  readonly contributors: Record<string, unknown>[];
  readonly sections: Section[];
  sectionById(id: string): Section | null;
  sectionName(sectionId: string, lang: string): string | null;
  static fromJSON(data: Record<string, unknown>): Register;
}

export class GlossaristModel {
  toJSON(): Record<string, unknown>;
  static fromJSON(data: Record<string, unknown>): GlossaristModel;
  equals(other: GlossaristModel): boolean;
  clone(): GlossaristModel;
}

export class Concept extends GlossaristModel {
  readonly id: string;
  readonly term: string | null;
  readonly uri: string | null;
  readonly termid: string;
  readonly languages: string[];
  readonly localizations: Record<string, any>;
  readonly raw: Record<string, unknown> | null;
  readonly relatedConcepts: RelatedConcept[];
  readonly domains: ConceptReference[];
  readonly tags: string[];
  readonly dates: ConceptDate[];
  readonly sources: ConceptSource[];
  readonly status: string | null;
  readonly schemaVersion: string | null;

  localization(lang: string): LocalizedConcept | undefined;
  primaryDesignation(lang: string): string | null;
  definition(lang: string): string | null;
  setLocalization(lang: string, lc: LocalizedConcept | Record<string, unknown>): this;
  hasLocalization(lang: string): boolean;
  static fromJSON(data: Record<string, unknown>): Concept;
}

export class LocalizedConcept extends GlossaristModel {
  readonly languageCode: string | null;
  readonly script: string | null;
  readonly system: string | null;
  readonly entryStatus: string | null;
  readonly classification: string | null;
  readonly reviewType: string | null;
  readonly domain: string | null;
  readonly release: string | null;
  readonly lineageSourceSimilarity: number | null;
  readonly reviewDate: string | null;
  readonly reviewDecisionDate: string | null;
  readonly reviewDecisionEvent: string | null;
  readonly reviewStatus: string | null;
  readonly reviewDecision: string | null;
  readonly reviewDecisionNotes: string | null;
  readonly terms: Designation[];
  readonly definitions: DetailedDefinition[];
  readonly definition: DetailedDefinition[];
  readonly notes: DetailedDefinition[];
  readonly annotations: DetailedDefinition[];
  readonly examples: DetailedDefinition[];
  readonly sources: ConceptSource[];
  readonly dates: ConceptDate[];
  readonly nonVerbalRep: NonVerbRep[];
  readonly related: RelatedConcept[];
  readonly primaryDesignation: string | null;
  readonly primaryDefinition: string | null;
  static fromJSON(data: Record<string, unknown>): LocalizedConcept;
}

export class Designation extends GlossaristModel {
  readonly designation: string;
  readonly type: string;
  readonly normativeStatus: string | null;
  readonly absent: boolean | null;
  readonly fieldOfApplication: string | null;
  readonly usageInfo: string | null;
  readonly geographicalArea: string | null;
  readonly language: string | null;
  readonly script: string | null;
  readonly system: string | null;
  readonly international: boolean | null;
  readonly termType: string | null;
  readonly pronunciations: Pronunciation[];
  readonly sources: ConceptSource[];
  readonly related: (RelatedConcept | DesignationRelationship)[];
  static register(type: string, cls: typeof Designation): void;
  static fromData(data: Record<string, unknown>): Designation;
  static fromJSON(data: Record<string, unknown>): Designation;
}

export class Expression extends Designation {
  readonly prefix: string | null;
  readonly grammarInfo: GrammarInfo[];
}

export class Abbreviation extends Expression {
  readonly acronym: boolean;
  readonly initialism: boolean;
  readonly truncation: boolean;
}

export class Symbol extends Designation {}

export class LetterSymbol extends Symbol {
  readonly text: string | null;
}

export class GraphicalSymbol extends Symbol {
  readonly text: string | null;
  readonly image: string | null;
}

export const GRAMMAR_GENDERS: readonly string[];
export const GRAMMAR_NUMBERS: readonly string[];
export const GRAMMAR_PARTS_OF_SPEECH: readonly string[];

export class GrammarInfo extends GlossaristModel {
  readonly gender: string | null;
  readonly number: string | null;
  readonly partOfSpeech: string | null;
  readonly noun: boolean;
  readonly verb: boolean;
  readonly adj: boolean;
  readonly adverb: boolean;
  readonly preposition: boolean;
  readonly participle: boolean;
}

export class Pronunciation extends GlossaristModel {
  readonly content: string | null;
  readonly language: string | null;
  readonly script: string | null;
  readonly country: string | null;
  readonly system: string | null;
}

export class Locality extends GlossaristModel {
  readonly type: string | null;
  readonly referenceFrom: string | null;
  readonly referenceTo: string | null;
}

export class Citation extends GlossaristModel {
  readonly ref: Citation.Ref | null;
  readonly locality: Locality | null;
  readonly link: string | null;
  readonly original: string | null;
  readonly customLocality: unknown;
  toString(): string;
  static fromJSON(data: Record<string, unknown>): Citation;
}

export namespace Citation {
  class Ref extends GlossaristModel {
    readonly source: string | null;
    readonly id: string | null;
    readonly version: string | null;
    toString(): string;
    static fromJSON(data: Record<string, unknown>): Ref;
  }
}

export class ConceptRef extends GlossaristModel {
  readonly source: string | null;
  readonly id: string | null;
  readonly text: string | null;
  toString(): string;
  static fromJSON(data: Record<string, unknown>): ConceptRef;
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
  readonly ref: ConceptRef | null;
}

export const DESIGNATION_RELATIONSHIP_TYPES: readonly string[];
export class DesignationRelationship extends GlossaristModel {
  readonly type: string | null;
  readonly content: string | null;
  readonly target: string | null;
  static fromJSON(data: Record<string, unknown>): DesignationRelationship;
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
  readonly sources: ConceptSource[];
}

export class NonVerbRep extends GlossaristModel {
  readonly type: string | null;
  readonly ref: string | null;
  readonly text: string | null;
  readonly sources: ConceptSource[];
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
