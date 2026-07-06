// Dataset emitter — emits dcat:Dataset + skos:ConceptScheme per
// register. Mirrors concept-browser's dataset-emitter.ts.
//
// The dataset describes the vocabulary as a whole: title, description,
// modified date, languages, distributions (Turtle/JSON-LD/YAML), top
// concepts, sections, source repo, publisher, contact.
//
// Each section becomes a skos:Collection linked via skos:member to
// its concept URIs and via gloss:hasParentSection / gloss:hasChildSection
// to its relatives (the ontology declares these as owl:TransitiveProperty
// for cascading section membership).

import { namedNode, blankNode, literal, quad } from './terms.js';
import { PREFIXES } from './predicates.js';
import { RDF_TYPE } from './curie.js';
import { deterministicBnodeId } from './bnode-id.js';

// Namespace IRIs from the canonical PREFIXES — single source of truth.
const DCAT_NS    = PREFIXES.dcat ?? 'http://www.w3.org/ns/dcat#';
const DCTERMS_NS = PREFIXES.dcterms;
const SKOS_NS    = PREFIXES.skos;
const PROV_NS    = PREFIXES.prov;
const GLOSS_NS   = PREFIXES.gloss;
const XSD_NS     = PREFIXES.xsd;

/**
 * @typedef {Object} DatasetDistribution
 * @property {string} id
 * @property {string} title
 * @property {string} mediaType
 * @property {string} downloadUrl
 * @property {number} [byteSize]
 */
/**
 * @typedef {Object} DatasetSection
 * @property {string} collectionIri
 * @property {string} title
 * @property {readonly string[]} memberUris
 * @property {string} [parentCollectionIri]
 * @property {readonly string[]} [childCollectionIris]
 */
/**
 * @typedef {Object} DatasetEmitterInput
 * @property {string} datasetIri
 * @property {string} registerId
 * @property {string} title
 * @property {string} [description]
 * @property {string} modified — ISO date (YYYY-MM-DD)
 * @property {readonly string[]} languages
 * @property {readonly DatasetDistribution[]} distributions
 * @property {readonly string[]} topConceptUris
 * @property {readonly DatasetSection[]} sections
 * @property {string} [sourceRepoUrl]
 * @property {string} [publisherIri]
 * @property {string} [contactIri]
 */

const DCAT = {
  Dataset: `${DCAT_NS}Dataset`,
  ConceptScheme: `${SKOS_NS}ConceptScheme`,
  Distribution: `${DCAT_NS}Distribution`,
  Collection: `${SKOS_NS}Collection`,
  mediaType: `${DCAT_NS}mediaType`,
  downloadURL: `${DCAT_NS}downloadURL`,
  byteSize: `${DCAT_NS}byteSize`,
  distribution: `${DCAT_NS}distribution`,
  contactPoint: `${DCAT_NS}contactPoint`,
};
const DCTERMS = {
  title: `${DCTERMS_NS}title`,
  description: `${DCTERMS_NS}description`,
  modified: `${DCTERMS_NS}modified`,
  identifier: `${DCTERMS_NS}identifier`,
  language: `${DCTERMS_NS}language`,
  publisher: `${DCTERMS_NS}publisher`,
};
const SKOS = {
  hasTopConcept: `${SKOS_NS}hasTopConcept`,
  member: `${SKOS_NS}member`,
};
const PROV = {
  wasDerivedFrom: `${PROV_NS}wasDerivedFrom`,
};
const GLOSS = {
  hasParentSection: `${GLOSS_NS}hasParentSection`,
  hasChildSection: `${GLOSS_NS}hasChildSection`,
};
const XSD_DATE = `${XSD_NS}date`;
const XSD_INTEGER = `${XSD_NS}integer`;

/**
 * Emits dcat:Dataset + skos:ConceptScheme quads for one register's
 * metadata, plus its distributions, sections, and top concepts.
 *
 * @param {DatasetEmitterInput} input
 * @returns {Generator<Quad, void, unknown>}
 */
export function* datasetToQuads(input) {
  const ds = namedNode(input.datasetIri);

  yield quad(ds, namedNode(RDF_TYPE), namedNode(DCAT.Dataset));
  yield quad(ds, namedNode(RDF_TYPE), namedNode(DCAT.ConceptScheme));
  yield quad(ds, namedNode(DCTERMS.title), literal(input.title));
  if (input.description) {
    yield quad(ds, namedNode(DCTERMS.description), literal(input.description));
  }
  yield quad(ds, namedNode(DCTERMS.modified), literal(input.modified, namedNode(XSD_DATE)));
  yield quad(ds, namedNode(DCTERMS.identifier), literal(input.registerId));

  for (const lang of input.languages ?? []) {
    const langIri = `http://id.loc.gov/vocabulary/iso639-1/${lang}`;
    yield quad(ds, namedNode(DCTERMS.language), namedNode(langIri));
  }

  for (const dist of input.distributions ?? []) {
    yield* distributionToQuads(ds, dist);
  }

  for (const conceptUri of input.topConceptUris ?? []) {
    yield quad(ds, namedNode(SKOS.hasTopConcept), namedNode(conceptUri));
  }

  if (input.sourceRepoUrl) {
    yield quad(ds, namedNode(PROV.wasDerivedFrom), namedNode(input.sourceRepoUrl));
  }
  if (input.publisherIri) {
    yield quad(ds, namedNode(DCTERMS.publisher), namedNode(input.publisherIri));
  }
  if (input.contactIri) {
    yield quad(ds, namedNode(DCAT.contactPoint), namedNode(input.contactIri));
  }

  for (const section of input.sections ?? []) {
    yield* sectionToQuads(section);
  }
}

function* distributionToQuads(ds, dist) {
  // Distributions are blank nodes — they don't have stable identity
  // outside their parent dataset. Using blankNode() (not namedNode with
  // a "_:..." string) so the n3 writer serializes them as _:bXXXX
  // rather than <_:bXXXX> which would be an invalid IRI.
  const distSubject = blankNode(`b${deterministicBnodeId('dist', dist.id, dist.downloadUrl)}`);
  yield quad(ds, namedNode(DCAT.distribution), distSubject);
  yield quad(distSubject, namedNode(RDF_TYPE), namedNode(DCAT.Distribution));
  yield quad(distSubject, namedNode(DCTERMS.title), literal(dist.title));
  yield quad(distSubject, namedNode(DCAT.mediaType), literal(dist.mediaType));
  yield quad(distSubject, namedNode(DCAT.downloadURL), namedNode(dist.downloadUrl));
  if (dist.byteSize != null) {
    yield quad(distSubject, namedNode(DCAT.byteSize), literal(String(dist.byteSize), namedNode(XSD_INTEGER)));
  }
}

function* sectionToQuads(section) {
  const coll = namedNode(section.collectionIri);
  yield quad(coll, namedNode(RDF_TYPE), namedNode(DCAT.Collection));
  yield quad(coll, namedNode(DCTERMS.title), literal(section.title));
  for (const member of section.memberUris ?? []) {
    yield quad(coll, namedNode(SKOS.member), namedNode(member));
  }
  if (section.parentCollectionIri) {
    yield quad(coll, namedNode(GLOSS.hasParentSection), namedNode(section.parentCollectionIri));
  }
  for (const child of section.childCollectionIris ?? []) {
    yield quad(coll, namedNode(GLOSS.hasChildSection), namedNode(child));
  }
}

// Local deterministic-id helper is no longer needed — using the shared
// deterministicBnodeId from bnode-id.js for cross-emitter consistency.
