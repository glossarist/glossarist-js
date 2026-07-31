// Validates that every ConceptSource#sourced_from Citation includes a
// locality. Per concept-model commit 9c065df ("sourced_from citations
// must include locality"), a sourced_from entry without a locality is
// incomplete — the reader cannot locate the definition in the upstream
// document. The schema (schemas/v3/concept.yaml) enforces this at
// YAML-load time; this rule surfaces violations in already-parsed
// Concepts for defense-in-depth.
//
// Severity: error. A sourced_from without locality is data loss for
// the reader.

import { ValidationRule } from './validation-rule.js';

export class SourcedFromLocalityRule extends ValidationRule {
  constructor() { super('sourced-from-locality', 'error'); }

  validate(concept, path, result) {
    const sources = concept.sources ?? [];
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
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
        const source = lcSources[i];
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
