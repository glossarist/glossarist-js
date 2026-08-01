import { resolveBibliographyRecord, findNonVerbalEntity } from './reference-resolver.js';

type Registry = Record<string, unknown>;
type AnyRef = { type?: string; [k: string]: unknown };

export class ReferenceClassifier {
  registry: Registry;
  sourceDatasetId: string | null;
  options: Record<string, unknown>;

  constructor(registry: Registry = {}, sourceDatasetId: string | null = null, options: Record<string, unknown> = {}) {
    this.registry = registry;
    this.sourceDatasetId = sourceDatasetId;
    this.options = options;
  }

  classify(ref: AnyRef | null): string {
    if (ref == null) return 'unknown';

    switch (ref.type) {
      case 'concept':      return this._classifyConcept(ref);
      case 'dataset':      return this._classifyDataset(ref);
      case 'bibliography': return this._classifyBibliography(ref);
      case 'figure':
      case 'table':
      case 'formula':      return this._classifyNonVerbal(ref);
      case 'typed-ref':    return this._classifyTypedRef(ref);
      case 'standard':     return 'legacy-standard';
      default:             return 'unknown';
    }
  }

  _classifyConcept(ref: AnyRef): string {
    if (ref.uri) {
      const dsId = (ref.resolution as { datasetId?: string } | undefined)?.datasetId;
      if (!dsId) return 'unresolved';
      if (!this.registry[dsId]) return 'external-citation';
      if (dsId === this.sourceDatasetId) return 'same-dataset';
      return 'cross-dataset';
    }
    const lookupKey = ref.lookupKey as { designation?: string; id?: string; dataset?: string } | undefined;
    if (lookupKey?.designation) {
      return 'unresolved-designation';
    }
    if (lookupKey?.id) {
      const dsId = lookupKey.dataset;
      if (dsId && !this.registry[dsId]) return 'unresolved';
      if (dsId === this.sourceDatasetId) return 'same-dataset';
      return 'cross-dataset';
    }
    return 'unresolved';
  }

  _classifyDataset(ref: AnyRef): string {
    const resolution = ref.resolution as { kind?: string } | undefined;
    if (resolution?.kind === 'dataset-self') return 'dataset-self';
    if (resolution?.kind === 'dataset-namespace') return 'dataset-self';
    return 'unknown';
  }

  _classifyBibliography(ref: AnyRef): string {
    const citation = ref.citation as { ref?: { source?: string; id?: string; version?: string } } | undefined;
    if (citation) {
      return resolveBibliographyRecord(citation.ref ?? null, this.registry as Registry)
        ? 'internal-citation'
        : 'self-contained-citation';
    }
    if (ref.uri) {
      return resolveBibliographyRecord(ref.resolution as { source?: string; id?: string; version?: string } | null, this.registry as Registry)
        ? 'internal-citation'
        : 'external-citation';
    }
    return 'unresolved-citation';
  }

  _classifyTypedRef(_ref: AnyRef): string {
    return 'typed-ref';
  }

  _classifyNonVerbal(ref: AnyRef): string {
    return findNonVerbalEntity(ref as unknown as Parameters<typeof findNonVerbalEntity>[0], this.registry as Registry)
      ? 'internal-citation'
      : 'external-citation';
  }
}
