// Tests for the dataset emitter (dcat:Dataset + skos:ConceptScheme).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { datasetToQuads, collectQuads } from '../../src/rdf/index.js';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const DCAT = 'http://www.w3.org/ns/dcat#';
const DCTERMS = 'http://purl.org/dc/terms/';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const PROV = 'http://www.w3.org/ns/prov#';
const GLOSS = 'https://www.glossarist.org/ontologies/';

function baseInput(overrides = {}) {
  return {
    datasetIri: 'https://example.org/datasets/iso/',
    registerId: 'iso',
    title: 'ISO Sample',
    description: 'Sample dataset',
    modified: '2026-07-05',
    languages: ['eng', 'fra'],
    distributions: [
      {
        id: 'iso-ttl',
        title: 'Turtle distribution',
        mediaType: 'text/turtle',
        downloadUrl: 'https://example.org/data/iso/iso.ttl',
        byteSize: 12345,
      },
    ],
    topConceptUris: ['https://example.org/iso/concept/1', 'https://example.org/iso/concept/2'],
    sections: [
      {
        collectionIri: 'https://example.org/iso/section/3',
        title: 'Section 3',
        memberUris: ['https://example.org/iso/concept/1'],
        parentCollectionIri: 'https://example.org/iso/section/root',
        childCollectionIris: ['https://example.org/iso/section/3.1'],
      },
    ],
    sourceRepoUrl: 'https://github.com/example/iso-glossary',
    publisherIri: 'https://example.org/publisher/iso',
    contactIri: 'https://example.org/contact/iso',
    ...overrides,
  };
}

