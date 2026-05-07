import { GlossaristModel } from './base.js';

export class GcrStatistics extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.totalConcepts = data.total_concepts ?? data.totalConcepts ?? 0;
    this.conceptsWithDefinitions = data.concepts_with_definitions ?? data.conceptsWithDefinitions ?? 0;
    this.conceptsByStatus = data.concepts_by_status ?? data.conceptsByStatus ?? {};
  }

  get total_concepts() { return this.totalConcepts; }
  get concepts_with_definitions() { return this.conceptsWithDefinitions; }
  get concepts_by_status() { return this.conceptsByStatus; }

  toJSON() {
    const obj = { total_concepts: this.totalConcepts };
    if (this.conceptsWithDefinitions > 0) {
      obj.concepts_with_definitions = this.conceptsWithDefinitions;
    }
    if (Object.keys(this.conceptsByStatus).length > 0) {
      obj.concepts_by_status = this.conceptsByStatus;
    }
    return obj;
  }

  static fromJSON(data) {
    return new GcrStatistics(data);
  }

  static fromConcepts(concepts) {
    const langs = new Set();
    let withDefs = 0;
    const byStatus = {};

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
