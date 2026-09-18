import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConceptParser, conceptParser } from '../src/concept-parser.js';
import { Concept } from '../src/models/concept.js';
import { ConceptReference } from '../src/models/concept-reference.js';
import { InvalidInputError, YamlParseError } from '../src/errors.js';

describe('ConceptParser', () => {
  describe('format detection', () => {
    it('detects canonical format (termid present)', () => {
      const p = new ConceptParser();
      const concept = p.parse('termid: "001"\neng:\n  terms:\n    - designation: test');
      assert.ok(concept instanceof Concept);
      assert.equal(concept.id, '001');
      assert.equal(concept.term, null);
    });

    it('detects canonical format with term', () => {
      const concept = conceptParser.parse('termid: "001"\nterm: alpha\neng:\n  terms:\n    - designation: alpha');
      assert.equal(concept.id, '001');
      assert.equal(concept.term, 'alpha');
    });

    it('detects managed format (data.identifier)', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 3.1.1.1',
        '  localized_concepts:',
        '    eng: uuid-a',
        'id: uuid-main',
        '---',
        'data:',
        '  terms:',
        '    - designation: entity',
        '  language_code: eng',
        'id: uuid-a',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.id, '3.1.1.1');
      assert.equal(concept.primaryDesignation('eng'), 'entity');
    });
  });

  describe('canonical format', () => {
    it('extracts localizations from language keys', () => {
      const raw = [
        'termid: "001"',
        'eng:',
        '  terms:',
        '    - designation: test',
        'fra:',
        '  terms:',
        '    - designation: test FR',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.deepEqual(concept.languages, ['eng', 'fra']);
      assert.equal(concept.primaryDesignation('eng'), 'test');
      assert.equal(concept.primaryDesignation('fra'), 'test FR');
    });

    it('stores raw document', () => {
      const concept = conceptParser.parse('termid: "001"\neng:\n  terms:\n    - designation: test');
      assert.ok(concept.raw);
      assert.equal(concept.raw.termid, '001');
    });
  });

  describe('managed format', () => {
    it('parses multi-document YAML', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 3.1.1.1',
        '  localized_concepts:',
        '    eng: uuid-a',
        '    fra: uuid-b',
        'id: uuid-main',
        '---',
        'data:',
        '  definition:',
        '    - content: An entity',
        '  terms:',
        '    - designation: entity',
        '  sources:',
        '    - origin:',
        '        ref:',
        '          source: ISO/TS 14812:2022',
        '      type: authoritative',
        '  language_code: eng',
        '  entry_status: valid',
        'id: uuid-a',
        '---',
        'data:',
        '  terms:',
        '    - designation: entité',
        '  language_code: fra',
        'id: uuid-b',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.id, '3.1.1.1');
      assert.equal(concept.languages.length, 2);
      assert.equal(concept.localization('eng').entryStatus, 'valid');
      assert.equal(concept.localization('eng').sources[0].origin.ref.source, 'ISO/TS 14812:2022');
    });

    it('skips docs without language_code', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 3.1.1.1',
        '  localized_concepts: {}',
        'id: uuid-main',
        '---',
        'data:',
        '  terms:',
        '    - designation: entity',
        '  language_code: eng',
        'id: uuid-a',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.deepEqual(concept.languages, ['eng']);
    });

    // Canonical GCR V3 places language_code at the document TOP level
    // (glossarist-ruby output; seen in oimlsmart/vocab datasets). The
    // docs-only nested check silently dropped every localization for
    // this shape, producing Concepts with empty languages — hollow
    // CSV/JSON-LD aggregates downstream.
    it('reads canonical GCR V3 language_code at the document top level', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 0.01',
        '  localized_concepts:',
        '    eng: 364d2f52-70a7-53e8-bbfd-49d3fc17d867',
        '    fra: c080c49b-c394-55d0-b2b2-b33811ad2b1d',
        'id: c792e7e4-fc3e-5ce5-a632-e82b8d570ded',
        'schema_version: 3',
        '---',
        'data:',
        '  definition:',
        '    - content: science of measurement and its application',
        '  terms:',
        '    - designation: metrology',
        '      type: expression',
        '      normative_status: preferred',
        'language_code: eng',
        'entry_status: valid',
        'id: 364d2f52-70a7-53e8-bbfd-49d3fc17d867',
        '---',
        'data:',
        '  definition:',
        '    - content: science des mesurages et ses applications',
        '  terms:',
        '    - designation: métrologie',
        '      type: expression',
        '      normative_status: preferred',
        'language_code: fra',
        'entry_status: valid',
        'id: c080c49b-c394-55d0-b2b2-b33811ad2b1d',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.id, '0.01');
      assert.deepEqual(concept.languages.sort(), ['eng', 'fra']);
      assert.equal(concept.localization('eng').terms[0].designation, 'metrology');
      assert.equal(concept.localization('eng').definition[0].content, 'science of measurement and its application');
      assert.equal(concept.localization('fra').terms[0].designation, 'métrologie');
    });

    it('reads top-level entry_status on canonical GCR V3 localization docs', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 0.02',
        '---',
        'data:',
        '  terms:',
        '    - designation: metrology',
        'language_code: eng',
        'entry_status: valid',
        'id: x1',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.localization('eng').entryStatus, 'valid');
    });

    it('data: placement wins when a field appears at both levels', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 0.03',
        '---',
        'data:',
        '  entry_status: draft',
        '  terms:',
        '    - designation: from-data',
        'language_code: eng',
        'entry_status: valid',
        'id: x1',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.localization('eng').entryStatus, 'draft');
    });

    it('does not leak localization-doc structural keys into the payload', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 0.04',
        '---',
        'data:',
        '  terms:',
        '    - designation: x',
        'language_code: eng',
        'schema_version: 3',
        'id: 364d2f52-70a7-53e8-bbfd-49d3fc17d867',
      ].join('\n');
      const json = conceptParser.parse(raw).localization('eng').toJSON();
      // id/schema_version must not leak in; language_code IS re-emitted
      // by the model itself (its own field, not a passthrough).
      assert.equal('id' in json, false);
      assert.equal('schema_version' in json, false);
    });

    it('parses domains from managed concept data', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 103-01-01',
        '  localized_concepts:',
        '    eng: uuid-a',
        '  domains:',
        '    - concept_id: area-103',
        '      ref_type: domain',
        '    - concept_id: section-103-01',
        '      ref_type: domain',
        'id: uuid-main',
        '---',
        'data:',
        '  terms:',
        '    - designation: functional',
        '  language_code: eng',
        '  domain: section-103-01',
        'id: uuid-a',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.id, '103-01-01');
      assert.equal(concept.domains.length, 2);
      assert.ok(concept.domains[0] instanceof ConceptReference);
      assert.equal(concept.domains[0].conceptId, 'area-103');
      assert.equal(concept.domains[0].refType, 'domain');
      assert.equal(concept.domains[1].conceptId, 'section-103-01');
      assert.equal(concept.localization('eng').domain, 'section-103-01');
    });

    it('normalizes legacy groups to ConceptReference domains', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 103-01-01',
        '  localized_concepts:',
        '    eng: uuid-a',
        '  groups:',
        '    - area-103',
        '    - section-103-01',
        'id: uuid-main',
        '---',
        'data:',
        '  terms:',
        '    - designation: functional',
        '  language_code: eng',
        'id: uuid-a',
      ].join('\n');
      const concept = conceptParser.parse(raw);
      assert.equal(concept.domains.length, 2);
      assert.ok(concept.domains[0] instanceof ConceptReference);
      assert.equal(concept.domains[0].conceptId, 'area-103');
      assert.equal(concept.domains[0].refType, 'domain');
    });
  });

  describe('error handling', () => {
    it('throws InvalidInputError for null', () => {
      assert.throws(() => conceptParser.parse(null), InvalidInputError);
    });

    it('throws InvalidInputError for empty string', () => {
      assert.throws(() => conceptParser.parse(''), InvalidInputError);
    });

    it('throws InvalidInputError for whitespace', () => {
      assert.throws(() => conceptParser.parse('   '), InvalidInputError);
    });

    it('throws InvalidInputError for non-string', () => {
      assert.throws(() => conceptParser.parse(42), InvalidInputError);
    });

    it('throws YamlParseError for invalid YAML', () => {
      assert.throws(() => conceptParser.parse(': [invalid', 'test-concept'), YamlParseError);
    });

    it('throws YamlParseError for empty document', () => {
      assert.throws(() => conceptParser.parse('---\nnull', 'test-concept'), YamlParseError);
    });

    it('includes context in error messages', () => {
      try {
        conceptParser.parse(': [invalid', 'my-concept.yaml');
      } catch (err) {
        assert.ok(err.message.includes('my-concept.yaml') || err.context === 'my-concept.yaml');
      }
    });

    it('throws InvalidInputError for non-object ref in related', () => {
      const raw = [
        '---',
        'data:',
        '  identifier: 3.1.1.1',
        '  localized_concepts: {}',
        'related:',
        '  - type: see',
        '    ref: "not-an-object"',
        'id: uuid-main',
      ].join('\n');
      assert.throws(() => conceptParser.parse(raw), InvalidInputError);
    });
  });
});
