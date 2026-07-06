import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveIri,
  compactIri,
  isAbsoluteIri,
  RDF_TYPE,
  RDF_VALUE,
  RDFS_LABEL,
} from '../../src/rdf/curie.js';

describe('curie', () => {
  describe('isAbsoluteIri', () => {
    it('returns true for http(s) IRIs', () => {
      assert.equal(isAbsoluteIri('http://example.org/x'), true);
      assert.equal(isAbsoluteIri('https://example.org/x'), true);
    });

    it('returns true for urn: IRIs', () => {
      assert.equal(isAbsoluteIri('urn:iso:std:iso:1'), true);
      assert.equal(isAbsoluteIri('urn:gloss:rel:iso:1'), true);
    });

    it('returns true for file:, mailto:, ftp:', () => {
      assert.equal(isAbsoluteIri('file:///etc/passwd'), true);
      assert.equal(isAbsoluteIri('mailto:user@example.org'), true);
      assert.equal(isAbsoluteIri('ftp://example.org/x'), true);
    });

    it('returns false for CURIEs', () => {
      assert.equal(isAbsoluteIri('gloss:Concept'), false);
      assert.equal(isAbsoluteIri('skos:prefLabel'), false);
      assert.equal(isAbsoluteIri('dcat:Dataset'), false);
    });

    it('returns false for plain strings', () => {
      assert.equal(isAbsoluteIri('not-a-curie'), false);
      assert.equal(isAbsoluteIri(''), false);
      assert.equal(isAbsoluteIri(undefined), false);
      assert.equal(isAbsoluteIri(null), false);
      assert.equal(isAbsoluteIri(42), false);
    });
  });

  describe('resolveIri', () => {
    it('resolves known CURIEs against canonical PREFIXES', () => {
      assert.equal(
        resolveIri('gloss:Concept'),
        'https://www.glossarist.org/ontologies/Concept',
      );
      assert.equal(
        resolveIri('skos:ConceptScheme'),
        'http://www.w3.org/2004/02/skos/core#ConceptScheme',
      );
      assert.equal(
        resolveIri('dcterms:title'),
        'http://purl.org/dc/terms/title',
      );
    });

    it('resolves CURIEs with slash-separated local names', () => {
      assert.equal(
        resolveIri('gloss:status/valid'),
        'https://www.glossarist.org/ontologies/status/valid',
      );
      assert.equal(
        resolveIri('gloss:rel/supersedes'),
        'https://www.glossarist.org/ontologies/rel/supersedes',
      );
    });

    it('passes through absolute IRIs unchanged', () => {
      assert.equal(
        resolveIri('https://example.org/x'),
        'https://example.org/x',
      );
      assert.equal(
        resolveIri('urn:iso:std:iso:1'),
        'urn:iso:std:iso:1',
      );
    });

    it('passes through unknown CURIE prefixes unchanged', () => {
      assert.equal(resolveIri('unknown:x'), 'unknown:x');
    });

    it('passes through plain strings without a colon', () => {
      assert.equal(resolveIri('plain'), 'plain');
    });

    it('accepts a custom prefix map', () => {
      assert.equal(
        resolveIri('ex:X', { ex: 'https://example.org/' }),
        'https://example.org/X',
      );
    });
  });

  describe('compactIri', () => {
    it('compacts known IRIs to CURIEs', () => {
      assert.equal(
        compactIri('https://www.glossarist.org/ontologies/Concept'),
        'gloss:Concept',
      );
      assert.equal(
        compactIri('http://www.w3.org/2004/02/skos/core#prefLabel'),
        'skos:prefLabel',
      );
    });

    it('picks the longest matching prefix when overlaps exist', () => {
      // skos and skosxl share no overlap, but if two prefixes matched
      // the same IRI, the longer (more specific) one wins.
      const custom = {
        a: 'https://example.org/',
        ab: 'https://example.org/sub/',
      };
      assert.equal(
        compactIri('https://example.org/sub/x', custom),
        'ab:x',
      );
    });

    it('returns the original IRI when no prefix matches', () => {
      assert.equal(
        compactIri('https://unknown.example.org/x'),
        'https://unknown.example.org/x',
      );
    });
  });

  describe('constants', () => {
    it('RDF_TYPE is the canonical rdf:type IRI', () => {
      assert.equal(RDF_TYPE, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    });

    it('RDF_VALUE is the canonical rdf:value IRI', () => {
      assert.equal(RDF_VALUE, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#value');
    });

    it('RDFS_LABEL is the canonical rdfs:label IRI', () => {
      assert.equal(RDFS_LABEL, 'http://www.w3.org/2000/01/rdf-schema#label');
    });
  });
});
