import { ValidationRule } from './validation-rule.js';
import type { Concept } from '../models/concept.js';
import type { ValidationResult } from './validation-result.js';

interface SourceLocality { type?: string; referenceFrom?: string; reference_from?: string }
interface SourceCitation { locality?: SourceLocality | null }
interface SourceLike {
  sourcedFrom?: ReadonlyArray<SourceCitation>;
  sourced_from?: ReadonlyArray<SourceCitation>;
}

export class SourcedFromLocalityRule extends ValidationRule {
  constructor() { super('sourced-from-locality', 'error'); }

  override validate(concept: Concept, path: string, result: ValidationResult) {
    const sources = concept.sources ?? [];
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i] as unknown as SourceLike;
      const sourcedFrom = source.sourcedFrom ?? source.sourced_from ?? [];
      for (let j = 0; j < sourcedFrom.length; j++) {
        const citation = sourcedFrom[j];
        const locality = citation?.locality;
        if (!locality || (!locality.type && !locality.referenceFrom && !locality.reference_from)) {
          this.addIssue(result,
            `${path}sources[${i}].sourced_from[${j}].locality`,
            `sourced_from citation ${j + 1} on source ${i + 1} has no locality ` +
            `(expected type + reference_from so the reader can locate the definition)`);
        }
      }
    }

    for (const lang of concept.languages ?? []) {
      const lc = concept.localization?.(lang);
      if (!lc) continue;
      const lcSources = lc.sources ?? [];
      for (let i = 0; i < lcSources.length; i++) {
        const source = lcSources[i] as unknown as SourceLike;
        const sourcedFrom = source.sourcedFrom ?? source.sourced_from ?? [];
        for (let j = 0; j < sourcedFrom.length; j++) {
          const citation = sourcedFrom[j];
          const locality = citation?.locality;
          if (!locality || (!locality.type && !locality.referenceFrom && !locality.reference_from)) {
            this.addIssue(result,
              `${path}localizations.${lang}.sources[${i}].sourced_from[${j}].locality`,
              `sourced_from citation ${j + 1} on localization source ${i + 1} has no locality`);
          }
        }
      }
    }
  }
}
