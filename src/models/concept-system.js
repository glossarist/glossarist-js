// ConceptSystem — first-class concept system entity per ISO 12620 A.7.
//
// Promotes the previously-implicit concept system (domains + tags +
// relation graph) to an explicit first-class entity. Per-file at
// `concept-systems/<id>.yaml`.
//
// See docs/design/concept-systems.md (concept-model repo).

import { GlossaristModel } from './base.js';
import { ConceptRef } from './concept-ref.js';
import {
  CONCEPT_SYSTEM_TYPE,
  CONCEPT_SYSTEM_TYPE_VALUES,
  isValidConceptSystemType,
} from './concept-system-type.js';

export class ConceptSystem extends GlossaristModel {
  constructor(data = {}) {
    super();
    this.id = _ensureNonEmptyString(data.id, 'id');
    this.name = _ensureName(data.name);
    this.type = _resolveType(data.type);
    this.domain = data.domain ?? null;
    this.purpose = data.purpose ?? null;
    this.members = _ensureMembers(data.members);
    this.hyperedges = Array.isArray(data.hyperedges) ? [...data.hyperedges] : [];
    this.rootConcepts = Array.isArray(data.rootConcepts)
      ? data.rootConcepts.map(c => c instanceof ConceptRef ? c : new ConceptRef(c))
      : [];
    this.sources = Array.isArray(data.sources) ? [...data.sources] : [];
    this.status = data.status ?? null;
  }

  get isGeneric()     { return this.type === CONCEPT_SYSTEM_TYPE.GENERIC; }
  get isPartitive()   { return this.type === CONCEPT_SYSTEM_TYPE.PARTITIVE; }
  get isSequential()  { return this.type === CONCEPT_SYSTEM_TYPE.SEQUENTIAL; }
  get isAssociative() { return this.type === CONCEPT_SYSTEM_TYPE.ASSOCIATIVE; }
  get isMixed()       { return this.type === CONCEPT_SYSTEM_TYPE.MIXED; }

  hasHyperedge(edgeId) {
    return this.hyperedges.includes(edgeId);
  }

  hasMember(refOrUri) {
    const uri = typeof refOrUri === 'string' ? refOrUri : _refUri(refOrUri);
    return this.members.some(m => _refUri(m) === uri);
  }

  identity() {
    return this.id;
  }

  toJSON() {
    const obj = {
      id: this.id,
      name: { ...this.name },
      type: this.type,
      members: this.members.map(m => m.toJSON()),
    };
    if (this.domain != null) obj.domain = this.domain;
    if (this.purpose != null) obj.purpose = { ...this.purpose };
    if (this.hyperedges.length > 0) obj.hyperedges = [...this.hyperedges];
    if (this.rootConcepts.length > 0) obj.rootConcepts = this.rootConcepts.map(c => c.toJSON());
    if (this.sources.length > 0) obj.sources = [...this.sources];
    if (this.status != null) obj.status = this.status;
    return obj;
  }

  static fromJSON(data) {
    return new ConceptSystem(data);
  }
}

function _ensureNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`ConceptSystem#${fieldName} must be a non-empty string`);
  }
  return value;
}

function _ensureName(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('ConceptSystem#name must be a localized object (e.g. { eng: "..." })');
  }
  return { ...value };
}

function _resolveType(value) {
  if (value == null) {
    throw new Error(
      'ConceptSystem#type is required; one of ' +
      CONCEPT_SYSTEM_TYPE_VALUES.join(', '),
    );
  }
  if (!isValidConceptSystemType(value)) {
    throw new Error(
      `ConceptSystem#type ${JSON.stringify(value)} invalid; ` +
      `must be one of: ${CONCEPT_SYSTEM_TYPE_VALUES.join(', ')}`,
    );
  }
  return value;
}

function _ensureMembers(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('ConceptSystem#members must be a non-empty array');
  }
  return values.map(v => v instanceof ConceptRef ? v : new ConceptRef(v));
}

function _refUri(ref) {
  const r = ref?.ref ?? ref ?? {};
  return `${r.source ?? ''}:${r.id ?? ''}`;
}

export default ConceptSystem;
