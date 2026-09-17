// Tests for the bibliography emitter.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Parser } from 'n3';
import {
  bibliographyToQuads,
  bibliographyEntryIri,
  normalizeBibliographyData,
  collectQuads,
  writeTurtleSync,
} from '../../src/rdf/index.js';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const DCTERMS = 'http://purl.org/dc/terms/';
const FOAF = 'http://xmlns.com/foaf/0.1/';
const GLOSS = 'https://www.glossarist.org/ontologies/';

describe('bibliographyEntryIri', () => {
  it('builds the canonical IRI from register + entry id', () => {
    assert.equal(
      bibliographyEntryIri('iso', 'ref1', 'https://glossarist.org'),
      'https://glossarist.org/iso/bib/ref1',
    );
  });

  it('honors a custom base URI', () => {
    assert.equal(
      bibliographyEntryIri('iso', 'ref1', 'https://example.org'),
      'https://example.org/iso/bib/ref1',
    );
  });
});

describe('bibliographyToQuads', () => {
  it('emits dcterms:BibliographicResource type and required fields', () => {
    const quads = collectQuads(bibliographyToQuads({ baseUri: 'https://glossarist.org',
      registerId: 'iso',
      entries: [{ id: 'ref1', reference: 'ISO 1234:2020' }],
    }));
    const iri = 'https://glossarist.org/iso/bib/ref1';
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === RDF_TYPE && q.object.value === `${DCTERMS}BibliographicResource`));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCTERMS}identifier` && q.object.value === 'ref1'));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCTERMS}bibliographicCitation` && q.object.value === 'ISO 1234:2020'));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCTERMS}isPartOf` && q.object.value === 'https://glossarist.org/iso/'));
  });

  it('emits optional title, foaf:page, dcterms:type when provided', () => {
    const quads = collectQuads(bibliographyToQuads({ baseUri: 'https://glossarist.org',
      registerId: 'iso',
      entries: [{
        id: 'ref1',
        reference: 'ISO 1234:2020',
        title: 'Sample Standard',
        link: 'https://example.org/iso-1234',
        type: 'standard',
      }],
    }));
    const iri = 'https://glossarist.org/iso/bib/ref1';
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCTERMS}title` && q.object.value === 'Sample Standard'));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${FOAF}page` && q.object.value === 'https://example.org/iso-1234'));
    assert.ok(quads.some(q => q.subject.value === iri && q.predicate.value === `${DCTERMS}type` && q.object.value === `${GLOSS}bibtype/standard`));
  });

  it('skips entries without id or reference', () => {
    const quads = collectQuads(bibliographyToQuads({ baseUri: 'https://glossarist.org',
      registerId: 'iso',
      entries: [
        { id: '', reference: 'x' },          // empty id
        { id: 'y', reference: '' },          // empty reference
        { id: 'z', reference: 'w' },         // valid
      ],
    }));
    // Only entry z (1 valid) — 4 quads: type + identifier + bibliographicCitation + isPartOf
    assert.equal(quads.length, 4);
    assert.equal(quads.filter(q => q.predicate.value === RDF_TYPE).length, 1);
    assert.equal(quads.filter(q => q.predicate.value === `${DCTERMS}identifier` && q.object.value === 'z').length, 1);
  });

  it('emits multiple entries', () => {
    const quads = collectQuads(bibliographyToQuads({ baseUri: 'https://glossarist.org',
      registerId: 'iso',
      entries: [
        { id: 'a', reference: 'A' },
        { id: 'b', reference: 'B' },
        { id: 'c', reference: 'C' },
      ],
    }));
    assert.equal(quads.filter(q => q.predicate.value === RDF_TYPE).length, 3);
  });

  it('honors custom baseUri', () => {
    const quads = collectQuads(bibliographyToQuads({
      registerId: 'iso',
      baseUri: 'https://example.org',
      entries: [{ id: 'ref1', reference: 'ISO' }],
    }));
    assert.ok(quads.some(q => q.subject.value === 'https://example.org/iso/bib/ref1'));
    assert.ok(quads.some(q => q.predicate.value === `${DCTERMS}isPartOf` && q.object.value === 'https://example.org/iso/'));
  });

  it('handles empty entries array', () => {
    assert.deepEqual(collectQuads(bibliographyToQuads({ baseUri: 'https://glossarist.org', registerId: 'iso', entries: [] })), []);
  });
});

describe('normalizeBibliographyData', () => {
  it('accepts the { bibliography: [...] } shape', () => {
    const out = normalizeBibliographyData({
      bibliography: [
        { id: 'a', reference: 'A' },
        { id: 'b', reference: 'B' },
      ],
    });
    assert.equal(out.length, 2);
    assert.equal(out[0].id, 'a');
  });

  it('accepts the { <id>: { ... } } shape and uses the key as id', () => {
    const out = normalizeBibliographyData({
      a: { reference: 'A' },
      b: { reference: 'B' },
    });
    assert.equal(out.length, 2);
    assert.deepEqual(out.map(e => e.id).sort(), ['a', 'b']);
  });

  it('preserves explicit id inside the entry over the key', () => {
    const out = normalizeBibliographyData({
      key_id: { id: 'explicit_id', reference: 'A' },
    });
    assert.equal(out[0].id, 'explicit_id');
  });

  it('returns [] for null/undefined/non-object', () => {
    assert.deepEqual(normalizeBibliographyData(null), []);
    assert.deepEqual(normalizeBibliographyData(undefined), []);
    assert.deepEqual(normalizeBibliographyData('string'), []);
  });
});

// Regression: entry ids taken verbatim from bibliography.yaml (they double
// as source-citation lookup keys, e.g. "[ISO/IEC 17000:2004, 2.7]") used to
// be interpolated raw into subject IRIs, emitting unparseable Turtle like
// <https://host/reg/bib/ISO/IEC 17000:2004>. Seen on oimlsmart viml-*
// bib.ttl in production.
describe('bibliography entry IRIs with IRIREF-forbidden characters', () => {
  const BASE = 'https://oimlsmart.github.io/vocab';
  const REGISTER = 'viml-2013';
  const SPACED_IDS = ['ISO/IEC 17000:2004', 'OIML V 2-200:2012'];
  const EXPECTED_IRIS = [
    `${BASE}/${REGISTER}/bib/ISO/IEC%2017000:2004`,
    `${BASE}/${REGISTER}/bib/OIML%20V%202-200:2012`,
  ];

  it('encodes the entry id segment but keeps the identifier literal verbatim', () => {
    const quads = collectQuads(bibliographyToQuads({
      baseUri: BASE,
      registerId: REGISTER,
      entries: SPACED_IDS.map((id) => ({ id, reference: id })),
    }));
    for (const iri of EXPECTED_IRIS) {
      assert.ok(quads.some((q) => q.subject.value === iri), `expected subject ${iri}`);
    }
    for (const id of SPACED_IDS) {
      assert.ok(quads.some((q) => q.predicate.value === `${DCTERMS}identifier` && q.object.value === id),
        'identifier literal must stay verbatim for citation lookup');
    }
  });

  it('emits Turtle that parses', () => {
    const quads = collectQuads(bibliographyToQuads({
      baseUri: BASE,
      registerId: REGISTER,
      entries: SPACED_IDS.map((id) => ({ id, reference: id })),
    }));
    const turtle = writeTurtleSync(quads);
    const parsed = new Parser().parse(turtle);
    assert.equal(parsed.length, quads.length);
    assert.ok(parsed.some((q) => q.subject.value === `${BASE}/${REGISTER}/bib/ISO/IEC%2017000:2004`));
  });
});
