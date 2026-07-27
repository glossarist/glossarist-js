// PartitiveRelation → RDF quads.
//
// Shape (per concept-model ontology, v3.2.0):
//
//   <base>/partitive-relation/<carrying-id>/<comprehensive-id>
//     rdf:type                       gloss:PartitiveRelation
//     gloss:comprehensive            <base>/concept/<comprehensive-id>      (named node)
//     gloss:hasPartitive             <base>/concept/<partitive-id>         (named node, one per member)
//     gloss:completeness             "complete"|"partial"                   (literal)
//     gloss:criterion                "..."@lang                             (one per language, when present)
//
// Per-member multiplicity + is_delimiting are emitted as part of
// each member's named-node object via the partitiveMemberToQuads
// helper (separate file).
//
// The carrying concept links via `gloss:hasPartitiveRelation`.
//
// Replaces gloss-hyperedge.js (the v1 emitter) per TODO.partitive-relation-v2 item 01.
// Cross-repo alignment with glossarist-ruby's Rdf::GlossPartitiveRelation.

import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { namedNode, literal, quad } from './terms.js';

export function* partitiveRelationToQuads(relation, { parentUri, index }) {
  const subjectUri = partitiveRelationSubjectUri(parentUri, relation, index);
  const s = namedNode(subjectUri);

  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.PartitiveRelation));

  const comp = relation.comprehensive;
  if (comp && (comp.source || comp.id)) {
    yield quad(s, namedNode(PRED.gloss.comprehensive),
      namedNode(conceptRefUri(comp, parentUri)));
  }

  const members = Array.isArray(relation.partitives) ? relation.partitives : [];
  for (const member of members) {
    const ref = member?.ref ?? member;
    if (!ref || (!ref.source && !ref.id)) continue;
    const memberUri = conceptRefUri(ref, parentUri);
    yield quad(s, namedNode(PRED.gloss.hasPartitive), namedNode(memberUri));

    // Per-member multiplicity (ISO 704:2022) and is_delimiting.
    if (member?.multiplicity) {
      yield quad(namedNode(memberUri), namedNode(PRED.gloss.multiplicity),
        literal(member.multiplicity));
    }
    if (member?.is_delimiting === true) {
      yield quad(namedNode(memberUri), namedNode(PRED.gloss.isDelimiting),
        literal('true', 'xsd:boolean'));
    }
  }

  if (relation.completeness) {
    yield quad(s, namedNode(PRED.gloss.completeness), literal(relation.completeness));
  }

  if (relation.criterion && typeof relation.criterion === 'object') {
    for (const [lang, text] of Object.entries(relation.criterion)) {
      if (typeof text !== 'string') continue;
      yield quad(s, namedNode(PRED.gloss.criterion), literal(text, lang));
    }
  }
}

// Subject URI scheme: `<base>/partitive-relation/<carrying-id>/<comprehensive-id>`.
// Matches the Ruby emitter's scheme. Falls back to an index suffix if
// the comprehensive has no id, so two relations on the same concept
// never collide.
export function partitiveRelationSubjectUri(parentUri, relation, index) {
  const base = parentUri.replace(/\/concept\/[^/]+$/, '');
  const carrierId = parentUri.split('/concept/')[1] ?? `carrier-${index}`;
  const compId = relation?.comprehensive?.id ?? `comp-${index}`;
  return `${base}/partitive-relation/${carrierId}/${compId}`;
}

// ConceptRef URI resolution: `<base>/concept/<id>` for any ref with an
// id. Source is dropped (matches Ruby). Falls back to a stable urn:/
// form for refs with only a source (rare).
function conceptRefUri(ref, parentUri) {
  const id = ref?.id;
  if (id) {
    const base = parentUri.split('/concept/')[0];
    return `${base}/concept/${id}`;
  }
  return `urn:glossarist:${ref?.source ?? 'unknown'}:`;
}
