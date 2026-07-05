// Version emitter — emits prov:Entity version chain per dataset.
// Mirrors concept-browser's version-emitter.ts.
//
// Each version of a dataset becomes a prov:Entity typed resource with:
// - dcterms:isVersionOf → the dataset
// - prov:wasRevisionOf → previous version (when provided)
// - prov:generatedAtTime (xsd:dateTime)
// - dcterms:description (optional change summary)
// - prov:wasAssociatedWith (optional agent)

import { namedNode, literal, quad } from './terms.js';

const PROV_NS = 'http://www.w3.org/ns/prov#';
const DCTERMS_NS = 'http://purl.org/dc/terms/';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

const PROV = {
  Entity: `${PROV_NS}Entity`,
  wasRevisionOf: `${PROV_NS}wasRevisionOf`,
  generatedAtTime: `${PROV_NS}generatedAtTime`,
  wasAssociatedWith: `${PROV_NS}wasAssociatedWith`,
};
const DCTERMS = {
  isVersionOf: `${DCTERMS_NS}isVersionOf`,
  description: `${DCTERMS_NS}description`,
};
const XSD_DATE_TIME = `${XSD_NS}dateTime`;

/**
 * @typedef {Object} DatasetVersionInput
 * @property {string} registerId
 * @property {string} version
 * @property {string} versionIri
 * @property {string} datasetIri
 * @property {string} generatedAt — ISO date-time
 * @property {string} [previousVersionIri]
 * @property {string} [changeSummary]
 * @property {string} [associatedAgentIri]
 */
/**
 * @typedef {Object} VersionHistoryEntry
 * @property {string} version
 * @property {string} generatedAt
 * @property {string} [changeSummary]
 */
/**
 * @typedef {Object} VersionEmitAllInput
 * @property {string} registerId
 * @property {string} datasetIri
 * @property {readonly VersionHistoryEntry[]} versions
 * @property {string} [associatedAgentIri]
 */

/**
 * Emits a single prov:Entity version with its provenance chain.
 */
export function* versionToQuads(input) {
  const v = namedNode(input.versionIri);
  yield quad(v, namedNode(RDF_TYPE), namedNode(PROV.Entity));
  yield quad(v, namedNode(DCTERMS.isVersionOf), namedNode(input.datasetIri));
  if (input.previousVersionIri) {
    yield quad(v, namedNode(PROV.wasRevisionOf), namedNode(input.previousVersionIri));
  }
  yield quad(v, namedNode(PROV.generatedAtTime), literal(input.generatedAt, namedNode(XSD_DATE_TIME)));
  if (input.changeSummary) {
    yield quad(v, namedNode(DCTERMS.description), literal(input.changeSummary));
  }
  if (input.associatedAgentIri) {
    yield quad(v, namedNode(PROV.wasAssociatedWith), namedNode(input.associatedAgentIri));
  }
}

/**
 * Emits the full version history chain. Versions are linked in
 * sequence via prov:wasRevisionOf (newest → previous → ... → oldest).
 *
 * The version IRI is constructed as `${datasetIri}versions/${version}`.
 */
export function* versionHistoryToQuads(input) {
  let previousIri;
  for (const v of input.versions ?? []) {
    const versionIri = `${input.datasetIri}versions/${v.version}`;
    yield* versionToQuads({
      registerId: input.registerId,
      version: v.version,
      versionIri,
      datasetIri: input.datasetIri,
      generatedAt: v.generatedAt,
      previousVersionIri: previousIri,
      changeSummary: v.changeSummary,
      associatedAgentIri: input.associatedAgentIri,
    });
    previousIri = versionIri;
  }
}
