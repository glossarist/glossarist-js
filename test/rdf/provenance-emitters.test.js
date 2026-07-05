// Tests for the 4 provenance emitters: build-activity, agents, version,
// image-variant.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildActivityIri,
  buildActivityToQuads,
  agentsFromContributors,
  agentsToQuads,
  slugify,
  versionToQuads,
  versionHistoryToQuads,
  imageVariantIri,
  imageVariantToQuads,
  collectQuads,
} from '../../src/rdf/index.js';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const PROV = 'http://www.w3.org/ns/prov#';
const FOAF = 'http://xmlns.com/foaf/0.1/';
const DCTERMS = 'http://purl.org/dc/terms/';
const DCAT = 'http://www.w3.org/ns/dcat#';
const GLOSS = 'https://www.glossarist.org/ontologies/';

// ── Build Activity ─────────────────────────────────────────────────

describe('buildActivityIri', () => {
  it('returns the relative IRI for a build run', () => {
    assert.equal(buildActivityIri({ runId: 'r1' }), 'activity/build/r1');
  });
});

describe('buildActivityToQuads', () => {
  const input = {
    runId: 'r1',
    baseUri: 'https://glossarist.org',
    startedAt: '2026-07-05T01:00:00Z',
    endedAt: '2026-07-05T01:05:00Z',
    gitSha: 'abc123',
    gitBranch: 'main',
    toolId: 'concept-browser',
    toolVersion: '0.7.59',
    datasetRegisters: ['iso', 'iso_tc204'],
    conceptCount: 1234,
    associatedAgentIri: 'https://example.org/agent/bot',
  };

  it('types the activity as prov:Activity with start/end time bounds', () => {
    const quads = collectQuads(buildActivityToQuads(input));
    const iri = 'https://glossarist.org/activity/build/r1';
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === RDF_TYPE && q.object.value === `${PROV}Activity`));
    assert.ok(quads.some(q => q.subject.value === `${iri}/start` && q.predicate.value === RDF_TYPE && q.object.value === `${PROV}StartingPoint`));
    assert.ok(quads.some(q => q.subject.value === `${iri}/end` && q.predicate.value === RDF_TYPE && q.object.value === `${PROV}EndingPoint`));
  });

  it('links git commit as prov:used and types it as prov:Entity', () => {
    const quads = collectQuads(buildActivityToQuads(input));
    const iri = 'https://glossarist.org/activity/build/r1';
    const commitIri = 'https://glossarist.org/commit/abc123';
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${PROV}used` && q.object.value === commitIri));
    assert.ok(quads.some(q => q.subject.value === commitIri && q.predicate.value === RDF_TYPE && q.object.value === `${PROV}Entity`));
    assert.ok(quads.some(q => q.subject.value === commitIri && q.predicate.value === `${DCTERMS}description` && q.object.value === 'branch: main'));
  });

  it('emits the build tool as prov:SoftwareAgent', () => {
    const quads = collectQuads(buildActivityToQuads(input));
    const toolIri = 'https://glossarist.org/tool/concept-browser/0.7.59';
    const types = quads
      .filter(q => q.subject.value === toolIri && q.predicate.value === RDF_TYPE)
      .map(q => q.object.value);
    assert.ok(types.includes(`${PROV}Entity`));
    assert.ok(types.includes(`${PROV}SoftwareAgent`));
  });

  it('links dataset registers via prov:used', () => {
    const quads = collectQuads(buildActivityToQuads(input));
    const iri = 'https://glossarist.org/activity/build/r1';
    const used = quads
      .filter(q => q.subject.value === iri && q.predicate.value === `${PROV}used`)
      .map(q => q.object.value);
    assert.ok(used.includes('https://glossarist.org/iso/'));
    assert.ok(used.includes('https://glossarist.org/iso_tc204/'));
  });

  it('emits gloss:conceptCount', () => {
    const quads = collectQuads(buildActivityToQuads(input));
    assert.ok(quads.some(q => q.predicate.value === `${GLOSS}conceptCount` && q.object.value === '1234'));
  });

  it('links the associated agent', () => {
    const quads = collectQuads(buildActivityToQuads(input));
    assert.ok(quads.some(q => q.predicate.value === `${PROV}wasAssociatedWith` && q.object.value === 'https://example.org/agent/bot'));
  });

  it('skips git commit when gitSha not provided', () => {
    const quads = collectQuads(buildActivityToQuads({ ...input, gitSha: undefined }));
    assert.ok(!quads.some(q => q.subject.value.includes('/commit/')));
  });
});

// ── Agents ─────────────────────────────────────────────────────────

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    assert.equal(slugify('Ronald Tse'), 'ronald-tse');
    assert.equal(slugify('Müller, J.'), 'muller-j');
  });
});

describe('agentsFromContributors', () => {
  it('builds AgentInput from raw contributor declarations', () => {
    const out = agentsFromContributors([
      { name: 'Ronald Tse', organization: 'Ribose' },
    ], 'https://glossarist.org/agent');
    assert.equal(out.length, 1);
    assert.equal(out[0].slug, 'ronald-tse');
    assert.equal(out[0].agentIri, 'https://glossarist.org/agent/ronald-tse');
  });
});

describe('agentsToQuads', () => {
  it('emits foaf:Person + prov:Person + prov:Agent types per contributor', () => {
    const agents = agentsFromContributors([{ name: 'Ronald Tse' }], 'https://glossarist.org/agent');
    const quads = collectQuads(agentsToQuads(agents, { orgBase: 'https://glossarist.org/org' }));
    const types = quads
      .filter(q => q.subject.value === 'https://glossarist.org/agent/ronald-tse' && q.predicate.value === RDF_TYPE)
      .map(q => q.object.value);
    assert.ok(types.includes(`${FOAF}Person`));
    assert.ok(types.includes(`${PROV}Person`));
    assert.ok(types.includes(`${PROV}Agent`));
  });

  it('emits foaf:name, foaf:mbox, rdfs:seeAlso, dcterms:description', () => {
    const agents = agentsFromContributors([{
      name: 'Ronald Tse',
      email: 'r@example.org',
      url: 'https://example.org/r',
      role: 'Editor',
    }], 'https://glossarist.org/agent');
    const quads = collectQuads(agentsToQuads(agents, { orgBase: 'https://glossarist.org/org' }));
    const person = 'https://glossarist.org/agent/ronald-tse';
    assert.ok(quads.some(q => q.subject.value === person && q.predicate.value === `${FOAF}name` && q.object.value === 'Ronald Tse'));
    assert.ok(quads.some(q => q.subject.value === person && q.predicate.value === `${FOAF}mbox` && q.object.value === 'mailto:r@example.org'));
    assert.ok(quads.some(q => q.subject.value === person && q.predicate.value === 'http://www.w3.org/2000/01/rdf-schema#seeAlso' && q.object.value === 'https://example.org/r'));
    assert.ok(quads.some(q => q.subject.value === person && q.predicate.value === `${DCTERMS}description` && q.object.value === 'Editor'));
  });

  it('emits org ONCE when multiple contributors share it', () => {
    const agents = agentsFromContributors([
      { name: 'A', organization: 'Ribose' },
      { name: 'B', organization: 'Ribose' },
    ], 'https://glossarist.org/agent');
    const quads = collectQuads(agentsToQuads(agents, { orgBase: 'https://glossarist.org/org' }));
    const orgTypes = quads.filter(q =>
      q.subject.value === 'https://glossarist.org/org/ribose' && q.predicate.value === RDF_TYPE
    );
    // 3 type triples (Organization, prov:Organization, prov:Agent) emitted ONCE
    assert.equal(orgTypes.length, 3);
  });

  it('links person to org via prov:actedOnBehalfOf', () => {
    const agents = agentsFromContributors([{ name: 'X', organization: 'Ribose' }], 'https://glossarist.org/agent');
    const quads = collectQuads(agentsToQuads(agents, { orgBase: 'https://glossarist.org/org' }));
    assert.ok(quads.some(q => q.predicate.value === `${PROV}actedOnBehalfOf` && q.object.value === 'https://glossarist.org/org/ribose'));
  });
});

// ── Version ────────────────────────────────────────────────────────

describe('versionToQuads', () => {
  it('emits prov:Entity with isVersionOf, generatedAtTime, and chain link', () => {
    const quads = collectQuads(versionToQuads({
      registerId: 'iso',
      version: '2026',
      versionIri: 'https://example.org/iso/versions/2026',
      datasetIri: 'https://example.org/iso/',
      generatedAt: '2026-01-01T00:00:00Z',
      previousVersionIri: 'https://example.org/iso/versions/2025',
      changeSummary: 'Annual update',
    }));
    const v = 'https://example.org/iso/versions/2026';
    assert.ok(quads.some(q => q.subject.value === v && q.predicate.value === RDF_TYPE && q.object.value === `${PROV}Entity`));
    assert.ok(quads.some(q => q.subject.value === v && q.predicate.value === `${DCTERMS}isVersionOf` && q.object.value === 'https://example.org/iso/'));
    assert.ok(quads.some(q => q.subject.value === v && q.predicate.value === `${PROV}wasRevisionOf` && q.object.value === 'https://example.org/iso/versions/2025'));
    assert.ok(quads.some(q => q.subject.value === v && q.predicate.value === `${PROV}generatedAtTime` && q.object.value === '2026-01-01T00:00:00Z'));
    assert.ok(quads.some(q => q.subject.value === v && q.predicate.value === `${DCTERMS}description` && q.object.value === 'Annual update'));
  });
});

describe('versionHistoryToQuads', () => {
  it('chains versions in sequence via wasRevisionOf', () => {
    const quads = collectQuads(versionHistoryToQuads({
      registerId: 'iso',
      datasetIri: 'https://example.org/iso/',
      versions: [
        { version: '2024', generatedAt: '2024-01-01T00:00:00Z' },
        { version: '2025', generatedAt: '2025-01-01T00:00:00Z' },
        { version: '2026', generatedAt: '2026-01-01T00:00:00Z' },
      ],
    }));
    assert.ok(quads.some(q => q.subject.value === 'https://example.org/iso/versions/2025' && q.predicate.value === `${PROV}wasRevisionOf` && q.object.value === 'https://example.org/iso/versions/2024'));
    assert.ok(quads.some(q => q.subject.value === 'https://example.org/iso/versions/2026' && q.predicate.value === `${PROV}wasRevisionOf` && q.object.value === 'https://example.org/iso/versions/2025'));
    // 2024 has no previous
    assert.ok(!quads.some(q => q.subject.value === 'https://example.org/iso/versions/2024' && q.predicate.value === `${PROV}wasRevisionOf`));
  });
});

// ── Image variant ─────────────────────────────────────────────────

describe('imageVariantIri', () => {
  it('includes the lang segment when provided', () => {
    assert.equal(
      imageVariantIri({ registerId: 'iso', figureId: 'fig1', lang: 'eng', format: 'svg'  }, 'https://glossarist.org'),
      'https://glossarist.org/iso/image/fig1/eng.svg',
    );
  });

  it('omits the lang segment when not provided', () => {
    assert.equal(
      imageVariantIri({ registerId: 'iso', figureId: 'fig1', format: 'png'  }, 'https://glossarist.org'),
      'https://glossarist.org/iso/image/fig1/png',
    );
  });
});

describe('imageVariantToQuads', () => {
  it('emits foaf:Image with format, language, byteSize, downloadURL', () => {
    const quads = collectQuads(imageVariantToQuads({
      registerId: 'iso',
      figureId: 'fig1',
      lang: 'eng',
      format: 'svg',
      byteSize: 456,
      downloadUrl: 'https://example.org/fig1.eng.svg',
    }, 'https://glossarist.org'));
    const iri = 'https://glossarist.org/iso/image/fig1/eng.svg';
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === RDF_TYPE && q.object.value === `${FOAF}Image`));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCTERMS}format` && q.object.value === 'image/svg+xml'));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCTERMS}language` && q.object.value === 'eng'));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCAT}byteSize` && q.object.value === '456'));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCAT}downloadURL` && q.object.value === 'https://example.org/fig1.eng.svg'));
  });

  it('emits correct MIME for png/jpg/webp/gif', () => {
    for (const [fmt, expected] of [['png','image/png'], ['jpg','image/jpeg'], ['webp','image/webp'], ['gif','image/gif']]) {
      const quads = collectQuads(imageVariantToQuads({
        registerId: 'iso', figureId: 'f', format: fmt, downloadUrl: 'https://example.org/x',
      }, 'https://glossarist.org'));
      assert.ok(quads.some(q => q.predicate.value === `${DCTERMS}format` && q.object.value === expected), `expected ${expected} for ${fmt}`);
    }
  });
});
