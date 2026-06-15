import { resolveBibliographyRecord } from './reference-resolver.js';

export class ReferenceClassifier {
  constructor(registry = {}, sourceDatasetId = null, options = {}) {
    this.registry = registry;
    this.sourceDatasetId = sourceDatasetId;
    this.options = options;
  }

  classify(ref) {
    if (ref == null) return 'unknown';

    switch (ref.type) {
      case 'concept':      return this._classifyConcept(ref);
      case 'dataset':      return this._classifyDataset(ref);
      case 'bibliography': return this._classifyBibliography(ref);
      case 'typed-ref':    return this._classifyTypedRef(ref);
      case 'standard':     return 'legacy-standard';
      default:             return 'unknown';
    }
  }

  _classifyConcept(ref) {
    if (ref.uri) {
      const dsId = ref.resolution?.datasetId;
      if (!dsId) return 'unresolved';
      if (!this.registry[dsId]) return 'external-citation';
      if (dsId === this.sourceDatasetId) return 'same-dataset';
      return 'cross-dataset';
    }
    if (ref.lookupKey?.designation) {
      return 'unresolved-designation';
    }
    if (ref.lookupKey?.id) {
      const dsId = ref.lookupKey.dataset;
      if (!this.registry[dsId]) return 'unresolved';
      if (dsId === this.sourceDatasetId) return 'same-dataset';
      return 'cross-dataset';
    }
    return 'unresolved';
  }

  _classifyDataset(ref) {
    if (ref.resolution?.kind === 'dataset-self') return 'dataset-self';
    if (ref.resolution?.kind === 'dataset-namespace') return 'dataset-self';
    return 'unknown';
  }

  _classifyBibliography(ref) {
    if (ref.citation) {
      return resolveBibliographyRecord(ref.citation.ref, this.registry)
        ? 'internal-citation'
        : 'self-contained-citation';
    }
    if (ref.uri) {
      return resolveBibliographyRecord(ref.resolution, this.registry)
        ? 'internal-citation'
        : 'external-citation';
    }
    return 'unresolved-citation';
  }

  _classifyTypedRef(_ref) {
    return 'typed-ref';
  }
}
