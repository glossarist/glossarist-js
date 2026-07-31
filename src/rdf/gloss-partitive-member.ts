// @ts-nocheck — TEMPORARY during TS migration. TODO(Phase 2e): remove and type fully.
// PartitiveMember → RDF quads.
//
// Emits per-member predicates (presence, count, is_delimiting,
// derived multiplicity) onto the member's concept URI. The member URI
// is constructed by the caller (typically `gloss-partitive-relation.js`).
//
// Extracted from `gloss-partitive-relation.js` per
// TODO.partitive-relation-v3/04 so future emitters (a standalone
// PartitiveMember listing, a stats aggregator) can reuse this
// emission without modifying the relation emitter (OCP).
//
// v4 decomposition: ISO 704:2022 multiplicity is the cross product of
// two orthogonal dimensions (presence × count). Per the JSON-LD
// context (`"@type": "@id"`), all three are emitted as URI references
// into the corresponding SKOS taxonomy namespaces — none as literals.
//
//   <member-uri> gloss:presence     <.../presence/required|optional>
//   <member-uri> gloss:count        <.../count/exactly_one|at_least_one|multiple>
//   <member-uri> gloss:multiplicity  <.../multiplicity/{ISO name}>   (derived, v3 compat)
//   <member-uri> gloss:isDelimiting  "true"                           (xsd:boolean)

import { PRED } from './predicates.js';
import { namedNode, literal, quad } from './terms.js';
import { resolveMultiplicity } from '../models/multiplicity.js';

// SKOS taxonomy namespaces (concept-model will ship these taxonomies).
// Until then, the URIs are forward-compatible and resolve once the
// taxonomies land.
export const PRESENCE_NS = 'https://www.glossarist.org/ontologies/presence/';
export const COUNT_NS = 'https://www.glossarist.org/ontologies/count/';
export const MULTIPLICITY_NS = 'https://www.glossarist.org/ontologies/multiplicity/';

export function* partitiveMemberToQuads(member, { memberUri }) {
  if (member?.presence) {
    yield quad(
      namedNode(memberUri),
      namedNode(PRED.gloss.presence),
      namedNode(PRESENCE_NS + member.presence),
    );
  }
  if (member?.count) {
    yield quad(
      namedNode(memberUri),
      namedNode(PRED.gloss.count),
      namedNode(COUNT_NS + member.count),
    );
  }
  // Derived multiplicity URI for v3 RDF consumer backward compat.
  // v4 PartitiveMember carries presence + count natively; the legacy
  // multiplicity name is derived via the SSOT resolveMultiplicity().
  // For raw pre-v4 JSON that bypassed the model constructor and still
  // carries a literal multiplicity field, the resolver falls back to
  // that field. The invalid (optional, at_least_one) combination is
  // rejected at model construction — if it reaches the throw here,
  // the caller bypassed the model and we want the error to surface
  // rather than silently producing wrong RDF.
  const mult = resolveMultiplicity(member);
  if (mult) {
    yield quad(
      namedNode(memberUri),
      namedNode(PRED.gloss.multiplicity),
      namedNode(MULTIPLICITY_NS + mult),
    );
  }
  if (member?.is_delimiting === true) {
    yield quad(
      namedNode(memberUri),
      namedNode(PRED.gloss.isDelimiting),
      literal('true', 'xsd:boolean'),
    );
  }
}
