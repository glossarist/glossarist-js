// Agents emitter — emits foaf:Person / prov:Organization from
// contributor declarations. Mirrors concept-browser's agents-emitter.ts.
//
// Each contributor becomes a foaf:Person + prov:Person + prov:Agent
// with foaf:name, optional foaf:mbox (mailto link), rdfs:seeAlso (url).
// Their organization (when provided) becomes a foaf:Organization +
// prov:Organization, and the person is linked via prov:actedOnBehalfOf.

import { namedNode, literal, quad } from './terms.js';
import { PREFIXES } from './predicates.js';
import { RDF_TYPE } from './curie.js';

const PROV_NS    = PREFIXES.prov;
const FOAF_NS    = PREFIXES.foaf ?? 'http://xmlns.com/foaf/0.1/';
const DCTERMS_NS = PREFIXES.dcterms;
const RDFS_NS    = PREFIXES.rdfs;

const PROV = {
  Person: `${PROV_NS}Person`,
  Organization: `${PROV_NS}Organization`,
  Agent: `${PROV_NS}Agent`,
  actedOnBehalfOf: `${PROV_NS}actedOnBehalfOf`,
};
const FOAF = {
  Person: `${FOAF_NS}Person`,
  Organization: `${FOAF_NS}Organization`,
  name: `${FOAF_NS}name`,
  mbox: `${FOAF_NS}mbox`,
};
const DCTERMS = {
  description: `${DCTERMS_NS}description`,
};
const RDFS = {
  seeAlso: `${RDFS_NS}seeAlso`,
};

// No hardcoded default agent/org base URIs. Callers MUST pass agentBase
// explicitly so agent IRIs reflect the consumer's domain.

/**
 * @typedef {Object} Contributor
 * @property {string} name
 * @property {string} [role]
 * @property {string} [organization]
 * @property {string} [url]
 * @property {string} [email]
 */
/**
 * @typedef {Contributor & { slug: string, agentIri: string }} AgentInput
 */

/**
 * Slugify a name for IRIs. Lowercase, ASCII, hyphenated.
 */
export function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds AgentInput records from raw contributor declarations.
 * Useful for callers that want to inspect the IRIs before emission.
 */
export function agentsFromContributors(contributors, agentBase) {
  if (!agentBase) throw new Error('agentsFromContributors requires agentBase — the deployment canonical URI root for agents (e.g. https://www.example.org/agent). glossarist-js does NOT default to glossarist.org.');
  return (contributors ?? []).map(c => {
    const slug = slugify(c.name);
    return {
      slug,
      name: c.name,
      role: c.role,
      organization: c.organization,
      url: c.url,
      email: c.email,
      agentIri: `${agentBase}/${slug}`,
    };
  });
}

/**
 * Emits foaf:Person + prov:Organization quads for a list of agents.
 *
 * Returns a generator of quads AND the set of unique person and
 * organization IRIs emitted. Organizations are deduplicated — the
 * same org across multiple contributors is emitted once.
 *
 * @param {readonly AgentInput[]} agents
 * @param {Object} [options]
 * @param {string} [options.orgBase] — default https://glossarist.org/org
 * @returns {Generator<Quad, void, unknown>}
 */
export function* agentsToQuads(agents, options = {}) {
  const orgBase = options.orgBase;
  if (!orgBase) throw new Error('agentsToQuads requires options.orgBase — the deployment canonical URI root for organizations.');
  const emittedOrgs = new Set();

  for (const a of agents ?? []) {
    const person = namedNode(a.agentIri);
    yield quad(person, namedNode(RDF_TYPE), namedNode(FOAF.Person));
    yield quad(person, namedNode(RDF_TYPE), namedNode(PROV.Person));
    yield quad(person, namedNode(RDF_TYPE), namedNode(PROV.Agent));
    yield quad(person, namedNode(FOAF.name), literal(a.name));

    if (a.email) {
      yield quad(person, namedNode(FOAF.mbox), namedNode(`mailto:${a.email}`));
    }
    if (a.url) {
      yield quad(person, namedNode(RDFS.seeAlso), namedNode(a.url));
    }
    if (a.role) {
      yield quad(person, namedNode(DCTERMS.description), literal(a.role));
    }

    if (a.organization) {
      const orgSlug = slugify(a.organization);
      const orgIri = `${orgBase}/${orgSlug}`;
      yield quad(person, namedNode(PROV.actedOnBehalfOf), namedNode(orgIri));

      if (!emittedOrgs.has(orgIri)) {
        emittedOrgs.add(orgIri);
        const org = namedNode(orgIri);
        yield quad(org, namedNode(RDF_TYPE), namedNode(FOAF.Organization));
        yield quad(org, namedNode(RDF_TYPE), namedNode(PROV.Organization));
        yield quad(org, namedNode(RDF_TYPE), namedNode(PROV.Agent));
        yield quad(org, namedNode(FOAF.name), literal(a.organization));
      }
    }
  }
}