describe('datasetToQuads', () => {
  it('emits both dcat:Dataset and skos:ConceptScheme types', () => {
    const quads = collectQuads(datasetToQuads(baseInput()));
    const ds = 'https://example.org/datasets/iso/';
    const types = quads
      .filter(q => q.subject.value === ds && q.predicate.value === RDF_TYPE)
      .map(q => q.object.value);
    assert.ok(types.includes(`${DCAT}Dataset`));
    assert.ok(types.includes(`${SKOS}ConceptScheme`));
  });

  it('emits title, description, modified, identifier literals', () => {
    const quads = collectQuads(datasetToQuads(baseInput()));
    const ds = 'https://example.org/datasets/iso/';
    assert.ok(quads.some(q => q.subject.value === ds && q.predicate.value === `${DCTERMS}title` && q.object.value === 'ISO Sample'));
    assert.ok(quads.some(q => q.subject.value === ds && q.predicate.value === `${DCTERMS}description` && q.object.value === 'Sample dataset'));
    assert.ok(quads.some(q => q.subject.value === ds && q.predicate.value === `${DCTERMS}modified` && q.object.value === '2026-07-05'));
    assert.ok(quads.some(q => q.subject.value === ds && q.predicate.value === `${DCTERMS}identifier` && q.object.value === 'iso'));
  });

  it('skips description when not provided', () => {
    const quads = collectQuads(datasetToQuads(baseInput({ description: undefined })));
    assert.ok(!quads.some(q => q.predicate.value === `${DCTERMS}description`));
  });

  it('emits language IRIs from the languages array', () => {
    const quads = collectQuads(datasetToQuads(baseInput()));
    const ds = 'https://example.org/datasets/iso/';
    const langs = quads
      .filter(q => q.subject.value === ds && q.predicate.value === `${DCTERMS}language`)
      .map(q => q.object.value);
    assert.ok(langs.includes('http://id.loc.gov/vocabulary/iso639-1/eng'));
    assert.ok(langs.includes('http://id.loc.gov/vocabulary/iso639-1/fra'));
  });

  it('emits distribution blank nodes with full metadata', () => {
    const quads = collectQuads(datasetToQuads(baseInput()));
    const ds = 'https://example.org/datasets/iso/';
    const distLinks = quads.filter(q =>
      q.subject.value === ds && q.predicate.value === `${DCAT}distribution`
    );
    assert.equal(distLinks.length, 1);
    const distSubject = distLinks[0].object.value;

    assert.ok(quads.some(q => q.subject.value === distSubject && q.predicate.value === RDF_TYPE && q.object.value === `${DCAT}Distribution`));
    assert.ok(quads.some(q => q.subject.value === distSubject && q.predicate.value === `${DCTERMS}title` && q.object.value === 'Turtle distribution'));
    assert.ok(quads.some(q => q.subject.value === distSubject && q.predicate.value === `${DCAT}mediaType` && q.object.value === 'text/turtle'));
    assert.ok(quads.some(q => q.subject.value === distSubject && q.predicate.value === `${DCAT}downloadURL` && q.object.value === 'https://example.org/data/iso/iso.ttl'));
    assert.ok(quads.some(q => q.subject.value === distSubject && q.predicate.value === `${DCAT}byteSize` && q.object.value === '12345'));
  });

  it('skips byteSize when not provided', () => {
    const input = baseInput({
      distributions: [{ id: 'x', title: 'X', mediaType: 'text/turtle', downloadUrl: 'https://example.org/x' }],
    });
    const quads = collectQuads(datasetToQuads(input));
    assert.ok(!quads.some(q => q.predicate.value === `${DCAT}byteSize`));
  });

  it('emits skos:hasTopConcept for each topConceptUris entry', () => {
    const quads = collectQuads(datasetToQuads(baseInput()));
    const ds = 'https://example.org/datasets/iso/';
    const tops = quads
      .filter(q => q.subject.value === ds && q.predicate.value === `${SKOS}hasTopConcept`)
      .map(q => q.object.value);
    assert.deepEqual(tops.sort(), ['https://example.org/iso/concept/1', 'https://example.org/iso/concept/2'].sort());
  });

  it('emits prov:wasDerivedFrom, dcterms:publisher, dcat:contactPoint', () => {
    const quads = collectQuads(datasetToQuads(baseInput()));
    const ds = 'https://example.org/datasets/iso/';
    assert.ok(quads.some(q => q.subject.value === ds && q.predicate.value === `${PROV}wasDerivedFrom` && q.object.value === 'https://github.com/example/iso-glossary'));
    assert.ok(quads.some(q => q.subject.value === ds && q.predicate.value === `${DCTERMS}publisher` && q.object.value === 'https://example.org/publisher/iso'));
    assert.ok(quads.some(q => q.subject.value === ds && q.predicate.value === `${DCAT}contactPoint` && q.object.value === 'https://example.org/contact/iso'));
  });

  it('skips provenance/publisher/contact when not provided', () => {
    const quads = collectQuads(datasetToQuads(baseInput({
      sourceRepoUrl: undefined,
      publisherIri: undefined,
      contactIri: undefined,
    })));
    assert.ok(!quads.some(q => q.predicate.value === `${PROV}wasDerivedFrom`));
    assert.ok(!quads.some(q => q.predicate.value === `${DCTERMS}publisher`));
    assert.ok(!quads.some(q => q.predicate.value === `${DCAT}contactPoint`));
  });

  it('emits skos:Collection per section with members and parent/child links', () => {
    const quads = collectQuads(datasetToQuads(baseInput()));
    const coll = 'https://example.org/iso/section/3';
    assert.ok(quads.some(q => q.subject.value === coll && q.predicate.value === RDF_TYPE && q.object.value === `${SKOS}Collection`));
    assert.ok(quads.some(q => q.subject.value === coll && q.predicate.value === `${DCTERMS}title` && q.object.value === 'Section 3'));
    assert.ok(quads.some(q => q.subject.value === coll && q.predicate.value === `${SKOS}member` && q.object.value === 'https://example.org/iso/concept/1'));
    assert.ok(quads.some(q => q.subject.value === coll && q.predicate.value === `${GLOSS}hasParentSection` && q.object.value === 'https://example.org/iso/section/root'));
    assert.ok(quads.some(q => q.subject.value === coll && q.predicate.value === `${GLOSS}hasChildSection` && q.object.value === 'https://example.org/iso/section/3.1'));
  });

  it('produces stable distribution bnode IDs across runs', () => {
    const a = collectQuads(datasetToQuads(baseInput()));
    const b = collectQuads(datasetToQuads(baseInput()));
    const aId = a.find(q => q.predicate.value === `${DCAT}distribution`).object.value;
    const bId = b.find(q => q.predicate.value === `${DCAT}distribution`).object.value;
    assert.equal(aId, bId, 'same input must produce same bnode ID');
  });
});
