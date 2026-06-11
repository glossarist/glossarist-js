/**
 * Classify a Reference for rendering.
 *
 * The classifier is constructed once per render with a registry
 * (and optional source dataset id). The classify() method is
 * pure and side-effect-free.
 *
 * Each `Reference.type` is its own `_classifyXxx` method. The
 * dispatch in classify() is closed for modification.
 */

export class ReferenceClassifier {
  /**
   * @param {object} registry — the deployment's dataset registry.
   * @param {string} [sourceDatasetId] — the dataset the source
   *   concept belongs to; used to determine "same-dataset".
   * @param {object} [options] — additional options (e.g. scope).
   */
  constructor(registry = {}, sourceDatasetId = null, options = {}) {
    this.registry = registry;
    this.sourceDatasetId = sourceDatasetId;
    this.options = options;
  }

  /**
   * @param {Reference} ref
   * @returns {string} — the classification (e.g. 'same-dataset',
   *   'internal-citation', 'unresolved', etc.)
   */
  classify(ref) {
    if (ref == null) return 'unknown';

    switch (ref.type) {
      case 'concept':    return this._classifyConcept(ref);
      case 'dataset':    return this._classifyDataset(ref);
      case 'bibliography': return this._classifyBibliography(ref);
      case 'typed-ref':  return this._classifyTypedRef(ref);
      case 'standard':   return 'legacy-standard';
      default:           return 'unknown';
    }
  }

  _classifyConcept(ref) {
    // 1. URI form, resolved to a dataset.
    if (ref.uri) {
      const dsId = ref.resolution?.datasetId;
      if (!dsId) return 'unresolved';
      if (!this.registry[dsId]) return 'external-citation';
      if (dsId === this.sourceDatasetId) return 'same-dataset';
      return 'cross-dataset';
    }
    // 2. Unanchored designation.
    if (ref.lookupKey?.designation) {
      return 'unresolved-designation';
    }
    // 3. Id-style (id-match, short-id, numeric).
    if (ref.lookupKey?.id) {
      const dsId = ref.lookupKey.dataset;
      if (!this.registry[dsId]) return 'unresolved';
      if (dsId === this.sourceDatasetId) return 'same-dataset';
      return 'cross-dataset';
    }
    // 4. Concept ref with target (legacy).
    if (ref.target) {
      return 'unresolved';
    }
    return 'unresolved';
  }

  _classifyDataset(ref) {
    if (ref.resolution?.kind === 'dataset-self') return 'dataset-self';
    if (ref.resolution?.kind === 'dataset-namespace') return 'dataset-self';
    return 'unknown';
  }

  _classifyBibliography(ref) {
    // 1. cite:key form: try the bibliography registry.
    if (ref.citation) {
      const bioRecord = this._tryBibliography(ref.citation.ref);
      if (bioRecord) return 'internal-citation';
      return 'self-contained-citation';
    }
    // 2. URI form: try the bibliography registry, then the
    //    resolution's datasetId (if it's a concept URI), else null.
    if (ref.uri) {
      const bioRecord = this._tryBibliography(ref.resolution);
      if (bioRecord) return 'internal-citation';
      return 'external-citation';
    }
    return 'unresolved-citation';
  }

  _classifyTypedRef(_ref) {
    return 'typed-ref';
  }

  _tryBibliography(citationRef) {
    if (!citationRef?.source || !citationRef?.id) return null;
    const bioColl = this.registry[`bibliography:${citationRef.source}`]?.concepts;
    if (!bioColl) return null;
    if (citationRef.version) {
      return bioColl.byIdAnd(citationRef.id, citationRef.version) ?? null;
    }
    return bioColl.byId(citationRef.id) ?? null;
  }
}
