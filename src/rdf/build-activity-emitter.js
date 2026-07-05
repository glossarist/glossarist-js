// Build activity emitter — emits prov:Activity per build run.
// Mirrors concept-browser's build-activity-emitter.ts.
//
// Models a single CI build as a prov:Activity with:
// - prov:StartingPoint and prov:EndingPoint time bounds
// - prov:used links to the git commit, the build tool (prov:SoftwareAgent),
//   and each dataset register
// - gloss:conceptCount for the build output
// - prov:wasAssociatedWith for the CI bot agent

import { namedNode, literal, quad } from './terms.js';

const PROV_NS = 'http://www.w3.org/ns/prov#';
const DCTERMS_NS = 'http://purl.org/dc/terms/';
const FOAF_NS = 'http://xmlns.com/foaf/0.1/';
const GLOSS_NS = 'https://www.glossarist.org/ontologies/';
const XSD_NS = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

const PROV = {
  Activity: `${PROV_NS}Activity`,
  StartingPoint: `${PROV_NS}StartingPoint`,
  EndingPoint: `${PROV_NS}EndingPoint`,
  Entity: `${PROV_NS}Entity`,
  SoftwareAgent: `${PROV_NS}SoftwareAgent`,
  Agent: `${PROV_NS}Agent`,
  Person: `${PROV_NS}Person`,
  generatedAtTime: `${PROV_NS}generatedAtTime`,
  atTime: `${PROV_NS}atTime`,
  used: `${PROV_NS}used`,
  wasAssociatedWith: `${PROV_NS}wasAssociatedWith`,
  version: `${PROV_NS}version`,
};
const DCTERMS = {
  identifier: `${DCTERMS_NS}identifier`,
  description: `${DCTERMS_NS}description`,
};
const FOAF = {
  Person: `${FOAF_NS}Person`,
};
const GLOSS = {
  conceptCount: `${GLOSS_NS}conceptCount`,
};
const XSD_DATE_TIME = `${XSD_NS}dateTime`;
const XSD_INTEGER = `${XSD_NS}integer`;

/**
 * @typedef {Object} BuildActivityInput
 * @property {string} runId
 * @property {string} startedAt — ISO date-time
 * @property {string} endedAt — ISO date-time
 * @property {string} [gitSha]
 * @property {string} [gitBranch]
 * @property {string} toolId
 * @property {string} toolVersion
 * @property {readonly string[]} datasetRegisters
 * @property {number} conceptCount
 * @property {string} [associatedAgentIri]
 * @property {string} [baseUri] — default https://glossarist.org
 */

/**
 * Returns the canonical relative IRI for a build activity.
 */
export function buildActivityIri(input) {
  return `activity/build/${input.runId}`;
}

/**
 * Emits prov:Activity quads for one build run, including the
 * starting/ending time bounds, the build tool as prov:SoftwareAgent,
 * the git commit (when provided) as a prov:Entity, and each dataset
 * register as a prov:used target.
 *
 * @param {BuildActivityInput} input
 * @returns {Generator<Quad, void, unknown>}
 */
export function* buildActivityToQuads(input) {
  const baseUri = input.baseUri ?? 'https://glossarist.org';
  const activityIri = `${baseUri}/${buildActivityIri(input)}`;
  const activity = namedNode(activityIri);

  yield quad(activity, namedNode(RDF_TYPE), namedNode(PROV.Activity));
  yield quad(activity, namedNode(PROV.generatedAtTime), literal(input.endedAt, namedNode(XSD_DATE_TIME)));

  // StartingPoint and EndingPoint are sub-types of prov:TimeBound.
  // Modeling them as separate resources lets consumers query exact
  // start vs end without parsing date ranges.
  const start = namedNode(`${activityIri}/start`);
  yield quad(start, namedNode(RDF_TYPE), namedNode(PROV.StartingPoint));
  yield quad(start, namedNode(PROV.atTime), literal(input.startedAt, namedNode(XSD_DATE_TIME)));

  const end = namedNode(`${activityIri}/end`);
  yield quad(end, namedNode(RDF_TYPE), namedNode(PROV.EndingPoint));
  yield quad(end, namedNode(PROV.atTime), literal(input.endedAt, namedNode(XSD_DATE_TIME)));

  if (input.gitSha) {
    const commitIri = `${baseUri}/commit/${input.gitSha}`;
    yield quad(activity, namedNode(PROV.used), namedNode(commitIri));
    const commit = namedNode(commitIri);
    yield quad(commit, namedNode(RDF_TYPE), namedNode(PROV.Entity));
    if (input.gitBranch) {
      yield quad(commit, namedNode(DCTERMS.description), literal(`branch: ${input.gitBranch}`));
    }
  }

  const toolIri = `${baseUri}/tool/${input.toolId}/${input.toolVersion}`;
  yield quad(activity, namedNode(PROV.used), namedNode(toolIri));
  const tool = namedNode(toolIri);
  yield quad(tool, namedNode(RDF_TYPE), namedNode(PROV.Entity));
  yield quad(tool, namedNode(RDF_TYPE), namedNode(PROV.SoftwareAgent));
  yield quad(tool, namedNode(DCTERMS.identifier), literal(input.toolVersion));
  yield quad(tool, namedNode(PROV.version), literal(input.toolVersion));

  for (const register of input.datasetRegisters ?? []) {
    yield quad(activity, namedNode(PROV.used), namedNode(`${baseUri}/${register}/`));
  }

  yield quad(activity, namedNode(GLOSS.conceptCount), literal(String(input.conceptCount), namedNode(XSD_INTEGER)));

  if (input.associatedAgentIri) {
    yield quad(activity, namedNode(PROV.wasAssociatedWith), namedNode(input.associatedAgentIri));
    const agent = namedNode(input.associatedAgentIri);
    yield quad(agent, namedNode(RDF_TYPE), namedNode(PROV.Agent));
    yield quad(agent, namedNode(RDF_TYPE), namedNode(FOAF.Person));
  }
}
