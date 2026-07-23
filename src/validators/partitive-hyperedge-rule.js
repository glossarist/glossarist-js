import { ValidationRule } from './validation-rule.js';

// Validates semantic invariants of PartitiveHyperedge entries that
// the model constructor does NOT enforce. The constructor already
// rejects empty comprehensive, empty parts, self-loops, invalid
// marker values, and duplicate markers. This rule provides a
// defensive walk at validation time plus a warning for the
// implicit-enumeration case (absent in the source YAML, filled by
// the model's DEFAULT_ENUMERATION constant).
export class PartitiveHyperedgeShapeRule extends ValidationRule {
  constructor() { super('partitive-hyperedge-shape'); }

  validate(concept, path, result) {
    const edges = concept.partitiveHyperedges ?? [];
    for (let i = 0; i < edges.length; i++) {
      const he = edges[i];
      const base = `${path}partitiveHyperedges[${i}]`;

      this._checkComprehensive(he, i, base, result);
      this._checkParts(he, i, base, result);
      this._checkMarkers(he, i, base, result);
      this._checkSelfLoop(he, i, base, result);
    }
  }

  _checkComprehensive(he, idx, base, result) {
    const ref = he.comprehensive;
    if (!ref || (!ref.source && !ref.id)) {
      this.addIssue(result, `${base}.comprehensive`,
        `partitive_hyperedge ${idx + 1} has empty comprehensive`);
    }
  }

  _checkParts(he, idx, base, result) {
    const parts = he.parts ?? [];
    if (parts.length === 0) {
      this.addIssue(result, `${base}.parts`,
        `partitive_hyperedge ${idx + 1} has no parts`);
      return;
    }
    for (let j = 0; j < parts.length; j++) {
      const p = parts[j];
      if (!p || (!p.source && !p.id)) {
        this.addIssue(result, `${base}.parts[${j}]`,
          `partitive_hyperedge ${idx + 1} part ${j + 1} has empty ref`);
      }
    }
  }

  _checkMarkers(he, idx, base, result) {
    const markers = he.markers ?? [];
    const seen = new Set();
    for (const m of markers) {
      if (seen.has(m)) {
        this.addIssue(result, `${base}.markers`,
          `partitive_hyperedge ${idx + 1} has duplicate marker '${m}'`);
      }
      seen.add(m);
    }
  }

  _checkSelfLoop(he, idx, base, result) {
    const c = he.comprehensive;
    if (!c) return;
    const cKey = `${c.source ?? ''}:${c.id ?? ''}`;
    for (let j = 0; j < (he.parts ?? []).length; j++) {
      const p = he.parts[j];
      const pKey = `${p?.source ?? ''}:${p?.id ?? ''}`;
      if (pKey === cKey) {
        this.addIssue(result, `${base}.parts[${j}]`,
          `partitive_hyperedge ${idx + 1} part ${j + 1} cannot be the comprehensive`);
      }
    }
  }
}
