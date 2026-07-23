// Validates ExternalConcept shape (status: external).
//
// Per TODO.partitive-relation-v2 item 06, an ExternalConcept is a
// ManagedConcept with status: external. External concepts:
//   - MUST have at least one designation (the name by which they're referenced)
//   - MUST NOT have a definition (contradicts status: external)
//   - MUST NOT have sources (we don't define them)
//
// Severity: error. An external concept with a definition or sources
// contradicts the semantic role of "external" and should be re-typed
// to a real concept status (valid, draft, etc.).

import { ValidationRule } from './validation-rule.js';

export class ExternalConceptShapeRule extends ValidationRule {
  constructor() { super('external-concept-shape', 'error'); }

  validate(concept, path, result) {
    if (concept.status !== 'external') return;

    // Every concept — even an external one — needs at least one
    // designation (the name by which it is referenced).
    let designationCount = 0;
    for (const lang of concept.languages ?? []) {
      const lc = concept.localization?.(lang);
      if (!lc) continue;
      designationCount += (lc.terms ?? []).length;
    }
    if (designationCount === 0) {
      this.addIssue(result,
        `${path}localizations.*.terms`,
        'ExternalConcept has no designations; every concept (including external) ' +
        'needs at least one designation (the name by which it is referenced)',
      );
    }

    // External concepts must NOT have a definition or sources.
    for (const lang of concept.languages ?? []) {
      const lc = concept.localization?.(lang);
      if (!lc) continue;

      if ((lc.definitions ?? []).length > 0) {
        this.addIssue(result,
          `${path}localizations.${lang}.definitions`,
          `ExternalConcept has a definition in language '${lang}'; ` +
          `external concepts are referenced but not defined here ` +
          `(move the definition to the providing dataset and add a provided_by edge)`,
        );
      }

      if ((lc.sources ?? []).length > 0) {
        this.addIssue(result,
          `${path}localizations.${lang}.sources`,
          `ExternalConcept has sources in language '${lang}'; ` +
          `external concepts should not carry sources (sources belong on the providing concept)`,
        );
      }
    }
  }
}
