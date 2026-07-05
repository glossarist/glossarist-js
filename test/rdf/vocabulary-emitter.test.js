// Tests for the vocabulary emitter (SKOS ConceptSchemes for enum IRIs).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  vocabularySchemeToQuads,
  vocabularyToQuads,
  resolveIri,
  collectQuads,
} from '../../src/rdf/index.js';

const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const GLOSS = 'https://www.glossarist.org/ontologies/';

const STATUS_SCHEME = {
  schemeIri: 'gloss:status-scheme',
  label: 'Concept status',
  terms: [
    { iri: 'gloss:status/valid',      label: 'valid' },
    { iri: 'gloss:status/superseded', label: 'superseded' },
  ],
};

describe('resolveIri', () => {
  it('resolves gloss: CURIEs to absolute IRIs', () => {
    assert.equal(resolveIri('gloss:status/valid'), `${GLOSS}status/valid`);
    assert.equal(resolveIri('gloss:status-scheme'), `${GLOSS}status-scheme`);
  });

  it('passes through absolute IRIs unchanged', () => {
    assert.equal(resolveIri('https://example.org/x'), 'https://example.org/x');
    assert.equal(resolveIri('http://example.org/x'), 'http://example.org/x');
    assert.equal(resolveIri('urn:iso:1234'), 'urn:iso:1234');
  });

  it('passes through unknown prefixes unchanged', () => {
    assert.equal(resolveIri('unknown:foo'), 'unknown:foo');
  });
});

describe('vocabularySchemeToQuads', () => {
  it('emits the ConceptScheme type and label', () => {
    const quads = collectQuads(vocabularySchemeToQuads(STATUS_SCHEME));
    const schemeSubject = namedNodeValue(`${GLOSS}status-scheme`);
    assert.ok(quads.some(q =>
      q.subject.value === schemeSubject &&
      q.predicate.value === RDF_TYPE &&
      q.object.value === `${SKOS}ConceptScheme`
    ));
    assert.ok(quads.some(q =>
      q.subject.value === schemeSubject &&
      q.predicate.value === RDFS_LABEL &&
      q.object.value === 'Concept status'
    ));
  });

  it('emits Concept type, label, inScheme, and hasTopConcept for each term', () => {
    const quads = collectQuads(vocabularySchemeToQuads(STATUS_SCHEME));
    const termValid = namedNodeValue(`${GLOSS}status/valid`);
    const schemeSubject = namedNodeValue(`${GLOSS}status-scheme`);

    // Term typed as skos:Concept
    assert.ok(quads.some(q =>
      q.subject.value === termValid &&
      q.predicate.value === RDF_TYPE &&
      q.object.value === `${SKOS}Concept`
    ), 'expected rdf:type skos:Concept for term');

    // Term label
    assert.ok(quads.some(q =>
      q.subject.value === termValid &&
      q.predicate.value === RDFS_LABEL &&
      q.object.value === 'valid'
    ));

    // Term inScheme scheme
    assert.ok(quads.some(q =>
      q.subject.value === termValid &&
      q.predicate.value === `${SKOS}inScheme` &&
      q.object.value === schemeSubject
    ));

    // Scheme hasTopConcept term
    assert.ok(quads.some(q =>
      q.subject.value === schemeSubject &&
      q.predicate.value === `${SKOS}hasTopConcept` &&
      q.object.value === termValid
    ));
  });

  it('handles absolute IRIs in the input without re-resolving', () => {
    const scheme = {
      schemeIri: 'https://example.org/my-scheme',
      label: 'Custom',
      terms: [{ iri: 'https://example.org/my-term', label: 'My Term' }],
    };
    const quads = collectQuads(vocabularySchemeToQuads(scheme));
    assert.ok(quads.some(q => q.subject.value === 'https://example.org/my-scheme'));
    assert.ok(quads.some(q => q.subject.value === 'https://example.org/my-term'));
  });

  it('handles empty terms array (only emits the scheme itself)', () => {
    const scheme = { schemeIri: 'gloss:empty-scheme', label: 'Empty', terms: [] };
    const quads = collectQuads(vocabularySchemeToQuads(scheme));
    assert.equal(quads.length, 2); // rdf:type + rdfs:label
  });

  it('handles missing terms array', () => {
    const scheme = { schemeIri: 'gloss:no-terms-scheme', label: 'No Terms' };
    const quads = collectQuads(vocabularySchemeToQuads(scheme));
    assert.equal(quads.length, 2);
  });
});

describe('vocabularyToQuads', () => {
  it('emits quads for multiple schemes', () => {
    const schemes = [
      STATUS_SCHEME,
      {
        schemeIri: 'gloss:norm-scheme',
        label: 'Normative status',
        terms: [{ iri: 'gloss:norm/preferred', label: 'preferred' }],
      },
    ];
    const quads = collectQuads(vocabularyToQuads(schemes));
    // Both schemes should have type triples
    assert.ok(quads.some(q => q.subject.value === `${GLOSS}status-scheme` && q.predicate.value === RDF_TYPE));
    assert.ok(quads.some(q => q.subject.value === `${GLOSS}norm-scheme` && q.predicate.value === RDF_TYPE));
    // Terms from both schemes
    assert.ok(quads.some(q => q.subject.value === `${GLOSS}status/valid` && q.predicate.value === RDF_TYPE));
    assert.ok(quads.some(q => q.subject.value === `${GLOSS}norm/preferred` && q.predicate.value === RDF_TYPE));
  });

  it('handles null/undefined input', () => {
    assert.deepEqual(collectQuads(vocabularyToQuads(null)), []);
    assert.deepEqual(collectQuads(vocabularyToQuads(undefined)), []);
  });

  it('handles empty schemes array', () => {
    assert.deepEqual(collectQuads(vocabularyToQuads([])), []);
  });
});

// n3 namedNode value accessor
function namedNodeValue(value) { return value; }
