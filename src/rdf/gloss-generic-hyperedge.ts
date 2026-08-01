// GenericHyperedge → RDF quads.
//
// Shape (mirrors gloss-partitive-relation.js, swapping partitive
// predicates for generic predicates per the concept-model ontology
// extension that introduces gloss:GenericRelation):
//
//   <base>/generic-relation/<carrying-id>/<comprehensive-id>
//     rdf:type                       gloss:GenericRelation
//     gloss:comprehensive            <base>/concept/<comprehensive-id>      (named node)
//     gloss:hasGeneric               <base>/concept/<member-id>            (named node, one per member)
//     gloss:completeness             <.../completeness/complete|partial>   (named node, SKOS)
//     gloss:criterion                "..."@lang                             (literal, one per language)
//
// Per-member multiplicity + is_delimiting reuse the same shape as
// partitive members (HyperedgeMember is the shared base). Emitted via
// `partitiveMemberToQuads` — the per-member shape is type-blind.
//
// The carrying concept links via `gloss:hasGenericRelation`.
//
// Per TODO Phase 6e. When the concept-model ontology publishes the
// generic-relation predicates, this file is the single place to update
// the predicate strings; nothing else in the RDF layer changes.

import { PRED } from './predicates.js';
import { WELL_KNOWN } from './prefixes.js';
import { partitiveMemberToQuads } from './gloss-partitive-member.js';
import { namedNode, literal, quad } from './terms.js';

const COMPLETENESS_NS = 'https://www.glossarist.org/ontologies/completeness/';

// Predicate IRIs. concept-model ontology v3.2.0 does not yet publish
// GenericRelation predicates; we mint them under the same gloss:
// namespace following the PartitiveRelation naming convention. Update
// to match concept-model once finalized.
const HAS_GENERIC_RELATION = 'https://www.glossarist.org/ontologies/hasGenericRelation';
const HAS_GENERIC = 'https://www.glossarist.org/ontologies/hasGeneric';
const GENERIC_RELATION_TYPE = 'https://www.glossarist.org/ontologies/GenericRelation';

interface GenericRelationLike {
  comprehensive?: { source?: string; id?: string } | null;
  members?: ReadonlyArray<any>;
  completeness?: string | null;
  criterion?: Record<string, unknown> | null;
}

export function* genericHyperedgeToQuads(relation: GenericRelationLike, { parentUri, index }: { parentUri: string; index: number }) {
  const subjectUri = genericHyperedgeSubjectUri(parentUri, relation, index);
  const s = namedNode(subjectUri);

  yield quad(s, namedNode(WELL_KNOWN.rdfType), namedNode(GENERIC_RELATION_TYPE));

  const comp = relation.comprehensive;
  if (comp && (comp.source || comp.id)) {
    yield quad(s, namedNode(PRED.gloss.comprehensive),
      namedNode(conceptRefUri(comp, parentUri)));
  }

  const members = Array.isArray(relation.members) ? relation.members : [];
  for (const member of members) {
    const ref = member?.ref ?? member;
    if (!ref || (!ref.source && !ref.id)) continue;
    const memberUri = conceptRefUri(ref, parentUri);
    yield quad(s, namedNode(HAS_GENERIC), namedNode(memberUri));
    yield* partitiveMemberToQuads(member, { memberUri });
  }

  if (relation.completeness) {
    yield quad(s, namedNode(PRED.gloss.completeness),
      namedNode(COMPLETENESS_NS + relation.completeness));
  }

  if (relation.criterion && typeof relation.criterion === 'object') {
    for (const [lang, text] of Object.entries(relation.criterion)) {
      if (typeof text !== 'string') continue;
      yield quad(s, namedNode(PRED.gloss.criterion), literal(text, lang));
    }
  }
}

export function genericHyperedgeSubjectUri(parentUri: string, relation: GenericRelationLike, index: number): string {
  const base = parentUri.replace(/\/concept\/[^/]+$/, '');
  const carrierId = parentUri.split('/concept/')[1] ?? `carrier-${index}`;
  const compId = relation?.comprehensive?.id ?? `comp-${index}`;
  return `${base}/generic-relation/${carrierId}/${compId}`;
}

export const GENERIC_HYPEREDGE_LINK_PREDICATE = HAS_GENERIC_RELATION;

function conceptRefUri(ref: { id?: string; source?: string } | null | undefined, parentUri: string): string {
  const id = ref?.id;
  if (id) {
    const base = parentUri.split('/concept/')[0];
    return `${base}/concept/${id}`;
  }
  return `urn:glossarist:${ref?.source ?? 'unknown'}:`;
}
