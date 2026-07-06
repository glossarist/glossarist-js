// Group emitter — emits dcat:DatasetSeries (lineage) or dcat:Catalog
// (topic/family/collection) for dataset groups. Mirrors concept-browser's
// group-emitter.ts.
//
// A lineage group (editions of the same vocabulary) is rendered as
// dcat:DatasetSeries with hasVersion links to each member edition.
// The current edition is linked via hasCurrentVersion.
//
// Other group kinds (topic, family, collection) are rendered as
// dcat:Catalog with dcat:dataset links to each member.
//
// Both kinds are also typed as skos:ConceptScheme for SKOS interop.

import { namedNode, literal, quad } from './terms.js';
import { PREFIXES } from './predicates.js';
import { RDF_TYPE } from './curie.js';

// Namespace IRIs from canonical PREFIXES.
const DCAT_NS    = PREFIXES.dcat ?? 'http://www.w3.org/ns/dcat#';
const DCTERMS_NS = PREFIXES.dcterms;
const SKOS_NS    = PREFIXES.skos;
const PROV_NS    = PREFIXES.prov;

const DCAT = {
  DatasetSeries: `${DCAT_NS}DatasetSeries`,
  Catalog: `${DCAT_NS}Catalog`,
  ConceptScheme: `${SKOS_NS}ConceptScheme`,
  hasVersion: `${DCAT_NS}hasVersion`,
  hasCurrentVersion: `${DCAT_NS}hasCurrentVersion`,
  dataset: `${DCAT_NS}dataset`,
  theme: `${DCAT_NS}theme`,
  keyword: `${DCAT_NS}keyword`,
  contactPoint: `${DCAT_NS}contactPoint`,
};
const DCTERMS = {
  title: `${DCTERMS_NS}title`,
  description: `${DCTERMS_NS}description`,
  identifier: `${DCTERMS_NS}identifier`,
  subject: `${DCTERMS_NS}subject`,
  publisher: `${DCTERMS_NS}publisher`,
};
const PROV = {
  wasDerivedFrom: `${PROV_NS}wasDerivedFrom`,
};

/**
 * @typedef {'lineage' | 'topic' | 'family' | 'collection' | 'default'} DatasetGroupKind
 */
/**
 * @typedef {Object} GroupEmitInput
 * @property {string} groupId
 * @property {string} groupIri
 * @property {DatasetGroupKind} kind
 * @property {string} title
 * @property {string} [description]
 * @property {readonly string[]} memberIris
 * @property {string} [currentMemberIri]
 * @property {string} [subject]
 * @property {readonly string[]} [themes]
 * @property {readonly string[]} [keywords]
 * @property {string} [publisher]
 * @property {string} [contact]
 * @property {string} [sourceRepo]
 */

// Returns the RDF class IRIs for a group kind. Empty for 'default'
// (no semantics — group is purely a presentation concern).
function rdfClassesForKind(kind) {
  switch (kind) {
    case 'lineage': return [DCAT.DatasetSeries, DCAT.ConceptScheme];
    case 'topic':
    case 'family':
    case 'collection': return [DCAT.Catalog, DCAT.ConceptScheme];
    default: return [];
  }
}

/**
 * Emits dcat:DatasetSeries or dcat:Catalog quads for one group.
 *
 * Returns an empty generator (no quads) for 'default' kind — those
 * groups have no RDF semantics.
 *
 * @param {GroupEmitInput} input
 * @returns {Generator<Quad, void, unknown>}
 */
export function* groupToQuads(input) {
  const classes = rdfClassesForKind(input.kind);
  if (classes.length === 0) return;

  const g = namedNode(input.groupIri);

  for (const cls of classes) {
    yield quad(g, namedNode(RDF_TYPE), namedNode(cls));
  }

  yield quad(g, namedNode(DCTERMS.title), literal(input.title));
  yield quad(g, namedNode(DCTERMS.identifier), literal(input.groupId));
  if (input.description) {
    yield quad(g, namedNode(DCTERMS.description), literal(input.description));
  }
  if (input.subject) {
    yield quad(g, namedNode(DCTERMS.subject), literal(input.subject));
  }
  for (const theme of input.themes ?? []) {
    yield quad(g, namedNode(DCAT.theme), namedNode(theme));
  }
  for (const kw of input.keywords ?? []) {
    yield quad(g, namedNode(DCAT.keyword), literal(kw));
  }
  if (input.publisher) {
    yield quad(g, namedNode(DCTERMS.publisher), namedNode(input.publisher));
  }
  if (input.contact) {
    yield quad(g, namedNode(DCAT.contactPoint), namedNode(input.contact));
  }
  if (input.sourceRepo) {
    yield quad(g, namedNode(PROV.wasDerivedFrom), namedNode(input.sourceRepo));
  }

  if (input.kind === 'lineage') {
    for (const memberIri of input.memberIris ?? []) {
      yield quad(g, namedNode(DCAT.hasVersion), namedNode(memberIri));
    }
    if (input.currentMemberIri) {
      yield quad(g, namedNode(DCAT.hasCurrentVersion), namedNode(input.currentMemberIri));
    }
  } else {
    for (const memberIri of input.memberIris ?? []) {
      yield quad(g, namedNode(DCAT.dataset), namedNode(memberIri));
    }
  }
}
