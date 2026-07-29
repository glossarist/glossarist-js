// PartitiveHyperedge — a one-to-many partitive decomposition.
//
// One comprehensive concept (the whole) is related to one or more
// parts as a SINGLE relationship. Captures invariants that binary
// RelatedConcept edges cannot:
//
//   - which comprehensive owns which parts (set membership)
//   - plurality markers from the source diagram (double / dashed)
//   - enumeration completeness (closed: all parts listed; open:
//     other parts may exist)
//
// See concept-model/TODO.hyperedge/00-design-overview.md for the
// design rationale.
//
// Hyperedges coexist with binary `broader_partitive` /
// `narrower_partitive` edges. Use a binary edge for pairwise
// relationships without diagram metadata; use a hyperedge when the
// relationship is one-to-many with enumeration/marker metadata.

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  PARTITIVE_ENUMERATION,
  PARTITIVE_ENUMERATION_VALUES,
  isValidPartitiveEnumeration,
} from './partitive-enumeration.js';
import {
  PLURALITY_MARKER_VALUES,
  isValidPluralityMarker,
} from './plurality-marker.js';

const DEFAULT_ENUMERATION = PARTITIVE_ENUMERATION.CLOSED;

export class PartitiveHyperedge extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.comprehensive = ensureConceptRef(data.comprehensive, 'comprehensive');
    this.parts = ensureConceptRefArray(data.parts, 'parts');
    this.enumeration = resolveEnumeration(data.enumeration);
    this.markers = validateMarkers(data.markers ?? []);
    this.content = normalizeContent(data.content);

    assertNonEmptyParts(this.parts);
    assertNoSelfLoop(this.comprehensive, this.parts);
  }

  get isClosed() { return this.enumeration === PARTITIVE_ENUMERATION.CLOSED; }
  get isOpen() { return this.enumeration === PARTITIVE_ENUMERATION.OPEN; }
  get isMarked() { return this.markers.length > 0; }

  hasMarker(value) {
    return this.markers.includes(value);
  }

  hasEnumeration(value) {
    return this.enumeration === value;
  }

  get contentString() {
    if (!this.content) return null;
    const values = Object.values(this.content);
    return values.length > 0 ? values[0] : null;
  }

  toJSON() {
    const obj = {
      comprehensive: this.comprehensive.toJSON(),
      parts: this.parts.map(p => p.toJSON()),
      enumeration: this.enumeration,
    };
    if (this.markers.length > 0) obj.markers = [...this.markers];
    if (this.content != null) obj.content = this.content;
    return obj;
  }

  static identityOf(value) {
    const v = value ?? {};
    const c = v.comprehensive ?? {};
    const parts = Array.isArray(v.parts) ? v.parts : [];
    const partsStr = parts
      .map(p => `${p?.source ?? ''}:${p?.id ?? ''}`)
      .sort();
    return `${c.source ?? ''}:${c.id ?? ''}|${partsStr.join('|')}`;
  }

  identity() {
    return PartitiveHyperedge.identityOf(this);
  }

  static fromJSON(data) {
    return new PartitiveHyperedge(data);
  }
}

function resolveEnumeration(value) {
  if (value == null) return DEFAULT_ENUMERATION;
  if (!isValidPartitiveEnumeration(value)) {
    throw new Error(
      `invalid enumeration ${JSON.stringify(value)}; ` +
      `must be one of ${PARTITIVE_ENUMERATION_VALUES.join(', ')}`,
    );
  }
  return value;
}

function validateMarkers(values) {
  const arr = Array.isArray(values) ? values : [values];
  const seen = new Set();
  for (const m of arr) {
    if (!isValidPluralityMarker(m)) {
      throw new Error(
        `invalid plurality marker ${JSON.stringify(m)}; ` +
        `must be one of ${PLURALITY_MARKER_VALUES.join(', ')}`,
      );
    }
    if (seen.has(m)) {
      throw new Error(
        `duplicate plurality marker ${JSON.stringify(m)} in partitive_hyperedge`,
      );
    }
    seen.add(m);
  }
  return arr;
}

function ensureConceptRef(value, fieldName) {
  const ref = value instanceof ConceptRef ? value : new ConceptRef(value ?? {});
  if (!ref.source && !ref.id) {
    throw new Error(
      `PartitiveHyperedge#${fieldName} must be a non-empty ConceptRef ` +
      `(source or id required)`,
    );
  }
  return ref;
}

function ensureConceptRefArray(values, fieldName) {
  if (!Array.isArray(values)) values = values == null ? [] : [values];
  return values.map((v, i) => ensureConceptRef(v, `${fieldName}[${i}]`));
}

function assertNonEmptyParts(parts) {
  if (!parts || parts.length === 0) {
    throw new Error('PartitiveHyperedge requires at least one part');
  }
}

function assertNoSelfLoop(comprehensive, parts) {
  const cKey = `${comprehensive.source ?? ''}:${comprehensive.id ?? ''}`;
  for (const p of parts) {
    const pKey = `${p.source ?? ''}:${p.id ?? ''}`;
    if (pKey === cKey) {
      throw new Error('PartitiveHyperedge#parts cannot include the comprehensive');
    }
  }
}

// Content is a localized string (language -> text). Plain strings on
// input are normalized to `{ default: '...' }` so callers always see
// the same shape. `null` is preserved.
//
// Cross-repo symmetry: glossarist-ruby's `PartitiveHyperedge#content=`
// (lib/glossarist/v3/partitive_hyperedge.rb) applies the same
// normalization since commit c917846 (was previously a plain string;
// aligned with invariant I7 in TODO.hyperedges round 1, item 29).
// Datasets now round-trip identically across repos.
function normalizeContent(value) {
  if (value == null) return null;
  if (typeof value === 'string') return { default: value };
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => typeof v === 'string');
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }
  return null;
}
