import { GlossaristModel } from './base.js';

export interface GcrStatisticsJson {
  total_concepts?: number;
  totalConcepts?: number;
  concepts_with_definitions?: number;
  conceptsWithDefinitions?: number;
  concepts_by_status?: Record<string, number>;
  conceptsByStatus?: Record<string, number>;
}

interface ConceptLike {
  languages: ReadonlyArray<string>;
  localization(lang: string): {
    definitions: ReadonlyArray<unknown>;
    entryStatus?: string | null;
  } | null | undefined;
}

export class GcrStatistics extends GlossaristModel {
  readonly totalConcepts: number;
  readonly conceptsWithDefinitions: number;
  readonly conceptsByStatus: Record<string, number>;

  constructor(data: GcrStatisticsJson = {}) {
    super();
    this.totalConcepts = data.total_concepts ?? data.totalConcepts ?? 0;
    this.conceptsWithDefinitions =
      data.concepts_with_definitions ?? data.conceptsWithDefinitions ?? 0;
    this.conceptsByStatus =
      (data.concepts_by_status as Record<string, number>) ??
      (data.conceptsByStatus as Record<string, number>) ??
      {};
  }

  get total_concepts(): number { return this.totalConcepts; }
  get concepts_with_definitions(): number { return this.conceptsWithDefinitions; }
  get concepts_by_status(): Record<string, number> { return this.conceptsByStatus; }

  override toJSON(): GcrStatisticsJson {
    const obj: GcrStatisticsJson = { total_concepts: this.totalConcepts };
    if (this.conceptsWithDefinitions > 0) {
      obj.concepts_with_definitions = this.conceptsWithDefinitions;
    }
    if (Object.keys(this.conceptsByStatus).length > 0) {
      obj.concepts_by_status = this.conceptsByStatus;
    }
    return obj;
  }

  static override fromJSON(data: GcrStatisticsJson): GcrStatistics {
    return new GcrStatistics(data);
  }

  static fromConcepts(concepts: ReadonlyArray<ConceptLike>): GcrStatistics {
    const langs = new Set<string>();
    let withDefs = 0;
    const byStatus: Record<string, number> = {};

    for (const concept of concepts) {
      for (const lang of concept.languages) {
        langs.add(lang);
        const lc = concept.localization(lang);
        if (lc && lc.definitions.length > 0) withDefs++;
        const status = lc?.entryStatus ?? 'unknown';
        byStatus[status] = (byStatus[status] ?? 0) + 1;
      }
    }

    return new GcrStatistics({
      total_concepts: concepts.length,
      concepts_with_definitions: withDefs,
      concepts_by_status: byStatus,
    });
  }
}
