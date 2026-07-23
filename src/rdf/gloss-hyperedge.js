// PartitiveHyperedge → RDF quads.
//
// Shape (per concept-model ontology, v3.1.0):
//   <base>/hyperedge/<carrying-id>/<comprehensive-id>
//     rdf:type                    gloss:PartitiveHyperedge
//     gloss:comprehensive         <base>/concept/<comprehensive-id>
//     gloss:hasPart               <base>/concept/<part-id>        (one per part)
//     gloss:enumeration           "closed"|"open"                 (literal)
//     gloss:hasPluralityMarker    "double"|"dashed"               (literal, one per marker)
//     gloss:hyperedgeContent      "..."                           (literal, omitted if absent)
//
// The carrying concept links to this hyperedge via `gloss:hasPartitiveHyperedge`
// (emitted by gloss-concept.js#conceptToQuads).
//
// CROSS-REPO STATUS (validated 2026-07-22):
//   - Subject URI scheme: matches Ruby (`hyperedge/<c>/<comp>`).
//   - `comprehensive`, `enumeration`, `hasPluralityMarker`, `hyperedgeContent`:
//     predicates + object types match Ruby.
//   - `hasPart`: JS follows the concept-model ontology; Ruby emits
//     `gloss:part` instead. This is a Ruby bug — tracked as a cross-repo
//     follow-up. Once Ruby aligns with the ontology, output will be
//     byte-equivalent (modulo serialization order).

import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { namedNode, literal, quad } from './terms.js';

export function* hyperedgeToQuads(hyperedge, { parentUri, index }) {
  const heSubject = hyperedgeSubjectUri(parentUri, hyperedge, index);
  const s = namedNode(heSubject);

  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(PRED.gloss.PartitiveHyperedge));

  const comp = hyperedge.comprehensive;
  if (comp && (comp.source || comp.id)) {
    yield quad(s, namedNode(PRED.gloss.comprehensive),
      namedNode(conceptRefUri(comp, parentUri)));
  }

  const parts = Array.isArray(hyperedge.parts) ? hyperedge.parts : [];
  for (const p of parts) {
    if (p && (p.source || p.id)) {
      yield quad(s, namedNode(PRED.gloss.hasPart),
        namedNode(conceptRefUri(p, parentUri)));
    }
  }

  if (hyperedge.enumeration) {
    yield quad(s, namedNode(PRED.gloss.enumeration), literal(hyperedge.enumeration));
  }

  for (const marker of Array.isArray(hyperedge.markers) ? hyperedge.markers : []) {
    yield quad(s, namedNode(PRED.gloss.hasPluralityMarker), literal(marker));
  }

  if (hyperedge.content) {
    const content = hyperedge.content;
    if (typeof content === 'string') {
      yield quad(s, namedNode(PRED.gloss.hyperedgeContent), literal(content));
    } else if (typeof content === 'object') {
      for (const [lang, text] of Object.entries(content)) {
        if (typeof text !== 'string') continue;
        yield quad(s, namedNode(PRED.gloss.hyperedgeContent), literal(text, lang));
      }
    }
  }
}

// Subject URI scheme: `<base>/hyperedge/<carrying-id>/<comprehensive-id>`.
// Matches Ruby's `subject { |h| "hyperedge/#{h.identifier}/#{h.comprehensive_id}" }`.
// Falls back to an index suffix if comprehensive has no id, so two
// hyperedges on the same concept never collide.
export function hyperedgeSubjectUri(parentUri, hyperedge, index) {
  const base = parentUri.replace(/\/concept\/[^/]+$/, '');
  const carrierId = parentUri.split('/concept/')[1] ?? `carrier-${index}`;
  const compId = hyperedge?.comprehensive?.id ?? `comp-${index}`;
  return `${base}/hyperedge/${carrierId}/${compId}`;
}

// ConceptRef URI: `<base>/concept/<id>`. Matches Ruby's
// `concept_to_gloss_transform.rb#hyperedge_concept_uri`. Source is
// dropped from the URI; it stays on the ConceptRef object if needed.
function conceptRefUri(ref, parentUri) {
  const id = ref?.id;
  if (id) {
    const base = parentUri.split('/concept/')[0];
    return `${base}/concept/${id}`;
  }
  return `urn:glossarist:${ref?.source ?? 'unknown'}:`;
}
