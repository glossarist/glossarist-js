// PartitiveRelation → RDF quads.
//
// Shape (per concept-model ontology, v3.2.0):
//
//   <base>/partitive-relation/<carrying-id>/<comprehensive-id>
//     rdf:type                       gloss:PartitiveRelation
//     gloss:comprehensive            <base>/concept/<comprehensive-id>      (named node)
//     gloss:hasPartitive             <base>/concept/<partitive-id>         (named node, one per member)
//     gloss:completeness             "complete"|"partial"                   (literal)
//     gloss:hasPlurality             <plurality bnode>                      (when plurality present)
//     gloss:criterion                "..."@lang                             (one per language, when present)
//
// Plurality bnode (when present):
//
//   _:b<n>
//     rdf:type                       gloss:TypeSharedPlurality
//     gloss:isShared                 true|false                             (literal)
//     gloss:isUncertain              true|false                             (literal, when non-default)
//     gloss:sharedType               <base>/concept/<shared-type-id>        (when shared_type present)
//
// The carrying concept links via `gloss:hasPartitiveRelation`.
//
// Replaces gloss-hyperedge.js (the v1 emitter) per TODO.partitive-relation-v2 item 01.
// Cross-repo alignment with glossarist-ruby's Rdf::GlossPartitiveRelation.

import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { deterministicBnode } from './deterministic-id.js';
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
    yield quad(s, namedNode(PRED.gloss.hasPartitive),
      namedNode(conceptRefUri(ref, parentUri)));
  }

  if (relation.completeness) {
    yield quad(s, namedNode(PRED.gloss.completeness), literal(relation.completeness));
  }

  if (relation.plurality != null) {
    const pSubject = deterministicBnode(subjectUri, 'plurality', 0);
    yield quad(s, namedNode(PRED.gloss.hasPlurality), namedNode(pSubject));
    yield* pluralityToQuads(relation.plurality, pSubject);
  }

  if (relation.criterion && typeof relation.criterion === 'object') {
    for (const [lang, text] of Object.entries(relation.criterion)) {
      if (typeof text !== 'string') continue;
      yield quad(s, namedNode(PRED.gloss.criterion), literal(text, lang));
    }
  }
}

function* pluralityToQuads(plurality, subjectUri) {
  const s = namedNode(subjectUri);
  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.TypeSharedPlurality));
  yield quad(s, namedNode(PRED.gloss.isShared), literal(plurality.isShared ? 'true' : 'false', 'xsd:boolean'));
  if (plurality.isUncertain) {
    yield quad(s, namedNode(PRED.gloss.isUncertain), literal('true', 'xsd:boolean'));
  }
  if (plurality.sharedType) {
    // sharedType is a ConceptRef-like object; emit as a concept URI.
    // We don't have parentUri here, but sharedType typically points at
    // an external concept. Fall back to urn form.
    const st = plurality.sharedType;
    const uri = st.id
      ? `urn:glossarist:${st.source ?? 'unknown'}:${st.id}`
      : `urn:glossarist:${st.source ?? 'unknown'}:`;
    yield quad(s, namedNode(PRED.gloss.sharedType), namedNode(uri));
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
