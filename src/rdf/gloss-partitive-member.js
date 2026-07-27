// PartitiveMember → RDF quads.
//
// Emits per-member predicates (multiplicity, is_delimiting) onto the
// member's concept URI. The member URI is constructed by the caller
// (typically `gloss-partitive-relation.js`).
//
// Extracted from `gloss-partitive-relation.js` per
// TODO.partitive-relation-v3/04 so future emitters (a standalone
// PartitiveMember listing, a stats aggregator) can reuse this
// emission without modifying the relation emitter (OCP).

import { PRED } from './predicates.js';
import { namedNode, literal, quad } from './terms.js';

// SKOS taxonomy namespace for multiplicity values. concept-model will
// ship the corresponding taxonomy; until then, the URIs are forward-
// compatible and resolve once the taxonomy lands.
//
// Per the JSON-LD context (`"@type": "@id"`), multiplicity objects
// MUST be URI references, not string literals. Emitted shape:
//   <member-uri> gloss:multiplicity <.../multiplicity/compulsory>
export const MULTIPLICITY_NS = 'https://www.glossarist.org/ontologies/multiplicity/';

export function* partitiveMemberToQuads(member, { memberUri }) {
  if (member?.multiplicity) {
    yield quad(
      namedNode(memberUri),
      namedNode(PRED.gloss.multiplicity),
      namedNode(MULTIPLICITY_NS + member.multiplicity),
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
